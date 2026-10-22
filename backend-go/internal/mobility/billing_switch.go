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
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

// SwitchPreview is switch_preview.SwitchPreview (rendered by preview_to_dict).
type SwitchPreview struct {
	Kind            string  `json:"kind"`
	Effective       string  `json:"effective"`
	CurrentPlanID   string  `json:"current_plan_id"`
	CurrentPlanName string  `json:"current_plan_name"`
	CurrentListKobo int64   `json:"current_list_kobo"`
	TargetPlanID    string  `json:"target_plan_id"`
	TargetPlanName  string  `json:"target_plan_name"`
	TargetListKobo  int64   `json:"target_list_kobo"`
	DueKobo         int64   `json:"due_kobo"`
	DiscountKobo    int64   `json:"discount_kobo"`
	RefundKobo      int64   `json:"refund_kobo"`
	KeepsUntil      string  `json:"keeps_until"`
	StartsAt        string  `json:"starts_at"`
	PinRequired     bool    `json:"pin_required"`
	Message         string  `json:"message"`
	QueuedPlanID    *string `json:"queued_plan_id"`
}

// classifySwitch is classify_switch.
func classifySwitch(cur, target db.MobilityPlan, curKobo, targetKobo int64) (string, error) {
	switch {
	case cur.ID == target.ID:
		return "CLEAR_QUEUE", nil
	case targetKobo > curKobo:
		return "UPGRADE", nil
	case targetKobo < curKobo:
		return "DOWNGRADE", nil
	}
	td, err := planDays(target)
	if err != nil {
		return "", err
	}
	cd, err := planDays(cur)
	if err != nil {
		return "", err
	}
	switch {
	case td > cd:
		return "UPGRADE", nil
	case td < cd:
		return "DOWNGRADE", nil
	}
	return "LATERAL", nil
}

// resolveEffective is resolve_effective.
func resolveEffective(kind string, immediate *bool) (string, error) {
	switch kind {
	case "CLEAR_QUEUE":
		return "QUEUED", nil
	case "DOWNGRADE":
		if immediate != nil && *immediate {
			return "", apperr.Conflict("SWITCH_DOWNGRADE_QUEUED", "Downgrades start when your current plan ends. "+
				"You keep this plan until then — no mid-period refund.")
		}
		return "QUEUED", nil
	case "UPGRADE":
		if immediate != nil && !*immediate {
			return "QUEUED", nil
		}
		return "IMMEDIATE", nil
	}
	if immediate != nil && *immediate {
		return "IMMEDIATE", nil
	}
	return "QUEUED", nil
}

// previewSwitch is switch_preview.preview_switch.
func previewSwitch(ctx context.Context, q *db.Queries, s db.MobilitySubscription, target db.MobilityPlan,
	immediate *bool, code, channel string) (SwitchPreview, error) {
	if s.Status != "ACTIVE" {
		return SwitchPreview{}, apperr.Conflict("INVALID_TRANSITION", fmt.Sprintf("Cannot switch subscription in status %s.", s.Status))
	}
	if target.Period == "swap" {
		return SwitchPreview{}, apperr.New("VALIDATION_ERROR", "Cannot switch to pay-per-swap catalogue row.")
	}
	if !target.IsActive {
		return SwitchPreview{}, apperr.New("VALIDATION_ERROR", "Plan is not active.")
	}
	cur, err := q.PlanRow(ctx, s.PlanID)
	if err != nil {
		return SwitchPreview{}, err
	}
	veh, err := q.VehicleByIDPlain(ctx, s.VehicleID)
	if err != nil {
		return SwitchPreview{}, err
	}
	model, err := q.VehicleModelByID(ctx, veh.VehicleModelID)
	if err != nil {
		return SwitchPreview{}, err
	}
	curKobo, err := planListKobo(ctx, q, model.VehicleType, cur.Period)
	if err != nil {
		return SwitchPreview{}, err
	}
	targetKobo, err := planListKobo(ctx, q, model.VehicleType, target.Period)
	if err != nil {
		return SwitchPreview{}, err
	}
	kind, err := classifySwitch(cur, target, curKobo, targetKobo)
	if err != nil {
		return SwitchPreview{}, err
	}
	effective, err := resolveEffective(kind, immediate)
	if err != nil {
		return SwitchPreview{}, err
	}
	off, due := int64(0), targetKobo
	code = strings.TrimSpace(code)
	if effective == "IMMEDIATE" && code != "" {
		vehicles, err := q.AccountVehicleTotal(ctx, s.AccountID)
		if err != nil {
			return SwitchPreview{}, err
		}
		qt, err := quoteDiscount(ctx, q, code, targetKobo, target.Period, channel, &target, vehicles)
		if err != nil {
			return SwitchPreview{}, err
		}
		off, due = qt.Discounted, qt.Due
	} else if effective != "IMMEDIATE" {
		due = 0
	}
	endsDay := s.EndsAt.UTC().Format("2006-01-02")
	p := SwitchPreview{Kind: kind, Effective: effective, CurrentPlanID: cur.ID.String(), CurrentPlanName: cur.Name,
		CurrentListKobo: curKobo, TargetPlanID: target.ID.String(), TargetPlanName: target.Name,
		TargetListKobo: targetKobo, DueKobo: due, DiscountKobo: off, KeepsUntil: jsontime.FormatISO(s.EndsAt),
		StartsAt: jsontime.FormatISO(s.EndsAt), PinRequired: effective == "IMMEDIATE",
		QueuedPlanID: idPtr(s.QueuedPlanID)}
	switch {
	case kind == "CLEAR_QUEUE":
		p.Message = "Clears any pending plan change. Your current plan continues."
	case effective == "QUEUED":
		p.Message = fmt.Sprintf("%s starts on %s. You keep %s until then. No refund.", target.Name, endsDay, cur.Name)
	default:
		p.Message = fmt.Sprintf("Starts now: %s. Charge ₦%s today. Unused time on %s is not refunded.",
			target.Name, thousands(due/100), cur.Name)
		p.StartsAt = jsontime.FormatISO(time.Now())
	}
	return p, nil
}

// SwitchIn is execute_switch's arguments.
type SwitchIn struct {
	Sub                          uuid.UUID
	Plan                         db.MobilityPlan
	Actor                        *events.Actor
	Immediate                    *bool
	Code, Key, Channel, PinGrant string
}

// Switch is plans.switch.execute_switch: queue / clear in one transaction;
// an immediate switch cancels (committed) and then buys the new plan in a
// second transaction, exactly like Django.
func (b *Billing) Switch(ctx context.Context, in SwitchIn) (uuid.UUID, error) {
	var buy *PurchaseIn
	err := database.InTx(ctx, b.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		s, err := q.SubscriptionForUpdate(ctx, in.Sub)
		if err != nil {
			return err
		}
		p, err := previewSwitch(ctx, q, s, in.Plan, in.Immediate, in.Code, in.Channel)
		if err != nil {
			return err
		}
		acct, err := subscriptionAccount(ctx, q, s)
		if err != nil {
			return err
		}
		who, err := ownerActor(ctx, q, in.Actor, acct.OwnerUserID)
		if err != nil {
			return err
		}
		if p.Kind == "CLEAR_QUEUE" {
			before := events.Map{"queued_plan_id": optID(s.QueuedPlanID)}
			s.QueuedPlanID = nil
			if err := saveSubscription(ctx, q, s); err != nil {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "subscription.switch_queue_cleared",
				SubjectType: "subscription", SubjectID: s.ID.String(), Actor: who, Before: before,
				After: events.Map{"queued_plan_id": nil}})
		}
		if p.Effective == "QUEUED" {
			before := events.Map{"plan_id": s.PlanID.String(), "queued_plan_id": optID(s.QueuedPlanID)}
			s.QueuedPlanID = &in.Plan.ID
			if err := saveSubscription(ctx, q, s); err != nil {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "subscription.switch_queued", SubjectType: "subscription",
				SubjectID: s.ID.String(), Actor: who, Before: before,
				After: events.Map{"kind": p.Kind, "plan_id": s.PlanID.String(), "queued_plan_id": in.Plan.ID.String(),
					"starts_at": jsontime.FormatISO(s.EndsAt)},
				Notify: []events.NotifySpec{{UserID: acct.OwnerUserID, Title: "Plan change queued", Body: p.Message,
					Source: "Billing", TemplateCode: "plan.switch_queued", LinkPath: "/plans",
					DedupeKey: fmt.Sprintf("sub-switch-q:%s:%s", s.ID, in.Plan.ID)}}})
		}
		if strings.TrimSpace(in.PinGrant) == "" {
			return apperr.New("PIN_GRANT_REQUIRED", "PIN confirmation is required to switch plans now.").WithStatus(403)
		}
		auto := s.AutoRenew
		buy = &PurchaseIn{Account: acct, Vehicle: s.VehicleID, Plan: in.Plan, Actor: in.Actor, AutoRenew: &auto,
			Code: in.Code, Key: in.Key, Channel: in.Channel, PinGrant: in.PinGrant}
		return cancelSubscription(ctx, q, s.ID, in.Actor, "switch_"+strings.ToLower(p.Kind))
	})
	if err != nil || buy == nil {
		return in.Sub, err
	}
	return b.Purchase(ctx, *buy)
}

// SetAutoRenew is SubscriptionService.set_auto_renew.
func (b *Billing) SetAutoRenew(ctx context.Context, sub uuid.UUID, on bool, actor *events.Actor) error {
	return database.InTx(ctx, b.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		s, err := q.SubscriptionForUpdate(ctx, sub)
		if err != nil {
			return err
		}
		before := events.Map{"auto_renew": s.AutoRenew}
		s.AutoRenew = on
		if err := saveSubscription(ctx, q, s); err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "subscription.auto_renew_set", SubjectType: "subscription",
			SubjectID: s.ID.String(), Actor: actor, Before: before, After: events.Map{"auto_renew": on}})
	})
}

// Cancel runs SubscriptionService.cancel in its own transaction.
func (b *Billing) Cancel(ctx context.Context, sub uuid.UUID, actor *events.Actor, reason string) error {
	return database.InTx(ctx, b.pool, func(tx pgx.Tx) error {
		return cancelSubscription(ctx, db.New(tx), sub, actor, reason)
	})
}
