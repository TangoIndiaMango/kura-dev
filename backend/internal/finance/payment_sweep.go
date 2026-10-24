package finance

import (
	"context"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/integrations/psp"
)

// PaymentSweep is the worker's safety net so nothing depends on Paystack's
// webhook: re-verify checkouts nobody confirmed (a link paid after the desk
// moved on), expire abandoned ones, and send queued refunds.
func PaymentSweep(ctx context.Context, pool *pgxpool.Pool, cfg CheckoutConfig, log *slog.Logger, limit int32) (map[string]any, error) {
	q := db.New(pool)
	pending, err := q.CheckoutsToReverify(ctx, limit)
	if err != nil {
		return nil, err
	}
	settled := 0
	for _, c := range pending {
		after, err := VerifyAndSettle(ctx, pool, cfg, c)
		if err != nil {
			log.WarnContext(ctx, "checkout_reverify_failed", "reference", c.Reference, "err", err)
			continue
		}
		if after.Status != "PENDING" {
			settled++
		}
	}
	expired, err := q.ExpireStaleCheckouts(ctx)
	if err != nil {
		return nil, err
	}
	refunded, err := sendRefunds(ctx, q, cfg, log, limit)
	return map[string]any{"reverified": len(pending), "settled": settled, "expired": expired,
		"refunded": refunded}, err
}

// sendRefunds asks Paystack to refund each REFUND_PENDING checkout. A failed
// call stays queued for the next run.
func sendRefunds(ctx context.Context, q *db.Queries, cfg CheckoutConfig, log *slog.Logger, limit int32) (int, error) {
	due, err := q.RefundDueCheckouts(ctx, limit)
	if err != nil || len(due) == 0 {
		return 0, err
	}
	client, err := psp.Get("PAYSTACK", cfg.PSP)
	if err != nil {
		return 0, err
	}
	n := 0
	for _, c := range due {
		if err := client.Refund(ctx, c.Reference, c.AmountKobo); err != nil {
			log.WarnContext(ctx, "checkout_refund_failed", "reference", c.Reference, "err", err)
			continue
		}
		if err := q.SettleCheckout(ctx, db.SettleCheckoutParams{ID: c.ID, Status: "REFUNDED", PaymentID: c.PaymentID,
			FailureReason: c.FailureReason, Channel: c.Channel}); err != nil {
			return n, err
		}
		n++
		acct, err := q.AccountByID(ctx, c.AccountID)
		if err != nil {
			return n, err
		}
		if err := events.Emit(ctx, q, events.Event{Action: "payment.refunded", SubjectType: "checkout",
			SubjectID: c.ID.String(), SubjectLabel: c.Reference,
			After: events.Map{"amount_kobo": c.AmountKobo, "psp_reference": c.Reference, "provider": "PAYSTACK"},
			Notify: []events.NotifySpec{{UserID: acct.OwnerUserID, Title: "Refund sent",
				Body:   FormatNaira(c.AmountKobo) + " is on its way back to how you paid. Banks usually show it within a few working days.",
				Source: "Payments", Severity: events.Info, LinkPath: "/wallet", TemplateCode: "payment.refunded",
				DedupeKey: "payment.refunded:" + c.Reference}}}); err != nil {
			return n, err
		}
	}
	return n, nil
}
