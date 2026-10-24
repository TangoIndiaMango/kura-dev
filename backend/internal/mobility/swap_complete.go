package mobility

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/credit"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/finance"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/operations"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
)

// payIn is what complete (session or legacy) receives.
type payIn struct {
	Mode     *string
	Amount   *int64
	Code     string
	PinGrant string
	Override *overrideReq
}

// fee is the shared fee rule: the hold, plan = 0, a booking-time code's
// price, cash amount, else the tariff (or an explicit amount).
func swapFee(r *db.MobilityReservation, mode string, amount *int64, tariff int64) (fee, held int64) {
	if r != nil {
		held = r.HoldAmountKobo
	}
	switch {
	case held > 0:
		return held, held
	case mode == "PLAN":
		return 0, held
	case r != nil && r.DiscountCode != "":
		return max(0, r.ListPriceKobo-r.DiscountKobo), held
	case mode == "CASH" && amount != nil:
		return *amount, held
	case amount == nil:
		return tariff, held
	}
	return *amount, held
}

// swapDiscount is DiscountService.consume_for_swap (bay-applied code).
func swapDiscount(ctx context.Context, q *db.Queries, code string, r *db.MobilityReservation, held int64, mode string,
	fee, list int64, account uuid.UUID, key string) (int64, bool, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	if code == "" || mode == "PLAN" || fee <= 0 || (r != nil && r.DiscountCode != "") {
		return fee, false, nil
	}
	if mode == "PAYSTACK" {
		return fee, false, apperr.Conflict("DISCOUNT_NOT_APPLICABLE",
			"This swap is paid with Paystack — discount codes must be applied when booking.")
	}
	if held > 0 && mode == "WALLET" {
		return fee, false, apperr.Conflict("DISCOUNT_NOT_APPLICABLE",
			"This wallet hold is already fixed — discount codes must be applied when booking.")
	}
	vehicles, err := q.AccountVehicleTotal(ctx, account)
	if err != nil {
		return fee, false, err
	}
	qt, err := consumeDiscount(ctx, q, consumeIn{Code: code, Period: "swap", Channel: "Hub", Key: key, List: list,
		Account: account, Vehicles: vehicles})
	return qt.Due, err == nil, err
}

// riderPin is the walk-in wallet debit's PIN confirmation.
func (b *Bay) riderPin(acct db.AccountsAccount, grant string) error {
	return b.tokens.AssertPinGrant(grant, acct.OwnerUserID)
}

func (b *Bay) agent(ctx context.Context, q *db.Queries, who *events.Actor) (*operations.Agent, error) {
	if who == nil {
		return nil, nil
	}
	u, err := q.GetUserByID(ctx, who.ID)
	if err != nil {
		return nil, err
	}
	return &operations.Agent{ID: u.ID, Email: u.Email, Phone: u.Phone}, nil
}

// completeSession is complete_started_swap: ISSUED → COMPLETED.
func (b *Bay) completeSession(ctx context.Context, q *db.Queries, id uuid.UUID, in payIn, who *events.Actor) (settled, error) {
	s, err := q.SwapForUpdate(ctx, id)
	if err != nil {
		return settled{}, err
	}
	if s.Status != "ISSUED" {
		return settled{}, apperr.Conflict("INVALID_TRANSITION", fmt.Sprintf("Cannot complete from status %s (need ISSUED).", s.Status))
	}
	if s.IssuedBatteryID == nil {
		return settled{}, apperr.Conflict("INVALID_TRANSITION", "Issued battery missing on swap.")
	}
	var r *db.MobilityReservation
	if s.ReservationID != nil {
		row, err := q.ReservationForUpdate(ctx, *s.ReservationID)
		if err != nil {
			return settled{}, err
		}
		r = &row
	}
	mode := firstNonEmptyStr(deref(in.Mode), resMode(r), s.PaymentMode, "WALLET")
	mode = strings.ToUpper(mode)
	v, err := q.VehicleByIDPlain(ctx, s.VehicleID)
	if err != nil {
		return settled{}, err
	}
	model, err := q.VehicleModelByID(ctx, v.VehicleModelID)
	if err != nil {
		return settled{}, err
	}
	tariff, err := ppsKobo(ctx, q, model.VehicleType)
	if err != nil {
		return settled{}, err
	}
	amount := in.Amount
	if mode == "PAYSTACK" {
		amount = nil // the fee the rider paid Paystack for, never a desk-typed amount
	}
	fee, held := swapFee(r, mode, amount, tariff)
	key := "swap:" + s.ID.String()
	fee, discounted, err := swapDiscount(ctx, q, in.Code, r, held, mode, fee, tariff, s.AccountID, key)
	if err != nil {
		return settled{}, err
	}
	var vat int64
	if fee > 0 {
		_, vat = finance.SplitVAT(fee)
	}
	acct, err := q.AccountByID(ctx, s.AccountID)
	if err != nil {
		return settled{}, err
	}
	if mode == "WALLET" && fee > 0 && held <= 0 {
		if err := b.riderPin(acct, in.PinGrant); err != nil {
			return settled{}, err
		}
	}
	hub, err := q.HubRow(ctx, s.HubID)
	if err != nil {
		return settled{}, err
	}
	agent, err := b.agent(ctx, q, who)
	if err != nil {
		return settled{}, err
	}
	res, err := b.settle(ctx, q, settleIn{Mode: mode, Fee: fee, Reservation: r, Account: acct, Vehicle: v.ID, Hub: hub,
		Agent: agent, SwapKey: s.ID.String(), Actor: who})
	if err != nil {
		return res, err
	}
	if discounted && res.Payment != nil {
		if err := q.LinkRedemptionPayment(ctx, db.LinkRedemptionPaymentParams{IdempotencyKey: &key, PaymentID: res.Payment}); err != nil {
			return res, err
		}
	}
	if r != nil {
		r.Status, r.HoldAmountKobo = "USED", 0
		if err := saveReservation(ctx, q, *r); err != nil {
			return res, err
		}
		if err := releaseBattery(ctx, q, *r, s.IssuedBatteryID); err != nil {
			return res, err
		}
	}
	if err := flagGeoImpossible(ctx, q, v.ID, hub, &s.AccountID, &s.ID, model.VehicleType); err != nil {
		return res, err
	}
	now := time.Now()
	s.PaymentMode, s.AmountKobo, s.VatKobo = mode, max(fee, 0), vat
	s.PaymentID, s.SubscriptionID, s.Status, s.CompletedAt = res.Payment, res.Subscription, "COMPLETED", &now
	if who != nil {
		s.AgentID = &who.ID
	}
	if err := saveSwap(ctx, q, s); err != nil {
		return res, err
	}
	issued, err := q.BatteryForUpdate(ctx, *s.IssuedBatteryID)
	if err != nil {
		return res, err
	}
	var returned *string
	if s.ReturnedBatteryID != nil {
		rb, err := q.BatteryForUpdate(ctx, *s.ReturnedBatteryID)
		if err != nil {
			return res, err
		}
		returned = &rb.Serial
	}
	if err := b.finalize(ctx, q, finalizeIn{Swap: s, Plate: v.RegistrationPlate, Hub: hub, Returned: returned,
		Issued: issued.Serial, Mismatch: s.MismatchFlag, First: s.ReturnedBatteryID == nil, Fee: fee, Mode: mode,
		Rider: acct.OwnerUserID, Override: in.Override, Agent: agent, Actor: who}); err != nil {
		return res, err
	}
	return res, nil
}

func resMode(r *db.MobilityReservation) string {
	if r == nil {
		return ""
	}
	return r.PaymentMode
}

func firstNonEmptyStr(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

// bustoutAfter is check_credit_bustout, run in its own transaction after
// the completion commits so a failure can't undo the swap (Django swallows
// it with try/except).
func (b *Bay) bustoutAfter(ctx context.Context, swapID uuid.UUID) {
	_ = database.InTx(ctx, b.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		s, err := q.SwapForUpdate(ctx, swapID)
		if err != nil {
			return err
		}
		acct, err := q.AccountByID(ctx, s.AccountID)
		if err != nil {
			return err
		}
		_, err = credit.CheckBustout(ctx, q, acct, &s.ID)
		return err
	})
}
