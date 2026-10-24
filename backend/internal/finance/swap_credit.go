package finance

import (
	"context"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
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

// RefundUnusedSwapPayments sends back Paystack payments for a swap that did
// not use them (aborted, or settled by cash / plan / credit). Riders hold no
// balance: the money is taken back out of the swap's internal credit and
// queued for a Paystack refund to the card / account it came from.
func RefundUnusedSwapPayments(ctx context.Context, q *db.Queries, swap uuid.UUID) error {
	cs, err := q.UnrecordedSwapCheckouts(ctx, &swap)
	if err != nil {
		return err
	}
	for _, c := range cs {
		if err := queueRefund(ctx, q, c, true); err != nil {
			return err
		}
	}
	return nil
}

// RefundSwapPayment queues the card refund of a reversed PAYSTACK swap (its
// capture has just been reversed back into the internal credit).
func RefundSwapPayment(ctx context.Context, q *db.Queries, payment uuid.UUID) error {
	c, err := q.CheckoutByPayment(ctx, &payment)
	if database.IsNoRows(err) {
		return nil // not a Paystack payment
	}
	if err != nil {
		return err
	}
	return queueRefund(ctx, q, c, true)
}

// queueRefund marks a paid checkout REFUND_PENDING (the worker sends it).
// credited: the amount sits in the rider's internal credit and comes out.
func queueRefund(ctx context.Context, q *db.Queries, c db.FinanceWalletcheckout, credited bool) error {
	if credited {
		acct, err := q.AccountByID(ctx, c.AccountID)
		if err != nil {
			return err
		}
		w, err := LockedWallet(ctx, q, acct.ID)
		if err != nil {
			return err
		}
		w.BalanceKobo -= c.AmountKobo
		if err := saveWallet(ctx, q, w); err != nil {
			return err
		}
		if _, err := Post(ctx, q, "REFUND", trunc100("REFUND-"+c.Reference), "Paystack refund for unused swap payment",
			[]Entry{{Code: "wallet:" + acct.KuraID, Type: Liability, Debit: c.AmountKobo},
				{Code: "psp_clearing", Type: Clearing, Credit: c.AmountKobo}}); err != nil {
			return err
		}
	}
	return q.SettleCheckout(ctx, db.SettleCheckoutParams{ID: c.ID, Status: "REFUND_PENDING", PaymentID: c.PaymentID,
		FailureReason: c.FailureReason, Channel: c.Channel})
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}
