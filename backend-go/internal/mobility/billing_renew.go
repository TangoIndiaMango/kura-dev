package mobility

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/finance"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

// Renew is plans.renew: charge the next period at the live price, applying
// any queued plan first.
func (b *Billing) Renew(ctx context.Context, subID uuid.UUID, actor *events.Actor, code, key, channel, pinGrant string) error {
	return b.renew(ctx, subID, actor, code, key, channel, pinGrant, false)
}

// RenewSystem is renew(skip_pin=True): the worker's auto-renew / queued
// switch charge.
func (b *Billing) RenewSystem(ctx context.Context, subID uuid.UUID, key, channel string) error {
	return b.renew(ctx, subID, nil, "", key, channel, "", true)
}

func (b *Billing) renew(ctx context.Context, subID uuid.UUID, actor *events.Actor, code, key, channel, pinGrant string,
	skipPin bool) error {
	key = strings.TrimSpace(key)
	q0 := db.New(b.pool)
	if key != "" {
		if _, err := q0.SubscriptionByKey(ctx, &key); err == nil {
			return nil
		} else if !database.IsNoRows(err) {
			return err
		}
	}
	return database.InTx(ctx, b.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		s, err := q.SubscriptionForUpdate(ctx, subID)
		if err != nil {
			return err
		}
		if s.Status != "ACTIVE" && s.Status != "EXPIRED" && s.Status != "LAPSED_TO_PPS" {
			return apperr.Conflict("INVALID_TRANSITION", fmt.Sprintf("Cannot renew subscription in status %s.", s.Status))
		}
		acct, err := subscriptionAccount(ctx, q, s)
		if err != nil {
			return err
		}
		if !skipPin {
			if err := b.assertPinGrant(pinGrant, acct.OwnerUserID); err != nil {
				return err
			}
		}
		switched, err := applyQueuedPlan(ctx, q, &s)
		if err != nil {
			return err
		}
		plan, err := q.PlanRow(ctx, s.PlanID)
		if err != nil {
			return err
		}
		veh, err := q.VehicleByIDPlain(ctx, s.VehicleID)
		if err != nil {
			return err
		}
		model, err := q.VehicleModelByID(ctx, veh.VehicleModelID)
		if err != nil {
			return err
		}
		list, err := planListKobo(ctx, q, model.VehicleType, plan.Period)
		if err != nil {
			return err
		}
		code = strings.TrimSpace(code)
		off, due := int64(0), list
		vehicles, err := q.AccountVehicleTotal(ctx, acct.ID)
		if err != nil {
			return err
		}
		if code != "" {
			qt, err := quoteDiscount(ctx, q, code, list, plan.Period, channel, &plan, vehicles)
			if err != nil {
				return err
			}
			off, due = qt.Discounted, qt.Due
		}
		now := time.Now()
		payKey := "renew:" + key
		if key == "" {
			payKey = fmt.Sprintf("renew:%s:%s", s.ID, pyTimestamp(now))
		}
		pay, err := finance.DebitPlanFee(ctx, q, finance.Account{ID: acct.ID, KuraID: acct.KuraID}, due, truncate(payKey, 64))
		if err != nil {
			return err
		}
		base := now
		if s.EndsAt.After(now) {
			base = s.EndsAt
		}
		days, err := planDays(plan)
		if err != nil {
			return err
		}
		before := events.Map{"status": s.Status, "ends_at": jsontime.FormatISO(s.EndsAt), "plan_id": s.PlanID.String()}
		if s.Status != "ACTIVE" {
			s.StartsAt = now
		}
		s.EndsAt, s.Status = base.AddDate(0, 0, days), "ACTIVE"
		if !switched {
			s.SwapsUsed, s.SwapsAllowance = 0, plan.SwapAllowance
		}
		s.PaymentID, s.ListPriceKobo, s.DiscountKobo, s.AmountKobo = &pay.ID, list, off, due
		s.DiscountCode = strings.ToUpper(code)
		if key != "" {
			s.IdempotencyKey = &key
		}
		if err := saveSubscription(ctx, q, s); err != nil {
			return err
		}
		if code != "" {
			dk := "disc:" + key
			if key == "" {
				dk = "disc-renew:" + pay.ID.String() // Django fix: sub+payment ids overflowed varchar(64)
			}
			if _, err := consumeDiscount(ctx, q, consumeIn{Code: code, List: list, Period: plan.Period, Channel: channel,
				Account: acct.ID, Plan: &plan, Vehicles: vehicles, Payment: &pay.ID, Subscription: &s.ID, Key: dk}); err != nil {
				return err
			}
		}
		who, err := ownerActor(ctx, q, actor, acct.OwnerUserID)
		if err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "subscription.renewed", SubjectType: "subscription",
			SubjectID: s.ID.String(), Actor: who, Before: before,
			After: events.Map{"status": "ACTIVE", "ends_at": jsontime.FormatISO(s.EndsAt), "amount_kobo": due,
				"plan_id": s.PlanID.String(), "queued_applied": switched},
			Notify: []events.NotifySpec{{UserID: acct.OwnerUserID, Title: "Plan renewed",
				Body:   fmt.Sprintf("%s now runs until %s.", plan.Name, s.EndsAt.UTC().Format("2006-01-02")),
				Source: "Billing", TemplateCode: "plan.renewed", LinkPath: "/plans",
				DedupeKey: fmt.Sprintf("sub-renewed:%s:%s", s.ID, pay.ID)}}})
	})
}

// pyTimestamp is str(datetime.timestamp()) — seconds with Python's repr.
func pyTimestamp(t time.Time) string {
	f := float64(t.UnixMicro()) / 1e6
	return pyFloat(f)
}

// Cancel is SubscriptionService.cancel (on the caller's transaction).
func cancelSubscription(ctx context.Context, q *db.Queries, subID uuid.UUID, actor *events.Actor, reason string) error {
	s, err := q.SubscriptionForUpdate(ctx, subID)
	if err != nil {
		return err
	}
	if s.Status != "ACTIVE" {
		return apperr.Conflict("INVALID_TRANSITION", fmt.Sprintf("Cannot cancel subscription in status %s.", s.Status))
	}
	before := events.Map{"status": s.Status, "auto_renew": s.AutoRenew, "queued_plan_id": optID(s.QueuedPlanID)}
	s.Status, s.AutoRenew, s.QueuedPlanID = "CANCELLED", false, nil
	if err := saveSubscription(ctx, q, s); err != nil {
		return err
	}
	acct, err := subscriptionAccount(ctx, q, s)
	if err != nil {
		return err
	}
	plan, err := q.PlanRow(ctx, s.PlanID)
	if err != nil {
		return err
	}
	who, err := ownerActor(ctx, q, actor, acct.OwnerUserID)
	if err != nil {
		return err
	}
	return events.Emit(ctx, q, events.Event{Action: "subscription.cancelled", SubjectType: "subscription",
		SubjectID: s.ID.String(), Actor: who, Before: before,
		After: events.Map{"status": "CANCELLED", "reason": truncate(reason, 200)},
		Notify: []events.NotifySpec{{UserID: acct.OwnerUserID, Title: "Plan cancelled",
			Body: plan.Name + " was cancelled. Swaps are pay-per-swap now.", Source: "Billing",
			TemplateCode: "plan.cancelled", LinkPath: "/plans", DedupeKey: "sub-cancelled:" + s.ID.String()}}})
}
