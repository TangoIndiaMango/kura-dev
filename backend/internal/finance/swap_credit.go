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

// RefundUnusedPayments queues for review the Paystack payments for a swap
// and/or its booking that were never used (swap cancelled, booking lapsed or
// cancelled, settled by cash / plan / credit). Riders hold no balance: the
// money comes back out of the internal credit and waits for finance to
// approve the refund (nothing is sent automatically).
func RefundUnusedPayments(ctx context.Context, q *db.Queries, swap, reservation *uuid.UUID, reason string) error {
	if swap == nil && reservation == nil {
		return nil
	}
	cs, err := q.UnrecordedCheckouts(ctx, db.UnrecordedCheckoutsParams{Swap: swap, Reservation: reservation})
	if err != nil {
		return err
	}
	for _, c := range cs {
		if err := queueRefund(ctx, q, c, true, reason); err != nil {
			return err
		}
	}
	return nil
}

// RefundSwapPayment queues the card refund of a reversed PAYSTACK swap (its
// capture has just been reversed back into the internal credit).
func RefundSwapPayment(ctx context.Context, q *db.Queries, payment uuid.UUID, reason string) error {
	c, err := q.CheckoutByPayment(ctx, &payment)
	if database.IsNoRows(err) {
		return nil // not a Paystack payment
	}
	if err != nil {
		return err
	}
	return queueRefund(ctx, q, c, true, reason)
}

// queueRefund marks a paid checkout REFUND_REVIEW with why, and tells the
// rider. credited: the amount sits in the rider's internal credit and comes
// out now (so it can't be spent while the refund is reviewed).
func queueRefund(ctx context.Context, q *db.Queries, c db.FinanceWalletcheckout, credited bool, reason string) error {
	acct, err := q.AccountByID(ctx, c.AccountID)
	if err != nil {
		return err
	}
	if credited {
		w, err := LockedWallet(ctx, q, acct.ID)
		if err != nil {
			return err
		}
		w.BalanceKobo -= c.AmountKobo
		if err := saveWallet(ctx, q, w); err != nil {
			return err
		}
		if _, err := Post(ctx, q, "REFUND", trunc100("REFUND-"+c.Reference), "Refund due: "+reason,
			[]Entry{{Code: "wallet:" + acct.KuraID, Type: Liability, Debit: c.AmountKobo},
				{Code: "psp_clearing", Type: Clearing, Credit: c.AmountKobo}}); err != nil {
			return err
		}
	}
	if err := q.SettleCheckout(ctx, db.SettleCheckoutParams{ID: c.ID, Status: "REFUND_REVIEW", PaymentID: c.PaymentID,
		FailureReason: reason, Channel: c.Channel}); err != nil {
		return err
	}
	return events.Emit(ctx, q, events.Event{Action: "refund.requested", SubjectType: "checkout",
		SubjectID: c.ID.String(), SubjectLabel: c.Reference,
		After: events.Map{"amount_kobo": c.AmountKobo, "reason": reason, "status": "REFUND_REVIEW"},
		Notify: []events.NotifySpec{{UserID: acct.OwnerUserID, Title: "Refund being reviewed",
			Body:   FormatNaira(c.AmountKobo) + " (" + reason + ") will be refunded to how you paid once our team confirms it.",
			Source: "Payments", Severity: events.Info, LinkPath: "/wallet", TemplateCode: "refund.requested",
			DedupeKey: "refund.requested:" + c.Reference}}})
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}
