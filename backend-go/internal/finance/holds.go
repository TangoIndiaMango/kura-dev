package finance

import (
	"context"
	"fmt"
	"net/http"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
)

// Hold is WalletHoldService.hold: reserve available balance.
func Hold(ctx context.Context, q *db.Queries, acct Account, amount int64, reference string) (db.FinanceWallet, error) {
	if amount <= 0 {
		return db.FinanceWallet{}, apperr.New("VALIDATION_ERROR", "Hold amount_kobo must be positive.")
	}
	w, err := LockedWallet(ctx, q, acct.ID)
	if err != nil {
		return w, err
	}
	if available := w.BalanceKobo - w.HoldKobo; available < amount {
		return w, insufficient("Insufficient available balance for hold.", available, amount)
	}
	w.HoldKobo += amount
	if err := saveWallet(ctx, q, w); err != nil {
		return w, err
	}
	_, err = Post(ctx, q, "HOLD", trunc100("HOLD-"+reference), fmt.Sprintf("Wallet hold %d kobo", amount), []Entry{
		{Code: "wallet:" + acct.KuraID, Type: Liability, Debit: amount},
		{Code: "hold:" + acct.KuraID, Type: Liability, Credit: amount}})
	return w, err
}

// Release is WalletHoldService.release: give back up to the held amount.
func Release(ctx context.Context, q *db.Queries, acct Account, amount int64, reference string) (db.FinanceWallet, error) {
	w, err := LockedWallet(ctx, q, acct.ID)
	if err != nil || amount <= 0 {
		return w, err
	}
	rel := min(amount, w.HoldKobo)
	if rel <= 0 {
		return w, nil
	}
	w.HoldKobo -= rel
	if err := saveWallet(ctx, q, w); err != nil {
		return w, err
	}
	_, err = Post(ctx, q, "RELEASE", trunc100("REL-"+reference), fmt.Sprintf("Wallet hold release %d kobo", rel), []Entry{
		{Code: "hold:" + acct.KuraID, Type: Liability, Debit: rel},
		{Code: "wallet:" + acct.KuraID, Type: Liability, Credit: rel}})
	return w, err
}

// Capture is WalletHoldService.capture: consume hold + balance, record a
// WALLET_DEBIT payment and recognise swap revenue net of VAT.
func Capture(ctx context.Context, q *db.Queries, acct Account, amount int64, reference, purpose string,
	hub *uuid.UUID) (db.FinancePayment, error) {
	if amount <= 0 {
		return db.FinancePayment{}, apperr.New("VALIDATION_ERROR", "Capture amount_kobo must be positive.")
	}
	if purpose == "" {
		purpose = "SWAP"
	}
	net, vat := SplitVAT(amount)
	w, err := LockedWallet(ctx, q, acct.ID)
	if err != nil {
		return db.FinancePayment{}, err
	}
	if w.HoldKobo < amount {
		return db.FinancePayment{}, apperr.New("WALLET_HOLD_MISSING", "No matching wallet hold to capture.").
			WithStatus(http.StatusConflict).WithDetails(apperr.Details{"hold_kobo": w.HoldKobo, "needed_kobo": amount})
	}
	if w.BalanceKobo < amount {
		return db.FinancePayment{}, apperr.Conflict("WALLET_INSUFFICIENT", "Insufficient wallet balance to capture hold.")
	}
	w.HoldKobo, w.BalanceKobo = w.HoldKobo-amount, w.BalanceKobo-amount
	if err := saveWallet(ctx, q, w); err != nil {
		return db.FinancePayment{}, err
	}
	p, err := CreatePayment(ctx, q, PaymentIn{Account: acct.ID, Channel: "WALLET_DEBIT", Amount: amount, VAT: vat,
		Purpose: purpose, Status: "SUCCESS", Hub: hub})
	if err != nil {
		return p, err
	}
	_, err = Post(ctx, q, "CAPTURE", trunc100("CAP-"+reference), "Capture hold for "+purpose, []Entry{
		{Code: "hold:" + acct.KuraID, Type: Liability, Debit: amount},
		{Code: "revenue:swap", Type: Revenue, Credit: net},
		{Code: "vat_payable", Type: Liability, Credit: vat}})
	return p, err
}

// ReverseCapture is WalletHoldService.reverse_capture: credit the wallet
// back and mark the payment REVERSED.
func ReverseCapture(ctx context.Context, q *db.Queries, acct Account, amount int64, reference string,
	payment *db.FinancePayment) error {
	if amount <= 0 {
		return nil
	}
	net, vat := SplitVAT(amount)
	w, err := LockedWallet(ctx, q, acct.ID)
	if err != nil {
		return err
	}
	w.BalanceKobo += amount
	if err := saveWallet(ctx, q, w); err != nil {
		return err
	}
	if _, err := Post(ctx, q, "REVERSAL", trunc100("REV-"+reference), fmt.Sprintf("Reverse swap capture %d kobo", amount),
		[]Entry{{Code: "revenue:swap", Type: Revenue, Debit: net}, {Code: "vat_payable", Type: Liability, Debit: vat},
			{Code: "wallet:" + acct.KuraID, Type: Liability, Credit: amount}}); err != nil {
		return err
	}
	if payment != nil && payment.Status == "SUCCESS" {
		return q.SetPaymentStatus(ctx, db.SetPaymentStatusParams{ID: payment.ID, Status: "REVERSED"})
	}
	return nil
}

// DebitPlanFee is PlanFeeService.debit: pay a plan from available balance
// (PLAN_FEE ledger, Payment purpose PLAN). Idempotent on the key.
func DebitPlanFee(ctx context.Context, q *db.Queries, acct Account, amount int64, idemKey string) (db.FinancePayment, error) {
	if amount < 0 {
		return db.FinancePayment{}, apperr.New("VALIDATION_ERROR", "amount_kobo cannot be negative.")
	}
	if amount == 0 {
		return CreatePayment(ctx, q, PaymentIn{Account: acct.ID, Channel: "WALLET_DEBIT", Purpose: "PLAN",
			Status: "SUCCESS", IdemKey: idemKey})
	}
	if key := optional(idemKey); key != nil {
		if p, err := q.PaymentByIdempotency(ctx, key); err == nil {
			return p, nil
		} else if !database.IsNoRows(err) {
			return p, err
		}
	}
	net, vat := SplitVAT(amount)
	w, err := LockedWallet(ctx, q, acct.ID)
	if err != nil {
		return db.FinancePayment{}, err
	}
	if available := w.BalanceKobo - w.HoldKobo; available < amount {
		return db.FinancePayment{}, insufficient("Insufficient available balance for plan purchase.", available, amount)
	}
	w.BalanceKobo -= amount
	if err := saveWallet(ctx, q, w); err != nil {
		return db.FinancePayment{}, err
	}
	p, err := CreatePayment(ctx, q, PaymentIn{Account: acct.ID, Channel: "WALLET_DEBIT", Amount: amount, VAT: vat,
		Purpose: "PLAN", Status: "SUCCESS", IdemKey: idemKey})
	if err != nil {
		return p, err
	}
	_, err = Post(ctx, q, "PLAN_FEE", "plan-fee:"+p.ID.String(), fmt.Sprintf("Plan fee %d kobo", amount), []Entry{
		{Code: "wallet:" + acct.KuraID, Type: Liability, Debit: amount},
		{Code: "revenue:plan", Type: Revenue, Credit: net},
		{Code: "vat_payable", Type: Liability, Credit: vat}})
	return p, err
}
