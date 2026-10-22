package mobility

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/auth"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/finance"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

// Billing is mobility.services.plans billing (purchase / renew / cancel /
// switch) plus the rider PIN check for wallet debits.
type Billing struct {
	pool   *pgxpool.Pool
	tokens *auth.Tokens
}

// assertPinGrant is accounts.services.auth.assert_pin_grant.
func (b *Billing) assertPinGrant(token string, owner uuid.UUID) error {
	return b.tokens.AssertPinGrant(token, owner)
}

// planDays is helpers.duration_days.
func planDays(p db.MobilityPlan) (int, error) {
	if p.DurationDays != nil && *p.DurationDays > 0 {
		return int(*p.DurationDays), nil
	}
	switch p.Period {
	case "day":
		return 1, nil
	case "week":
		return 7, nil
	case "month":
		return 30, nil
	}
	return 0, apperr.New("VALIDATION_ERROR", "Pay-per-swap catalogue rows cannot be purchased as subscriptions.")
}

// planListKobo is PricingService.resolve_plan_list_kobo.
func planListKobo(ctx context.Context, q *db.Queries, vehicleType, period string) (int64, error) {
	m, err := activeMatrix(ctx, q, vehicleType)
	if err != nil {
		return 0, err
	}
	switch period {
	case "day":
		return m.DailyKobo, nil
	case "week":
		return m.WeeklyKobo, nil
	case "month":
		return m.MonthlyKobo, nil
	case "swap":
		return m.PayPerSwapKobo, nil
	}
	return 0, apperr.New("VALIDATION_ERROR", fmt.Sprintf("Unknown plan period: %s.", period))
}

// PurchaseIn is billing.purchase's arguments.
type PurchaseIn struct {
	Account                            db.AccountsAccount
	Vehicle                            uuid.UUID
	Plan                               db.MobilityPlan
	Actor                              *events.Actor
	AutoRenew                          *bool
	Code, Key, Channel, Mode, PinGrant string
	SkipPin                            bool
}

func ownerActor(ctx context.Context, q *db.Queries, who *events.Actor, owner uuid.UUID) (*events.Actor, error) {
	if who != nil {
		return who, nil
	}
	u, err := q.UserRow(ctx, owner)
	if err != nil {
		return nil, err
	}
	return &events.Actor{ID: u.ID, Email: deref(u.Email), Phone: deref(u.Phone), Role: u.Role}, nil
}

// Purchase is plans.purchase: wallet debit (optionally discounted) and an
// ACTIVE subscription for the vehicle.
func (b *Billing) Purchase(ctx context.Context, in PurchaseIn) (uuid.UUID, error) {
	if in.Plan.Period == "swap" || !in.Plan.IsActive {
		return uuid.Nil, apperr.New("VALIDATION_ERROR", "Select an active daily, weekly, or monthly plan.")
	}
	q := db.New(b.pool)
	veh, err := q.VehicleByIDPlain(ctx, in.Vehicle)
	if err != nil {
		return uuid.Nil, err
	}
	if veh.AccountID != in.Account.ID {
		return uuid.Nil, apperr.New("FORBIDDEN", "Vehicle is not on this account.").WithStatus(403)
	}
	if strings.ToUpper(firstOf(in.Mode, "WALLET")) != "WALLET" {
		return uuid.Nil, apperr.New("VALIDATION_ERROR", "Only WALLET payment_mode is supported for plan purchase.")
	}
	key := strings.TrimSpace(in.Key)
	if key != "" {
		if s, err := q.SubscriptionByKey(ctx, &key); err == nil {
			return s.ID, nil
		} else if !database.IsNoRows(err) {
			return uuid.Nil, err
		}
	}
	if !in.SkipPin {
		if err := b.assertPinGrant(in.PinGrant, in.Account.OwnerUserID); err != nil {
			return uuid.Nil, err
		}
	}
	model, err := q.VehicleModelByID(ctx, veh.VehicleModelID)
	if err != nil {
		return uuid.Nil, err
	}
	list, err := planListKobo(ctx, q, model.VehicleType, in.Plan.Period)
	if err != nil {
		return uuid.Nil, err
	}
	id := ids.New()
	err = database.InTx(ctx, b.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		v, err := q.VehicleForUpdate(ctx, veh.ID)
		if err != nil {
			return err
		}
		if active, err := q.ActiveSubscriptionForVehicle(ctx, v.ID); err == nil {
			return apperr.Conflict("SUBSCRIPTION_ACTIVE", "Vehicle already has an active plan. Renew or switch instead.").
				WithDetails(apperr.Details{"subscription_id": active.ID.String()})
		} else if !database.IsNoRows(err) {
			return err
		}
		code := strings.TrimSpace(in.Code)
		off, due := int64(0), list
		vehicles, err := q.AccountVehicleTotal(ctx, in.Account.ID)
		if err != nil {
			return err
		}
		if code != "" {
			qt, err := quoteDiscount(ctx, q, code, list, in.Plan.Period, in.Channel, &in.Plan, vehicles)
			if err != nil {
				return err
			}
			off, due = qt.Discounted, qt.Due
		}
		now := time.Now()
		payKey := "plan:" + key
		if key == "" {
			payKey = fmt.Sprintf("plan:%s:%s:%s:%s", in.Account.ID, v.ID, in.Plan.ID, jsontime.FormatISO(now))
		}
		pay, err := finance.DebitPlanFee(ctx, q, finance.Account{ID: in.Account.ID, KuraID: in.Account.KuraID}, due,
			truncate(payKey, 64))
		if err != nil {
			return err
		}
		days, err := planDays(in.Plan)
		if err != nil {
			return err
		}
		renew := in.Plan.AutoRenewDefault
		if in.AutoRenew != nil {
			renew = *in.AutoRenew
		}
		var k *string
		if key != "" {
			k = &key
		}
		ends := now.AddDate(0, 0, days)
		if err := q.InsertSubscription(ctx, db.InsertSubscriptionParams{ID: id, StartsAt: now, EndsAt: ends,
			SwapsAllowance: in.Plan.SwapAllowance, AutoRenew: renew, AccountID: in.Account.ID, PlanID: in.Plan.ID,
			VehicleID: v.ID, AmountKobo: due, DiscountCode: strings.ToUpper(code), DiscountKobo: off,
			IdempotencyKey: k, ListPriceKobo: list, PaymentID: &pay.ID}); err != nil {
			if _, dup := database.IsUniqueViolation(err); dup {
				return apperr.Conflict("SUBSCRIPTION_ACTIVE", "Vehicle already has an active plan.")
			}
			return err
		}
		if code != "" {
			dk := "disc:" + key
			if key == "" {
				dk = "disc:" + id.String()
			}
			if _, err := consumeDiscount(ctx, q, consumeIn{Code: code, List: list, Period: in.Plan.Period,
				Channel: in.Channel, Account: in.Account.ID, Plan: &in.Plan, Vehicles: vehicles, Payment: &pay.ID,
				Subscription: &id, Key: dk}); err != nil {
				return err
			}
		}
		who, err := ownerActor(ctx, q, in.Actor, in.Account.OwnerUserID)
		if err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "subscription.purchased", SubjectType: "subscription",
			SubjectID: id.String(), SubjectLabel: in.Plan.Name + " · " + v.RegistrationPlate, Actor: who,
			After: events.Map{"status": "ACTIVE", "amount_kobo": due, "discount_kobo": off,
				"ends_at": jsontime.FormatISO(ends), "payment_id": pay.ID.String()},
			Notify: []events.NotifySpec{{UserID: in.Account.OwnerUserID, Title: "Plan activated",
				Body:   fmt.Sprintf("%s is active until %s.", in.Plan.Name, ends.UTC().Format("2006-01-02")),
				Source: "Billing", TemplateCode: "plan.purchased", LinkPath: "/plans",
				DedupeKey: "sub-purchased:" + id.String()}}})
	})
	if err != nil {
		return uuid.Nil, err
	}
	return id, nil
}

// subscriptionAccount loads the subscription's account.
func subscriptionAccount(ctx context.Context, q *db.Queries, s db.MobilitySubscription) (db.AccountsAccount, error) {
	return q.AccountByID(ctx, s.AccountID)
}

func saveSubscription(ctx context.Context, q *db.Queries, s db.MobilitySubscription) error {
	return q.SaveSubscription(ctx, db.SaveSubscriptionParams{ID: s.ID, PlanID: s.PlanID, QueuedPlanID: s.QueuedPlanID,
		StartsAt: s.StartsAt, EndsAt: s.EndsAt, Status: s.Status, SwapsUsed: s.SwapsUsed,
		SwapsAllowance: s.SwapsAllowance, PaymentID: s.PaymentID, ListPriceKobo: s.ListPriceKobo,
		DiscountKobo: s.DiscountKobo, AmountKobo: s.AmountKobo, DiscountCode: s.DiscountCode,
		IdempotencyKey: s.IdempotencyKey, AutoRenew: s.AutoRenew})
}

// applyQueuedPlan is helpers.apply_queued_plan (mutates s; caller saves).
func applyQueuedPlan(ctx context.Context, q *db.Queries, s *db.MobilitySubscription) (bool, error) {
	if s.QueuedPlanID == nil {
		return false, nil
	}
	queued, err := q.PlanRow(ctx, *s.QueuedPlanID)
	if err != nil && !database.IsNoRows(err) {
		return false, err
	}
	if err != nil || queued.Period == "swap" || !queued.IsActive {
		s.QueuedPlanID = nil
		return false, nil
	}
	s.PlanID, s.QueuedPlanID, s.SwapsAllowance, s.SwapsUsed = queued.ID, nil, queued.SwapAllowance, 0
	return true, nil
}
