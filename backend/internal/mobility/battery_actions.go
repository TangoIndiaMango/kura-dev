package mobility

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
)

// batterySnap is _snap (the service variant adds cycle_count).
func batterySnap(b db.MobilityBattery, withCycles bool) events.Map {
	m := events.Map{"serial": b.Serial, "status": b.Status, "custodian_type": b.CustodianType,
		"custodian_id": optID(b.CustodianID), "current_hub_id": optID(b.CurrentHubID),
		"charge_pct": b.ChargePct, "health_pct": b.HealthPct}
	if withCycles {
		m["cycle_count"] = b.CycleCount
	}
	return m
}

// emitAction is actions._emit: always tells the acting user (WARNING when
// danger), dedupe per action+battery.
func emitAction(ctx context.Context, q *db.Queries, who *events.Actor, b db.MobilityBattery, before events.Map,
	action, note string, danger bool, metadata events.Map) error {
	ev := events.Event{Action: action, SubjectType: "battery", SubjectID: b.ID.String(), SubjectLabel: b.Serial,
		Actor: who, Before: before, After: batterySnap(b, false), Metadata: metadata}
	if metadata == nil && note != "" {
		ev.Metadata = events.Map{"note": note}
	}
	if who != nil {
		sev := events.Info
		if danger {
			sev = events.Warning
		}
		ev.Notify = []events.NotifySpec{{UserID: who.ID, Title: "Battery " + b.Serial,
			Body: truncate(firstOf(note, action), 200), Source: "Batteries", Severity: sev,
			LinkPath: "/batteries/" + b.ID.String(), TemplateCode: action, DedupeKey: action + ":" + b.ID.String()}}
	}
	return events.Emit(ctx, q, ev)
}

// emitService is BatteryService._emit: notifies only on danger.
func emitService(ctx context.Context, q *db.Queries, who *events.Actor, b db.MobilityBattery, before events.Map,
	action, note string) error {
	ev := events.Event{Action: action, SubjectType: "battery", SubjectID: b.ID.String(), SubjectLabel: b.Serial,
		Actor: who, Before: before, After: batterySnap(b, true)}
	if note != "" {
		ev.Metadata = events.Map{"note": note}
	}
	return events.Emit(ctx, q, ev)
}

func truncate(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n])
}

// custodyTx locks the battery and runs fn with the acting user.
func (h *BatteryHandler) custodyTx(ctx context.Context, id uuid.UUID,
	fn func(q *db.Queries, b db.MobilityBattery, who *events.Actor) error) error {
	return database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		b, err := q.BatteryForUpdate(ctx, id)
		if err != nil {
			return err
		}
		who, err := actor.FromRequest(ctx, q)
		if err != nil {
			return err
		}
		return fn(q, b, who)
	})
}

func actorID(who *events.Actor) *uuid.UUID {
	if who == nil {
		return nil
	}
	return &who.ID
}

func hubOrErr(ctx context.Context, q *db.Queries, id *uuid.UUID) error {
	ok, err := q.HubExists(ctx, *id)
	if err == nil && !ok {
		err = apperr.New("NOT_FOUND", "Hub not found.")
	}
	return err
}

// transfer is transfer_battery.
func (h *BatteryHandler) transferTx(ctx context.Context, id uuid.UUID, dest string, hub *uuid.UUID, note string) error {
	return h.custodyTx(ctx, id, func(q *db.Queries, b db.MobilityBattery, who *events.Actor) error {
		if err := assertTransition(b.Status, transferFrom, "transfer"); err != nil {
			return err
		}
		before := batterySnap(b, false)
		fromType, fromID := b.CustodianType, b.CustodianID
		if err := q.ClearSlotOfBattery(ctx, &b.ID); err != nil {
			return err
		}
		dest = strings.ToLower(strings.TrimSpace(dest))
		switch dest {
		case "hub", "workshop":
			if hub == nil {
				return apperr.New("VALIDATION_ERROR", "hub_id required for "+dest+" transfer.")
			}
			if err := hubOrErr(ctx, q, hub); err != nil {
				return err
			}
			if dest == "hub" {
				custodian(&b, "TRANSIT", hub, hub, false)
				if b.Status != "FAULTED" && b.Status != "CHARGING" && b.Status != "AVAILABLE" {
					b.Status = "AVAILABLE"
				}
			} else {
				custodian(&b, "WORKSHOP", hub, hub, false)
				b.Status = "FAULTED"
			}
		case "transit":
			if hub != nil {
				if err := hubOrErr(ctx, q, hub); err != nil {
					return err
				}
			}
			custodian(&b, "TRANSIT", hub, hub, hub == nil)
			b.Status = "UNAVAILABLE"
		default:
			return apperr.New("VALIDATION_ERROR", "destination must be hub, workshop, or transit.")
		}
		if err := saveBattery(ctx, q, b); err != nil {
			return err
		}
		meta := map[string]any{"destination": dest, "note": note}
		if err := recordBatteryEvent(ctx, q, b, custodyEvent{Event: "TRANSFERRED", Actor: actorID(who),
			Hub: b.CurrentHubID, FromSet: true, FromType: fromType, FromID: fromID, ToType: b.CustodianType,
			ToID: b.CustodianID, Meta: meta}); err != nil {
			return err
		}
		return emitAction(ctx, q, who, b, before, "battery.transferred", firstOf(note, dest), false,
			events.Map{"destination": dest, "note": note})
	})
}

// faultTx is fault_battery.
func (h *BatteryHandler) faultTx(ctx context.Context, id uuid.UUID, note string) error {
	return h.custodyTx(ctx, id, func(q *db.Queries, b db.MobilityBattery, who *events.Actor) error {
		if err := assertTransition(b.Status, faultFrom, "fault"); err != nil {
			return err
		}
		before := batterySnap(b, false)
		fromType, fromID := b.CustodianType, b.CustodianID
		b.Status = "FAULTED"
		if b.CurrentHubID != nil {
			custodian(&b, "WORKSHOP", b.CurrentHubID, b.CurrentHubID, false)
		}
		if err := saveBattery(ctx, q, b); err != nil {
			return err
		}
		if err := recordBatteryEvent(ctx, q, b, custodyEvent{Event: "FAULT", Actor: actorID(who), FromSet: true,
			FromType: fromType, FromID: fromID, ToType: b.CustodianType, ToID: b.CustodianID,
			Meta: map[string]any{"note": note}}); err != nil {
			return err
		}
		return emitAction(ctx, q, who, b, before, "battery.faulted", note, true, nil)
	})
}

// foundTx is found_battery.
func (h *BatteryHandler) foundTx(ctx context.Context, id uuid.UUID, note string) error {
	return h.custodyTx(ctx, id, func(q *db.Queries, b db.MobilityBattery, who *events.Actor) error {
		if err := assertTransition(b.Status, foundFrom, "found"); err != nil {
			return err
		}
		before := batterySnap(b, false)
		b.Status = "AVAILABLE"
		if err := saveBattery(ctx, q, b); err != nil {
			return err
		}
		if err := recordBatteryEvent(ctx, q, b, custodyEvent{Event: "FOUND", Actor: actorID(who),
			ToType: b.CustodianType, ToID: b.CustodianID, Meta: map[string]any{"note": note}}); err != nil {
			return err
		}
		return emitAction(ctx, q, who, b, before, "battery.found", note, false, nil)
	})
}

// lostTx is mark_lost_battery.
func (h *BatteryHandler) lostTx(ctx context.Context, id uuid.UUID, note string) error {
	return h.custodyTx(ctx, id, func(q *db.Queries, b db.MobilityBattery, who *events.Actor) error {
		if b.Status == "RETIRED" {
			return apperr.Conflict("INVALID_TRANSITION", "Retired batteries cannot be marked lost.")
		}
		if b.Status == "LOST" {
			return nil
		}
		return h.toTerminal(ctx, q, b, who, "LOST", "battery.lost", note, false)
	})
}

// retireTx is retire_battery.
func (h *BatteryHandler) retireTx(ctx context.Context, id uuid.UUID, note string) error {
	return h.custodyTx(ctx, id, func(q *db.Queries, b db.MobilityBattery, who *events.Actor) error {
		if err := assertTransition(b.Status, retireFrom, "retire"); err != nil {
			return err
		}
		return h.toTerminal(ctx, q, b, who, "RETIRED", "battery.retired", note, true)
	})
}

// toTerminal empties the slot and custody for LOST / RETIRED.
func (h *BatteryHandler) toTerminal(ctx context.Context, q *db.Queries, b db.MobilityBattery, who *events.Actor,
	status, action, note string, retire bool) error {
	before := batterySnap(b, false)
	fromType, fromID := b.CustodianType, b.CustodianID
	if err := q.ClearSlotOfBattery(ctx, &b.ID); err != nil {
		return err
	}
	b.Status = status
	custodian(&b, "NONE", nil, nil, true)
	if retire {
		b.IssuedAt, b.ExpectedReturnBy = nil, nil
	}
	if err := saveBattery(ctx, q, b); err != nil {
		return err
	}
	event := status
	if err := recordBatteryEvent(ctx, q, b, custodyEvent{Event: event, Actor: actorID(who), FromSet: true,
		FromType: fromType, FromID: fromID, ToType: "NONE", Meta: map[string]any{"note": note}}); err != nil {
		return err
	}
	return emitAction(ctx, q, who, b, before, action, note, true, nil)
}

// adminStatusTx is BatteryService._admin_status (CHARGING / AVAILABLE / UNAVAILABLE).
func (h *BatteryHandler) adminStatusTx(ctx context.Context, id uuid.UUID, status, note string) error {
	return h.custodyTx(ctx, id, func(q *db.Queries, b db.MobilityBattery, who *events.Actor) error {
		if swapOnly[b.Status] || b.Status == "RETIRED" {
			return apperr.Conflict("CONFLICT", "Cannot set "+status+" from "+b.Status+".")
		}
		before := batterySnap(b, true)
		if status == "UNAVAILABLE" {
			if err := q.ClearSlotOfBattery(ctx, &b.ID); err != nil {
				return err
			}
		}
		b.Status = status
		if err := saveBattery(ctx, q, b); err != nil {
			return err
		}
		if err := recordBatteryEvent(ctx, q, b, custodyEvent{Event: "TRIAGED", Actor: actorID(who),
			Meta: map[string]any{"status": status, "note": note}}); err != nil {
			return err
		}
		return emitService(ctx, q, who, b, before, "battery.status_changed", status)
	})
}

// setStatus is BatteryService.set_status: routes the legacy status endpoint
// to the custody verbs.
func (h *BatteryHandler) setStatus(ctx context.Context, b db.BatteryRowsRow, status, note string,
	hub *uuid.UUID, hubProvided bool) error {
	target := strings.ToUpper(strings.TrimSpace(status))
	switch {
	case hubProvided && hub != nil:
		return h.transferTx(ctx, b.ID, "hub", hub, note)
	case target == "FAULTED":
		return h.faultTx(ctx, b.ID, note)
	case target == "RETIRED":
		return h.retireTx(ctx, b.ID, note)
	case target == "LOST":
		return h.lostTx(ctx, b.ID, note)
	case target == "AVAILABLE" && (b.Status == "LOST" || b.Status == "FAULTED"):
		return h.foundTx(ctx, b.ID, note)
	case swapOnly[target]:
		return apperr.New("FORBIDDEN", target+" is set only by the swap engine.").WithStatus(403)
	case target == "CHARGING" || target == "AVAILABLE" || target == "UNAVAILABLE":
		return h.adminStatusTx(ctx, b.ID, target, note)
	}
	return apperr.New("VALIDATION_ERROR", "Unsupported status "+target+".")
}
