package mobility

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/risk"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/scope"
)

// Charging at the hub. Readings come from staff today (MANUAL) and from a
// charger / BMS later (BMS) — both go through applyCharge, so the battery and
// its bay always change together.

// ReadyChargePct: a pack at or above this is released for swaps on its own.
const ReadyChargePct = 95

// Charge sources.
const (
	ChargeManual = "MANUAL"
	ChargeBMS    = "BMS"
)

// slotStateFor is the bay state a battery's status implies ("" = leave the bay).
func slotStateFor(b db.MobilityBattery) string {
	if b.CustodianType != "HUB_SLOT" {
		return ""
	}
	switch b.Status {
	case "AVAILABLE", "RESERVED":
		return "READY"
	case "CHARGING", "RETURNED":
		return "CHARGING"
	case "FAULTED":
		return "FAULT"
	}
	return ""
}

// syncSlot keeps the bay in step with the battery: same state, or emptied
// when the pack is no longer in a bay. Call after every status/custody change.
func syncSlot(ctx context.Context, q *db.Queries, b db.MobilityBattery) error {
	if state := slotStateFor(b); state != "" {
		return q.SetSlotStateForBattery(ctx, db.SetSlotStateForBatteryParams{BatteryID: &b.ID, State: state})
	}
	return q.ClearSlotOfBattery(ctx, &b.ID)
}

// chargeIn is one charge reading.
type chargeIn struct {
	Pct     int32
	Release bool   // release for swaps below ReadyChargePct (needs a note)
	Note    string // why, when releasing early
	Source  string // MANUAL | BMS
}

// applyCharge records a reading on a pack in a bay and moves it between
// CHARGING and AVAILABLE. Reserved packs only get the reading.
func applyCharge(ctx context.Context, q *db.Queries, b db.MobilityBattery, in chargeIn, who *events.Actor) error {
	if b.CustodianType != "HUB_SLOT" {
		return apperr.Conflict("NOT_IN_BAY", b.Serial+" isn't in a bay. Receive it into a bay first.")
	}
	switch b.Status {
	case "CHARGING", "AVAILABLE", "RESERVED", "RETURNED":
	default:
		return apperr.Conflict("INVALID_TRANSITION", "Can't record a charge for "+b.Serial+" while it is "+
			strings.ToLower(b.Status)+".")
	}
	if in.Pct < 0 || in.Pct > 100 {
		return apperr.Field("charge_pct", "Enter a charge between 0 and 100%.")
	}
	early := in.Release && in.Pct < ReadyChargePct
	if early && strings.TrimSpace(in.Note) == "" {
		return apperr.Field("note", "Say why this pack is released below "+fmt.Sprint(ReadyChargePct)+"%.")
	}
	before := batterySnap(b, false)
	prevPct, prevAt, prevStatus := b.ChargePct, b.ChargeObservedAt, b.Status
	now := time.Now()
	b.ChargePct, b.ChargeSource, b.ChargeObservedAt = in.Pct, in.Source, &now
	event := "CHARGE_READING"
	if b.Status != "RESERVED" {
		switch {
		case in.Pct >= ReadyChargePct || early:
			b.Status, event = "AVAILABLE", "READY"
		default:
			b.Status = "CHARGING"
			if prevStatus != "CHARGING" {
				event = "CHARGE_STARTED"
			}
		}
		if b.Status == prevStatus && event != "CHARGE_STARTED" {
			event = "CHARGE_READING"
		}
	}
	if err := saveBattery(ctx, q, b); err != nil {
		return err
	}
	if err := syncSlot(ctx, q, b); err != nil {
		return err
	}
	meta := map[string]any{"from_pct": prevPct, "to_pct": in.Pct, "released_early": early}
	if in.Note != "" {
		meta["note"] = truncate(in.Note, 300)
	}
	if err := recordBatteryEvent(ctx, q, b, custodyEvent{Event: event, Actor: actorID(who), Source: sourceTag(in.Source),
		ToType: b.CustodianType, ToID: b.CustodianID, ChargePct: &in.Pct, Meta: meta}); err != nil {
		return err
	}
	if in.Source == ChargeManual {
		if err := flagImplausible(ctx, q, b, prevPct, prevAt, in.Pct, now, who); err != nil {
			return err
		}
	}
	if b.Status == prevStatus && !early {
		return nil // a reading only: the custody trail has it, no feed noise
	}
	action := map[string]string{"READY": "battery.ready", "CHARGE_STARTED": "battery.charging"}[event]
	if early {
		action = "battery.released_early"
	}
	return emitAction(ctx, q, who, b, before, action, firstOf(in.Note, fmt.Sprintf("%d%% charge", in.Pct)), early,
		events.Map{"charge_pct": in.Pct, "released_early": early, "source": in.Source})
}

func sourceTag(src string) string {
	if src == ChargeBMS {
		return "SYSTEM"
	}
	return "HUB_APP"
}

// flagImplausible accepts the reading but opens a risk event when it climbed
// faster than a pack can charge (CHARGE_IMPLAUSIBLE; off when the rule is off).
func flagImplausible(ctx context.Context, q *db.Queries, b db.MobilityBattery, prevPct int32, prevAt *time.Time,
	pct int32, now time.Time, who *events.Actor) error {
	if prevAt == nil || pct <= prevPct {
		return nil
	}
	params, err := risk.EnabledParams(ctx, q, "CHARGE_IMPLAUSIBLE", map[string]float64{"MAX_GAIN_PCT_PER_HOUR": 60,
		"GRACE_PCT": 10})
	if params == nil || err != nil {
		return err
	}
	hours := now.Sub(*prevAt).Hours()
	allowed := params["MAX_GAIN_PCT_PER_HOUR"]*hours + params["GRACE_PCT"]
	if float64(pct-prevPct) <= allowed {
		return nil
	}
	ctxMap := map[string]any{"serial": b.Serial, "from_pct": prevPct, "to_pct": pct,
		"minutes": int(now.Sub(*prevAt).Minutes()), "hub_id": optID(b.CurrentHubID)}
	if who != nil {
		ctxMap["agent_id"] = who.ID.String()
	}
	if _, err := risk.Emit(ctx, q, risk.Event{RuleCode: "CHARGE_IMPLAUSIBLE", SubjectType: "battery",
		SubjectID: b.ID.String(), Context: ctxMap}); err != nil {
		slog.WarnContext(ctx, "charge_flag_failed", "battery", b.Serial, "err", err)
	}
	return nil
}

// hubAllowed: staff act only at hubs they cover (managers: every hub).
func hubAllowed(ctx context.Context, q *db.Queries, hub uuid.UUID) error {
	hs, err := scope.HubsFor(ctx, q, reqctx.User(ctx))
	if err != nil {
		return err
	}
	if hs.All || contains(hs.IDs, hub) {
		return nil
	}
	return apperr.NotFound("Hub not found.")
}

// receiveIn puts a pack that arrived at a hub (new, transferred, back from
// the workshop) into a bay.
type receiveIn struct {
	Hub    *uuid.UUID // default: the pack's current hub
	SlotNo *int32     // default: the first empty bay
	Pct    int32
	Note   string
}

func (h *BatteryHandler) receiveTx(ctx context.Context, id uuid.UUID, in receiveIn) error {
	return h.custodyTx(ctx, id, func(q *db.Queries, b db.MobilityBattery, who *events.Actor) error {
		if b.CustodianType == "HUB_SLOT" {
			return apperr.Conflict("ALREADY_IN_BAY", b.Serial+" is already in a bay.")
		}
		switch b.Status {
		case "AVAILABLE", "CHARGING", "RETURNED", "UNAVAILABLE":
		case "FAULTED":
			return apperr.Conflict("INVALID_TRANSITION", b.Serial+" is faulted. Mark it repaired (found) before it goes into a bay.")
		default:
			return apperr.Conflict("INVALID_TRANSITION", "Can't put "+b.Serial+" in a bay while it is "+
				strings.ToLower(b.Status)+".")
		}
		hub := firstID(in.Hub, b.CurrentHubID)
		if hub == nil {
			return apperr.Field("hub_id", "Pick the hub this pack is at.")
		}
		if err := hubAllowed(ctx, q, *hub); err != nil {
			return err
		}
		slot, err := pickBay(ctx, q, *hub, in.SlotNo)
		if err != nil {
			return err
		}
		before := batterySnap(b, false)
		fromType, fromID := b.CustodianType, b.CustodianID
		custodian(&b, "HUB_SLOT", &slot.ID, hub, false)
		// Placed as CHARGING; the reading then decides READY or CHARGING.
		b.Status = "CHARGING"
		if err := saveBattery(ctx, q, b); err != nil {
			return err
		}
		if err := q.SetSlot(ctx, db.SetSlotParams{ID: slot.ID, BatteryID: &b.ID, State: "CHARGING"}); err != nil {
			return err
		}
		if err := recordBatteryEvent(ctx, q, b, custodyEvent{Event: "SLOTTED", Actor: actorID(who), Hub: hub,
			FromSet: true, FromType: fromType, FromID: fromID, ToType: "HUB_SLOT", ToID: &slot.ID, Source: "HUB_APP",
			Meta: map[string]any{"bay": slot.SlotNo, "note": in.Note}}); err != nil {
			return err
		}
		if err := emitAction(ctx, q, who, b, before, "battery.received",
			fmt.Sprintf("Into bay %d", slot.SlotNo), false, events.Map{"bay": slot.SlotNo, "note": in.Note}); err != nil {
			return err
		}
		return applyCharge(ctx, q, b, chargeIn{Pct: in.Pct, Source: ChargeManual}, who)
	})
}

// pickBay locks the requested bay (must be empty) or the first empty one.
func pickBay(ctx context.Context, q *db.Queries, hub uuid.UUID, no *int32) (db.MobilityHubslot, error) {
	if no != nil {
		s, err := q.HubSlotByNoForUpdate(ctx, db.HubSlotByNoForUpdateParams{HubID: hub, SlotNo: *no})
		if database.IsNoRows(err) {
			return s, apperr.Field("slot_no", fmt.Sprintf("This hub has no bay %d.", *no))
		}
		if err == nil && s.BatteryID != nil {
			return s, apperr.Conflict("BAY_TAKEN", fmt.Sprintf("Bay %d already has a pack.", *no))
		}
		return s, err
	}
	s, err := q.FreeSlotForUpdate(ctx, hub)
	if database.IsNoRows(err) {
		return s, apperr.Conflict("NO_FREE_BAY", "Every bay at this hub has a pack. Free a bay first.")
	}
	return s, err
}

func firstID(ids ...*uuid.UUID) *uuid.UUID {
	for _, id := range ids {
		if id != nil {
			return id
		}
	}
	return nil
}

// adminStatusTx is BatteryService._admin_status (CHARGING / AVAILABLE / UNAVAILABLE).
func (h *BatteryHandler) adminStatusTx(ctx context.Context, id uuid.UUID, status, note string) error {
	return h.custodyTx(ctx, id, func(q *db.Queries, b db.MobilityBattery, who *events.Actor) error {
		if swapOnly[b.Status] || b.Status == "RETIRED" {
			return apperr.Conflict("CONFLICT", "Cannot set "+status+" from "+b.Status+".")
		}
		// Releasing a pack in a bay below the ready charge is allowed, with a reason.
		if status == "AVAILABLE" && b.CustodianType == "HUB_SLOT" && b.ChargePct < ReadyChargePct &&
			strings.TrimSpace(note) == "" {
			return apperr.Field("note", "This pack is below the ready charge; say why it's released for swaps.")
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
		if err := syncSlot(ctx, q, b); err != nil {
			return err
		}
		if err := recordBatteryEvent(ctx, q, b, custodyEvent{Event: "TRIAGED", Actor: actorID(who),
			Meta: map[string]any{"status": status, "note": note}}); err != nil {
			return err
		}
		return emitService(ctx, q, who, b, before, "battery.status_changed", status)
	})
}
