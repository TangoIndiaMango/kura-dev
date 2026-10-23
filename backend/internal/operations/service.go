// Package operations ports the operations app: agent shifts and cash
// (deposits, drawer close, lodging), overrides, alerts and their rules,
// inventory counts and the ops command centre.
package operations

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/auth"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/finance"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/mail"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
)

var lagos, _ = time.LoadLocation("Africa/Lagos")

// VarianceFlagKobo is VARIANCE_FLAG_KOBO (₦100).
const VarianceFlagKobo = 10_000

// Service holds what the cash / shift flows need.
type Service struct {
	pool       *pgxpool.Pool
	mailer     *mail.Mailer
	tokens     *auth.Tokens
	receiptKey []byte
	clientURL  string
	floatLimit int64
	log        *slog.Logger
}

func NewService(pool *pgxpool.Pool, mailer *mail.Mailer, tokens *auth.Tokens, receiptKey, clientURL string,
	floatLimit int64) *Service {
	if floatLimit <= 0 {
		floatLimit = 50_000_000
	}
	return &Service{pool: pool, mailer: mailer, tokens: tokens, receiptKey: []byte(receiptKey),
		clientURL: strings.TrimRight(clientURL, "/"), floatLimit: floatLimit, log: slog.Default()}
}

// Agent is the staff user doing a cash / shift action.
type Agent struct {
	ID           uuid.UUID
	Email, Phone *string
}

func (a Agent) label() string {
	if a.Email != nil && *a.Email != "" {
		return *a.Email
	}
	if a.Phone != nil {
		return *a.Phone
	}
	return ""
}

// OpenShift is ShiftService.open_shift: the agent's open window at the hub,
// or a new one.
func OpenShift(ctx context.Context, q *db.Queries, agent Agent, hub db.MobilityHub, opening int64,
	who *events.Actor) (db.OperationsShift, error) {
	if s, err := q.OpenShiftForUpdate(ctx, db.OpenShiftForUpdateParams{AgentID: agent.ID, HubID: hub.ID}); err == nil {
		return s, nil
	} else if !database.IsNoRows(err) {
		return s, err
	}
	if opening < 0 {
		return db.OperationsShift{}, apperr.New("VALIDATION_ERROR", "Opening cash cannot be negative.").
			WithDetails(apperr.Details{"opening_cash_kobo": []string{"non_negative"}})
	}
	id := ids.New()
	if err := q.InsertShift(ctx, db.InsertShiftParams{ID: id, OpeningCashKobo: opening, AgentID: agent.ID,
		HubID: hub.ID}); err != nil {
		return db.OperationsShift{}, err
	}
	err := events.Emit(ctx, q, events.Event{Action: "shift.opened", SubjectType: "shift", SubjectID: id.String(),
		SubjectLabel: hub.Code + " · " + agent.label(), Actor: who,
		After: events.Map{"hub_id": hub.ID.String(), "opening_cash_kobo": opening, "status": "OPEN"}})
	if err != nil {
		return db.OperationsShift{}, err
	}
	return q.ShiftByID(ctx, id)
}

// DepositIn is CashDepositService.record's arguments.
type DepositIn struct {
	Agent                    Agent
	Hub                      db.MobilityHub
	Account                  db.AccountsAccount
	Amount                   int64
	Shift                    *uuid.UUID
	PSPRef, Purpose, IdemKey string
	Actor                    *events.Actor
}

// Record is CashDepositService.record: bind to the agent's open shift
// (opening one if needed), enforce the float limit, write the AGENT_CASH
// payment + deposit + ledger and notify the owner. Run inside a transaction;
// call ReceiptEmail with the id after commit.
func (s *Service) Record(ctx context.Context, q *db.Queries, in DepositIn) (db.OperationsCashdeposit, error) {
	if in.Amount <= 0 {
		return db.OperationsCashdeposit{}, apperr.New("VALIDATION_ERROR", "Cash amount must be positive.").
			WithDetails(apperr.Details{"amount_kobo": []string{"positive"}})
	}
	purpose := strings.ToUpper(in.Purpose)
	if purpose == "" {
		purpose = "SWAP"
	}
	if purpose != "SWAP" && purpose != "FUND" {
		return db.OperationsCashdeposit{}, apperr.New("VALIDATION_ERROR", "purpose must be SWAP or FUND.").
			WithDetails(apperr.Details{"purpose": []string{"invalid"}})
	}
	key := strings.TrimSpace(in.IdemKey)
	if key != "" {
		if d, err := q.DepositByIdempotency(ctx, &key); err == nil {
			return d, nil
		} else if !database.IsNoRows(err) {
			return d, err
		}
	}
	shiftID := in.Shift
	if shiftID == nil {
		if sh, err := q.LatestOpenShift(ctx, db.LatestOpenShiftParams{AgentID: in.Agent.ID, HubID: in.Hub.ID}); err == nil {
			shiftID = &sh.ID
		} else if !database.IsNoRows(err) {
			return db.OperationsCashdeposit{}, err
		}
	}
	if shiftID == nil {
		sh, err := OpenShift(ctx, q, in.Agent, in.Hub, 0, in.Actor)
		if err != nil {
			return db.OperationsCashdeposit{}, err
		}
		shiftID = &sh.ID
	}
	shift, err := q.OpenShiftByIDForUpdate(ctx, *shiftID)
	if database.IsNoRows(err) {
		return db.OperationsCashdeposit{}, apperr.Conflict("SHIFT_REQUIRED", "Shift is no longer open.")
	}
	if err != nil {
		return db.OperationsCashdeposit{}, err
	}
	if shift.HubID != in.Hub.ID || shift.AgentID != in.Agent.ID {
		return db.OperationsCashdeposit{}, apperr.New("VALIDATION_ERROR", "Shift does not match agent and hub.")
	}
	if err := s.assertFloat(ctx, q, in.Agent.ID, in.Amount); err != nil {
		return db.OperationsCashdeposit{}, err
	}
	var vat int64
	if purpose == "SWAP" {
		_, vat = finance.SplitVAT(in.Amount)
	}
	pay, err := finance.CreatePayment(ctx, q, finance.PaymentIn{Account: in.Account.ID, Channel: "AGENT_CASH",
		Amount: in.Amount, VAT: vat, Purpose: purpose, Status: "SUCCESS", Hub: &in.Hub.ID})
	if err != nil {
		return db.OperationsCashdeposit{}, err
	}
	id := ids.New()
	var k *string
	if key != "" {
		k = &key
	}
	if err := q.InsertDeposit(ctx, db.InsertDepositParams{ID: id, AmountKobo: in.Amount,
		PspAgentRef: strings.TrimSpace(in.PSPRef), ReceiptCode: pay.ReceiptCode, AccountID: in.Account.ID,
		AgentID: in.Agent.ID, HubID: in.Hub.ID, PaymentID: &pay.ID, ShiftID: shift.ID, IdempotencyKey: k,
		Purpose: purpose}); err != nil {
		return db.OperationsCashdeposit{}, err
	}
	if err := floatLedger(ctx, q, in.Agent.ID, finance.Account{ID: in.Account.ID, KuraID: in.Account.KuraID},
		in.Amount, purpose, pay.ReceiptCode); err != nil {
		return db.OperationsCashdeposit{}, err
	}
	outstanding, err := q.AgentFloatOutstanding(ctx, in.Agent.ID)
	if err != nil {
		return db.OperationsCashdeposit{}, err
	}
	ev := events.Event{Action: "cash_deposit.recorded", SubjectType: "cash_deposit", SubjectID: id.String(),
		SubjectLabel: pay.ReceiptCode, Actor: in.Actor,
		After: events.Map{"amount_kobo": in.Amount, "shift_id": shift.ID.String(), "payment_id": pay.ID.String(),
			"status": "SUCCESS", "purpose": purpose, "float_outstanding_kobo": outstanding}}
	if in.Account.OwnerUserID != uuid.Nil {
		ev.Notify = []events.NotifySpec{{UserID: in.Account.OwnerUserID, Title: "Cash receipt",
			Body:   fmt.Sprintf("%s · %s at %s", pay.ReceiptCode, finance.FormatNaira(in.Amount), in.Hub.Code),
			Source: "Cash", Severity: events.Info, Channels: []string{events.InApp}, TemplateCode: "cash.deposit_receipt",
			LinkPath: "/wallet/receipt/" + pay.ReceiptCode,
			Params: events.Map{"receipt_code": pay.ReceiptCode, "amount_kobo": in.Amount, "hub_code": in.Hub.Code,
				"deposit_id": id.String()},
			DedupeKey: "cash.receipt:" + id.String()}}
	}
	if err := events.Emit(ctx, q, ev); err != nil {
		return db.OperationsCashdeposit{}, err
	}
	return q.CashDepositByID(ctx, id)
}

// assertFloat is assert_within_float_limit (the CASH_LIMIT alert it writes
// rolls back with the refused deposit, as in Django).
func (s *Service) assertFloat(ctx context.Context, q *db.Queries, agent uuid.UUID, amount int64) error {
	outstanding, err := q.AgentFloatOutstanding(ctx, agent)
	if err != nil || outstanding+amount <= s.floatLimit {
		return err
	}
	prefix := "Agent " + agent.String() + " cash float"
	exists, err := q.OpenCashLimitAlertExists(ctx, prefix)
	if err != nil {
		return err
	}
	if !exists {
		msg := fmt.Sprintf("%s would exceed ₦%s (outstanding %d, +%d).", prefix, commas(s.floatLimit/100),
			outstanding, amount)
		if err := q.InsertAlert(ctx, db.InsertAlertParams{ID: ids.New(), Kind: "CASH_LIMIT", Severity: "WARNING",
			Message: msg, DeliveryChannel: "IN_APP"}); err != nil {
			return err
		}
	}
	return apperr.Conflict("CASH_FLOAT_LIMIT", "Agent cash float limit reached. Close/lodge shift cash before more deposits.").
		WithDetails(apperr.Details{"outstanding_kobo": outstanding, "limit_kobo": s.floatLimit, "amount_kobo": amount})
}

// floatLedger is _post_float_ledger: FUND credits the wallet; SWAP books net
// revenue + VAT against the agent's cash float.
func floatLedger(ctx context.Context, q *db.Queries, agent uuid.UUID, acct finance.Account, amount int64,
	purpose, receipt string) error {
	float := "cash_float:" + agent.String()
	ref := truncate("CASH-"+receipt, 100)
	if purpose == "FUND" {
		if err := finance.CreditWallet(ctx, q, acct.ID, amount); err != nil {
			return err
		}
		_, err := finance.Post(ctx, q, "FUNDING", ref, "Agent cash funding "+receipt, []finance.Entry{
			{Code: float, Type: finance.Asset, Debit: amount},
			{Code: "wallet:" + acct.KuraID, Type: finance.Liability, Credit: amount}})
		return err
	}
	net, vat := finance.SplitVAT(amount)
	entries := []finance.Entry{{Code: float, Type: finance.Asset, Debit: amount},
		{Code: "revenue:swap", Type: finance.Revenue, Credit: net}}
	if vat != 0 {
		entries = append(entries, finance.Entry{Code: "vat_payable", Type: finance.Liability, Credit: vat})
	}
	_, err := finance.Post(ctx, q, "AGENT_CASH", ref, "Agent cash swap settle "+receipt, entries)
	return err
}

func truncate(s string, n int) string {
	if r := []rune(s); len(r) > n {
		return string(r[:n])
	}
	return s
}

// commas is Python's f"{n:,}".
func commas(n int64) string {
	s := fmt.Sprint(n)
	var b strings.Builder
	for i, c := range s {
		if i > 0 && c != '-' && (len(s)-i)%3 == 0 {
			b.WriteByte(',')
		}
		b.WriteRune(c)
	}
	return b.String()
}
