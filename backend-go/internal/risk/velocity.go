package risk

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
)

// enabledParams is _enabled_params: nil when the rule is missing / disabled.
func enabledParams(ctx context.Context, q *db.Queries, code string, defaults map[string]float64) (map[string]float64, error) {
	if err := EnsureRules(ctx, q); err != nil {
		return nil, err
	}
	rule, err := q.RiskRuleByCode(ctx, code)
	if isNoRows(err) || (err == nil && !rule.Enabled) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	out := map[string]float64{}
	for k, v := range defaults {
		out[k] = v
	}
	var raw map[string]any
	_ = json.Unmarshal(rule.Params, &raw)
	for k, v := range raw {
		if f, ok := v.(float64); ok {
			out[k] = f
		}
	}
	return out, nil
}

// WATDay is _wat_day_bounds.
func WATDay(now time.Time) (time.Time, time.Time) {
	l := now.In(lagos)
	start := time.Date(l.Year(), l.Month(), l.Day(), 0, 0, 0, 0, lagos)
	return start, start.AddDate(0, 0, 1)
}

func secondsUntil(t time.Time) int64 { return max(int64(time.Until(t).Seconds()), 1) }

// Throttle is inspect_swap_velocity's payload.
type Throttle struct {
	Reason, Message string
	RetryAfter      int64
	Context         map[string]any
}

// InspectSwapVelocity is inspect_swap_velocity (no risk event emitted).
func InspectSwapVelocity(ctx context.Context, q *db.Queries, vehicle uuid.UUID) (*Throttle, error) {
	p, err := enabledParams(ctx, q, "SWAP_VELOCITY", map[string]float64{"MAX_SWAPS_PER_VEHICLE_DAY": 4,
		"MIN_MINUTES_BETWEEN_SWAPS": 45})
	if p == nil || err != nil {
		return nil, err
	}
	maxDay, minGap := int64(p["MAX_SWAPS_PER_VEHICLE_DAY"]), int64(p["MIN_MINUTES_BETWEEN_SWAPS"])
	start, end := WATDay(time.Now())
	n, err := q.VehicleSwapsToday(ctx, db.VehicleSwapsTodayParams{VehicleID: vehicle, DayStart: &start, DayEnd: &end})
	if err != nil {
		return nil, err
	}
	if int64(n) >= maxDay {
		return &Throttle{Reason: "MAX_SWAPS_PER_VEHICLE_DAY", Message: fmt.Sprintf("Vehicle swap limit reached (%d/day).", maxDay),
			RetryAfter: secondsUntil(end), Context: map[string]any{"count": n, "limit": maxDay}}, nil
	}
	last, err := q.LastCompletedSwapAt(ctx, vehicle)
	if isNoRows(err) || (err == nil && last == nil) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	elapsed, need := time.Since(*last), time.Duration(minGap)*time.Minute
	if elapsed >= need {
		return nil, nil
	}
	return &Throttle{Reason: "MIN_MINUTES_BETWEEN_SWAPS",
		Message: fmt.Sprintf("Wait %d minutes between swaps for this vehicle.", minGap),
		RetryAfter: max(int64((need - elapsed).Seconds()), 1),
		Context: map[string]any{"elapsed_seconds": int64(elapsed.Seconds()), "min_minutes": minGap}}, nil
}

// TryConsumeGrant is try_consume_velocity_grant (its own committed tx).
func TryConsumeGrant(ctx context.Context, pool *pgxpool.Pool, vehicle uuid.UUID) (bool, error) {
	used := false
	err := database.InTx(ctx, pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		g, err := q.ConsumableGrantForUpdate(ctx, vehicle)
		if isNoRows(err) {
			return nil
		}
		if err != nil {
			return err
		}
		used = true
		g.UsesRemaining = max(0, g.UsesRemaining-1)
		if g.UsesRemaining == 0 {
			g.Status = "CONSUMED"
		}
		if err := q.SaveGrantUse(ctx, db.SaveGrantUseParams{ID: g.ID, UsesRemaining: g.UsesRemaining, Status: g.Status}); err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "risk.velocity_grant.consumed",
			SubjectType: "risk_velocity_grant", SubjectID: g.ID.String(),
			Metadata: events.Map{"vehicle_id": vehicle.String(), "uses_remaining": g.UsesRemaining, "status": g.Status}})
	})
	return used, err
}

// AssertSwapVelocity is assert_swap_velocity: a grant lets the swap through,
// otherwise the open SWAP_VELOCITY event is updated / opened (committed, so it
// survives the request failing) and a 429 THROTTLED is returned.
func AssertSwapVelocity(ctx context.Context, pool *pgxpool.Pool, vehicle uuid.UUID, account *uuid.UUID) error {
	hit, err := InspectSwapVelocity(ctx, db.New(pool), vehicle)
	if hit == nil || err != nil {
		return err
	}
	if ok, err := TryConsumeGrant(ctx, pool, vehicle); ok || err != nil {
		return err
	}
	payload := map[string]any{"reason": hit.Reason, "retry_after_seconds": hit.RetryAfter}
	for k, v := range hit.Context {
		payload[k] = v
	}
	var eventID uuid.UUID
	err = database.InTx(ctx, pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		e, err := q.OpenVelocityEvent(ctx, vehicle.String())
		if err == nil {
			ctxMap := map[string]any{}
			_ = json.Unmarshal(e.Context, &ctxMap)
			for k, v := range payload {
				ctxMap[k] = v
			}
			raw, _ := json.Marshal(ctxMap)
			eventID = e.ID
			return q.SaveRiskEventContext(ctx, db.SaveRiskEventContextParams{ID: e.ID, Context: raw})
		}
		if !isNoRows(err) {
			return err
		}
		eventID, err = Emit(ctx, q, Event{RuleCode: "SWAP_VELOCITY", SubjectType: "vehicle",
			SubjectID: vehicle.String(), AccountID: account, Severity: "HIGH", Context: payload, ActionTaken: "BLOCK"})
		return err
	})
	if err != nil {
		return err
	}
	details := apperr.Details{"retry_after_seconds": hit.RetryAfter, "reason": hit.Reason,
		"risk_event_id": eventID.String(), "vehicle_id": vehicle.String()}
	for k, v := range hit.Context {
		details[k] = v
	}
	return apperr.New("THROTTLED", hit.Message).WithStatus(429).WithDetails(details)
}
