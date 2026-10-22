package mobility

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/auth"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/finance"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

func isDomain(err error) bool { _, ok := apperr.As(err); return ok }

// endSubscription moves a still-ACTIVE plan to status (EXPIRED or
// LAPSED_TO_PPS) and tells the owner; false when it no longer applies.
func endSubscription(ctx context.Context, q *db.Queries, id uuid.UUID, status string, check func(db.MobilitySubscription) bool,
	ev func(s db.MobilitySubscription, plan string) events.Event) (bool, error) {
	s, err := q.SubscriptionForUpdate(ctx, id)
	if err != nil {
		return false, err
	}
	if s.Status != "ACTIVE" || !check(s) {
		return false, nil
	}
	plan, err := q.PlanRow(ctx, s.PlanID)
	if err != nil {
		return false, err
	}
	e := ev(s, plan.Name)
	s.Status, s.QueuedPlanID = status, nil
	if status == "LAPSED_TO_PPS" {
		s.AutoRenew = false
	}
	if err := saveSubscription(ctx, q, s); err != nil {
		return false, err
	}
	return true, events.Emit(ctx, q, e)
}

// ExpireDueSubscriptions is expire_due_subscriptions: ended plans without
// auto-renew expire; a queued switch is charged instead when it can be.
func (b *Billing) ExpireDueSubscriptions(ctx context.Context, log *slog.Logger, limit int) (map[string]any, error) {
	ids, err := db.New(b.pool).DueSubscriptionIDs(ctx, db.DueSubscriptionIDsParams{AutoRenew: false, Limit: int32(limit)})
	if err != nil {
		return nil, err
	}
	expired, queued := 0, 0
	for _, id := range ids {
		s, err := db.New(b.pool).SubscriptionByID(ctx, id)
		if database.IsNoRows(err) {
			continue
		}
		if err != nil {
			return nil, err
		}
		if s.QueuedPlanID != nil {
			err := b.RenewSystem(ctx, id, fmt.Sprintf("queued-end:%s:%d", id, s.EndsAt.Unix()), "App")
			if err == nil {
				queued++
				continue
			}
			if !isDomain(err) {
				return nil, err
			}
			log.Info("queued_switch_charge_failed", "sub", id, "err", err)
		}
		var done bool
		err = database.InTx(ctx, b.pool, func(tx pgx.Tx) error {
			var err error
			done, err = endSubscription(ctx, db.New(tx), id, "EXPIRED",
				func(s db.MobilitySubscription) bool { return !s.AutoRenew && !s.EndsAt.After(time.Now()) },
				func(s db.MobilitySubscription, plan string) events.Event {
					return events.Event{Action: "subscription.expired", SubjectType: "subscription",
						SubjectID: s.ID.String(), Before: events.Map{"status": s.Status, "queued_plan_id": idOrNil(s.QueuedPlanID)},
						After: events.Map{"status": "EXPIRED"}, Notify: ownerNote(ctx, b, s, "Plan expired",
							plan+" ended. Renew or continue pay-per-swap.", "plan.expired", "sub-expired:"+s.ID.String())}
				})
			return err
		})
		if err != nil {
			return nil, err
		}
		if done {
			expired++
		}
	}
	return map[string]any{"expired": expired, "queued_applied": queued}, nil
}

func ownerNote(ctx context.Context, b *Billing, s db.MobilitySubscription, title, body, template, dedupe string) []events.NotifySpec {
	a, err := db.New(b.pool).AccountByID(ctx, s.AccountID)
	if err != nil {
		return nil
	}
	return []events.NotifySpec{{UserID: a.OwnerUserID, Title: title, Body: body, Source: "Billing",
		TemplateCode: template, LinkPath: "/plans", DedupeKey: dedupe}}
}

// RenewDueSubscriptions is renew_due_subscriptions: auto-renew at the live
// price; a failed charge lapses the plan to pay-per-swap.
func (b *Billing) RenewDueSubscriptions(ctx context.Context, log *slog.Logger, limit int) (map[string]any, error) {
	ids, err := db.New(b.pool).DueSubscriptionIDs(ctx, db.DueSubscriptionIDsParams{AutoRenew: true, Limit: int32(limit)})
	if err != nil {
		return nil, err
	}
	renewed, lapsed := 0, 0
	for _, id := range ids {
		s, err := db.New(b.pool).SubscriptionByID(ctx, id)
		if database.IsNoRows(err) {
			continue
		}
		if err != nil {
			return nil, err
		}
		rerr := b.RenewSystem(ctx, id, fmt.Sprintf("auto-renew:%s:%d", id, s.EndsAt.Unix()), "App")
		if rerr == nil {
			renewed++
			continue
		}
		if !isDomain(rerr) {
			return nil, rerr
		}
		log.Info("auto_renew_failed", "sub", id, "err", rerr)
		msg := rerr.Error()
		if e, ok := apperr.As(rerr); ok {
			msg = e.Message
		}
		var done bool
		err = database.InTx(ctx, b.pool, func(tx pgx.Tx) error {
			var err error
			done, err = endSubscription(ctx, db.New(tx), id, "LAPSED_TO_PPS",
				func(db.MobilitySubscription) bool { return true },
				func(s db.MobilitySubscription, plan string) events.Event {
					return events.Event{Action: "subscription.lapsed_to_pps", SubjectType: "subscription",
						SubjectID: s.ID.String(), Before: events.Map{"status": s.Status},
						After: events.Map{"status": "LAPSED_TO_PPS", "error": msg},
						Notify: ownerNote(ctx, b, s, "Auto-renew failed", "We could not renew "+plan+
							". You are on pay-per-swap until you renew.", "plan.lapsed", "sub-lapsed:"+s.ID.String())}
				})
			return err
		})
		if err != nil {
			return nil, err
		}
		if done {
			lapsed++
		}
	}
	return map[string]any{"renewed": renewed, "lapsed": lapsed}, nil
}

// NotifyPriceChange is notify_price_change_before_renew: warn owners a day
// before an auto-renew whose live price differs from what they paid.
func (b *Billing) NotifyPriceChange(ctx context.Context, within time.Duration, limit int) (map[string]any, error) {
	q := db.New(b.pool)
	rows, err := q.PriceWarnCandidates(ctx, db.PriceWarnCandidatesParams{WindowEnd: time.Now().Add(within),
		Lim: int32(limit)})
	if err != nil {
		return nil, err
	}
	notified := 0
	for _, s := range rows {
		live, err := planListKobo(ctx, q, s.VehicleType, s.Period)
		if err != nil {
			if isDomain(err) {
				continue
			}
			return nil, err
		}
		if live == s.ListPriceKobo {
			continue
		}
		day := s.EndsAt.UTC().Format("2006-01-02")
		naira := finance.FormatNaira(s.ListPriceKobo / 100 * 100)
		naira = naira[:len(naira)-3] // ₦{kobo // 100:,}
		if err := events.EmitTx(ctx, b.pool, events.Event{Action: "subscription.price_change_warned",
			SubjectType: "subscription", SubjectID: s.ID.String(),
			Metadata: events.Map{"prior_list_kobo": s.ListPriceKobo, "live_list_kobo": live,
				"ends_at": jsontime.FormatISO(s.EndsAt)},
			Notify: []events.NotifySpec{{UserID: s.OwnerUserID, Title: "Plan price updated",
				Body:   fmt.Sprintf("Your %s renews on %s at the current rate (was %s).", s.PlanName, day, naira),
				Source: "Billing", TemplateCode: "plan.price_change", LinkPath: "/plans",
				DedupeKey: "sub-price:" + s.ID.String() + ":" + day}}}); err != nil {
			return nil, err
		}
		notified++
	}
	return map[string]any{"notified": notified}, nil
}

// ActivateDueMatrices is activate_due_price_matrices: SCHEDULED tariffs go
// live once their Lagos effective date arrives (no approver).
func ActivateDueMatrices(ctx context.Context, pool *pgxpool.Pool, log *slog.Logger, limit int) (map[string]any, error) {
	now := time.Now().In(lagosTZ)
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	ids, err := db.New(pool).DueMatrixIDs(ctx, db.DueMatrixIDsParams{Today: pgtype.Date{Time: today, Valid: true}, Lim: int32(limit)})
	if err != nil {
		return nil, err
	}
	activated := 0
	for _, id := range ids {
		err := database.InTx(ctx, pool, func(tx pgx.Tx) error {
			q := db.New(tx)
			m, err := q.MatrixByID(ctx, id)
			if err != nil || m.Status != "SCHEDULED" {
				return err
			}
			if err := activateMatrix(ctx, q, id, nil,
				events.Map{"self_approved": false, "maker_checker_bypass": false}, nil); err != nil {
				return err
			}
			activated++
			return nil
		})
		if err != nil && !isDomain(err) {
			return nil, err
		}
		if err != nil {
			log.Info("activate_due_matrix_skipped", "id", id, "err", err)
		}
	}
	return map[string]any{"activated": activated, "candidates": len(ids)}, nil
}

// NewBilling builds the subscription service for the worker.
func NewBilling(pool *pgxpool.Pool, tokens *auth.Tokens) *Billing {
	return &Billing{pool: pool, tokens: tokens}
}
