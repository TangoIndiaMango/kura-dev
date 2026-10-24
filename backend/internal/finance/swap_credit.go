package finance

import (
	"context"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
)

// creditForSwap puts a Paystack payment for an open swap into the rider's
// balance (ledger only — no payment row). Completing the swap with PAYSTACK
// records the one payment the rider sees ("Battery swap · Card"); if the swap
// ends any other way, SurfaceSwapCredit records it as money added instead.
func creditForSwap(ctx context.Context, q *db.Queries, acct Account, amount int64, channel, reference string) error {
	w, err := q.WalletForUpdate(ctx, acct.ID)
	if database.IsNoRows(err) {
		if err = q.EnsureWallet(ctx, db.EnsureWalletParams{ID: ids.New(), AccountID: acct.ID}); err == nil {
			w, err = q.WalletForUpdate(ctx, acct.ID)
		}
	}
	if err != nil {
		return err
	}
	w.BalanceKobo += amount
	if err := saveWallet(ctx, q, w); err != nil {
		return err
	}
	_, err = Post(ctx, q, "FUNDING", trunc100("PSP-"+reference), "Paystack payment for a swap via "+channel, []Entry{
		{Code: "psp_clearing", Type: Clearing, Debit: amount},
		{Code: "wallet:" + acct.KuraID, Type: Liability, Credit: amount}})
	return err
}

// CaptureSwapPayment takes a PAYSTACK swap's fee from the balance its
// checkout credited and records it as that card / transfer payment.
func CaptureSwapPayment(ctx context.Context, q *db.Queries, acct Account, c db.FinanceWalletcheckout, fee int64,
	hub *uuid.UUID) (db.FinancePayment, error) {
	ref := "PAYSTACK-" + c.Reference
	if _, err := Hold(ctx, q, acct, fee, ref); err != nil {
		return db.FinancePayment{}, err
	}
	p, err := capture(ctx, q, acct, fee, ref, "SWAP", hub, firstNonEmpty(c.Channel, "CARD"), c.Reference)
	if err != nil {
		return p, err
	}
	if c.PaymentID == nil {
		err = q.SetCheckoutPayment(ctx, db.SetCheckoutPaymentParams{ID: c.ID, PaymentID: &p.ID})
	}
	return p, err
}

// SurfaceSwapCredit records Paystack payments for a swap that did not use
// them (aborted, or settled by cash / plan / credit): the money is already in
// the rider's balance — this adds the "Payment received" row and tells them.
func SurfaceSwapCredit(ctx context.Context, q *db.Queries, swap uuid.UUID) error {
	cs, err := q.UnrecordedSwapCheckouts(ctx, &swap)
	if err != nil {
		return err
	}
	for _, c := range cs {
		acct, err := q.AccountByID(ctx, c.AccountID)
		if err != nil {
			return err
		}
		p, err := CreatePayment(ctx, q, PaymentIn{Account: acct.ID, Amount: c.AmountKobo,
			Channel: firstNonEmpty(c.Channel, "CARD"), Purpose: "FUND", Status: "SUCCESS", PSPReference: c.Reference})
		if err != nil {
			return err
		}
		if err := q.SetCheckoutPayment(ctx, db.SetCheckoutPaymentParams{ID: c.ID, PaymentID: &p.ID}); err != nil {
			return err
		}
		if err := events.Emit(ctx, q, events.Event{Action: "wallet.funded", SubjectType: "wallet",
			SubjectID: acct.ID.String(), SubjectLabel: acct.KuraID,
			After:    events.Map{"amount_kobo": c.AmountKobo, "psp_reference": c.Reference, "payment_id": p.ID.String()},
			Metadata: events.Map{"receipt_code": p.ReceiptCode, "swap_id": swap.String()},
			Notify: []events.NotifySpec{{UserID: acct.OwnerUserID, Title: "Payment added to your balance",
				Body:   FormatNaira(c.AmountKobo) + " you paid with Paystack is in your Kura balance — it pays for your next swap.",
				Source: "Wallet", Severity: events.Info, LinkPath: "/wallet", TemplateCode: "wallet.funded",
				DedupeKey: "wallet.funded:" + c.Reference}}}); err != nil {
			return err
		}
	}
	return nil
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}
