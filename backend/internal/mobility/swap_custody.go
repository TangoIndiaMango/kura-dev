package mobility

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
)

// bayCtx is who/where for custody writes.
type bayCtx struct {
	hub     uuid.UUID
	vehicle uuid.UUID
	swap    uuid.UUID
	agent   *uuid.UUID
}

// slotOrTransit puts a pack in the hub's first empty slot (state), else in
// TRANSIT at the hub — apply_custodian + slot write.
func slotOrTransit(ctx context.Context, q *db.Queries, b *db.MobilityBattery, hub uuid.UUID, state string) error {
	slot, err := q.EmptySlot(ctx, hub)
	if err == nil {
		if err := q.SetSlot(ctx, db.SetSlotParams{ID: slot.ID, BatteryID: &b.ID, State: state}); err != nil {
			return err
		}
		custodian(b, "HUB_SLOT", &slot.ID, &hub, false)
		return nil
	}
	if !database.IsNoRows(err) {
		return err
	}
	custodian(b, "TRANSIT", &hub, &hub, false)
	return nil
}

// returnCustody is apply_return_custody.
func returnCustody(ctx context.Context, q *db.Queries, at bayCtx, v *db.MobilityVehicle, b db.MobilityBattery,
	charge int32, mismatch bool) error {
	fromType, fromID := b.CustodianType, b.CustodianID
	if _, err := q.BatterySlot(ctx, &b.ID); err == nil {
		return apperr.Conflict("BATTERY_ALREADY_SLOTTED", "Returned battery "+b.Serial+" is already in a hub slot.")
	} else if !database.IsNoRows(err) {
		return err
	}
	now := time.Now()
	b.Status, b.ChargePct, b.ChargeSource, b.ChargeObservedAt = "CHARGING", charge, "MANUAL", &now
	b.CycleCount++
	b.IssuedAt, b.ExpectedReturnBy = nil, nil
	if err := slotOrTransit(ctx, q, &b, at.hub, "CHARGING"); err != nil {
		return err
	}
	if err := saveBattery(ctx, q, b); err != nil {
		return err
	}
	if v.CurrentBatteryID != nil && *v.CurrentBatteryID == b.ID {
		v.CurrentBatteryID = nil
		if err := q.SetVehicleBattery(ctx, db.SetVehicleBatteryParams{ID: v.ID}); err != nil {
			return err
		}
	}
	return recordBatteryEvent(ctx, q, b, custodyEvent{Event: "RETURNED", Actor: at.agent, Hub: &at.hub, Swap: &at.swap,
		FromSet: true, FromType: fromType, FromID: fromID, ToType: b.CustodianType, ToID: b.CustodianID,
		ChargePct: &charge, Meta: map[string]any{"mismatch": mismatch}, Source: "HUB_APP"})
}

// issueCustody is apply_issue_custody (the pack moves onto the vehicle).
func issueCustody(ctx context.Context, q *db.Queries, at bayCtx, v *db.MobilityVehicle, b db.MobilityBattery,
	charge int32, first bool) error {
	fromType, fromID := b.CustodianType, b.CustodianID
	now := time.Now()
	due := now.Add(48 * time.Hour)
	b.Status, b.ChargePct, b.ChargeSource, b.ChargeObservedAt = "ISSUED", charge, "MANUAL", &now
	b.IssuedAt, b.ExpectedReturnBy = &now, &due
	if slot, err := q.BatterySlot(ctx, &b.ID); err == nil {
		if err := q.SetSlot(ctx, db.SetSlotParams{ID: slot.ID, State: "EMPTY"}); err != nil {
			return err
		}
	} else if !database.IsNoRows(err) {
		return err
	}
	custodian(&b, "VEHICLE", &v.ID, nil, true)
	if err := saveBattery(ctx, q, b); err != nil {
		return err
	}
	v.CurrentBatteryID = &b.ID
	if err := q.SetVehicleBattery(ctx, db.SetVehicleBatteryParams{ID: v.ID, CurrentBatteryID: &b.ID}); err != nil {
		return err
	}
	if err := q.TouchHubSync(ctx, at.hub); err != nil {
		return err
	}
	meta := map[string]any{}
	if first {
		meta["first_swap"] = true
	}
	return recordBatteryEvent(ctx, q, b, custodyEvent{Event: "ISSUED", Actor: at.agent, Hub: &at.hub, Swap: &at.swap,
		FromSet: true, FromType: fromType, FromID: fromID, ToType: "VEHICLE", ToID: &v.ID, ChargePct: &charge,
		Meta: meta, Source: "HUB_APP"})
}

// rollbackIssue is rollback_issue_custody: the issued pack goes back into a
// slot (READY) or transit; the vehicle mount is cleared.
func rollbackIssue(ctx context.Context, q *db.Queries, at bayCtx, v *db.MobilityVehicle, id uuid.UUID) error {
	b, err := q.BatteryForUpdate(ctx, id)
	if err != nil {
		return err
	}
	fromType, fromID := b.CustodianType, b.CustodianID
	b.Status, b.IssuedAt, b.ExpectedReturnBy = "AVAILABLE", nil, nil
	if err := slotOrTransit(ctx, q, &b, at.hub, "READY"); err != nil {
		return err
	}
	if err := saveBattery(ctx, q, b); err != nil {
		return err
	}
	if v.CurrentBatteryID != nil && *v.CurrentBatteryID == b.ID {
		v.CurrentBatteryID = nil
		if err := q.SetVehicleBattery(ctx, db.SetVehicleBatteryParams{ID: v.ID}); err != nil {
			return err
		}
	}
	return recordBatteryEvent(ctx, q, b, custodyEvent{Event: "SLOTTED", Actor: at.agent, Hub: &at.hub, Swap: &at.swap,
		FromSet: true, FromType: fromType, FromID: fromID, ToType: b.CustodianType, ToID: b.CustodianID,
		ChargePct: i32ptr(b.ChargePct), Meta: map[string]any{"abort": true}, Source: "HUB_APP"})
}

// remountReturned is reverse._remount_returned: the returned pack goes back
// onto the vehicle.
func remountReturned(ctx context.Context, q *db.Queries, at bayCtx, v *db.MobilityVehicle, id uuid.UUID) error {
	b, err := q.BatteryForUpdate(ctx, id)
	if err != nil {
		return err
	}
	fromType, fromID := b.CustodianType, b.CustodianID
	if slot, err := q.SlotAtHubWithBattery(ctx, db.SlotAtHubWithBatteryParams{HubID: at.hub, BatteryID: &b.ID}); err == nil {
		if err := q.SetSlot(ctx, db.SetSlotParams{ID: slot.ID, State: "EMPTY"}); err != nil {
			return err
		}
	} else if !database.IsNoRows(err) {
		return err
	}
	b.Status = "ISSUED"
	custodian(&b, "VEHICLE", &v.ID, nil, true)
	if err := saveBattery(ctx, q, b); err != nil {
		return err
	}
	v.CurrentBatteryID = &b.ID
	if err := q.SetVehicleBattery(ctx, db.SetVehicleBatteryParams{ID: v.ID, CurrentBatteryID: &b.ID}); err != nil {
		return err
	}
	return recordBatteryEvent(ctx, q, b, custodyEvent{Event: "ISSUED", Actor: at.agent, Hub: &at.hub, Swap: &at.swap,
		FromSet: true, FromType: fromType, FromID: fromID, ToType: "VEHICLE", ToID: &v.ID, ChargePct: i32ptr(b.ChargePct),
		Meta: map[string]any{"reverse": true}, Source: "SYSTEM"})
}
