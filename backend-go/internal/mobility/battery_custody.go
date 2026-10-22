package mobility

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"strconv"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/canonjson"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

// Custody status sets (mobility.services.batteries.custody).
var (
	swapOnly     = set("ISSUED", "RESERVED")
	transferFrom = set("AVAILABLE", "CHARGING", "RETURNED", "UNAVAILABLE", "FAULTED")
	faultFrom    = set("AVAILABLE", "CHARGING", "RETURNED", "RESERVED", "UNAVAILABLE")
	foundFrom    = set("LOST", "FAULTED")
	retireFrom   = set("FAULTED", "AVAILABLE", "UNAVAILABLE", "LOST", "RETURNED")
)

func set(v ...string) map[string]bool {
	m := make(map[string]bool, len(v))
	for _, s := range v {
		m[s] = true
	}
	return m
}

// assertTransition is custody.assert_transition.
func assertTransition(status string, allowed map[string]bool, verb string) error {
	if status == "RETIRED" {
		return apperr.Conflict("INVALID_TRANSITION", "Retired batteries are terminal and cannot change custody.")
	}
	if !allowed[status] {
		return apperr.Conflict("INVALID_TRANSITION", "Cannot "+verb+" battery in status "+status+".")
	}
	return nil
}

// custodyEvent is record_battery_event's arguments. Empty FromType / nil
// FromID mean "the battery's current custodian".
type custodyEvent struct {
	Event            string
	Actor            *uuid.UUID
	Hub              *uuid.UUID // nil → the battery's current hub
	Swap             *uuid.UUID
	FromType, ToType string
	FromID, ToID     *uuid.UUID
	FromSet          bool // FromType/FromID given explicitly
	ChargePct        *int32
	Meta             map[string]any
	Source           string
}

// chainKey is the advisory lock key: int(sha256(str(id)).hexdigest()[:15], 16).
func chainKey(id uuid.UUID) int64 {
	sum := sha256.Sum256([]byte(id.String()))
	n, _ := strconv.ParseInt(hex.EncodeToString(sum[:])[:15], 16, 64)
	return n
}

func optID(id *uuid.UUID) any {
	if id == nil {
		return nil
	}
	return id.String()
}

// recordBatteryEvent appends to the battery's hash-chained custody trail,
// hashing the same canonical body Django does.
func recordBatteryEvent(ctx context.Context, q *db.Queries, b db.MobilityBattery, ev custodyEvent) error {
	if err := q.LockBatteryChain(ctx, chainKey(b.ID)); err != nil {
		return err
	}
	prev, err := q.BatteryChainTip(ctx, b.ID)
	if err != nil && !database.IsNoRows(err) {
		return err
	}
	fromType, fromID := b.CustodianType, b.CustodianID
	if ev.FromSet {
		fromType, fromID = ev.FromType, ev.FromID
	}
	charge := b.ChargePct
	if ev.ChargePct != nil {
		charge = *ev.ChargePct
	}
	meta := ev.Meta
	if meta == nil {
		meta = map[string]any{}
	}
	source := ev.Source
	if source == "" {
		source = "APP"
	}
	occurred := time.Now().UTC().Truncate(time.Microsecond) // what Postgres stores
	body := map[string]any{"battery_id": b.ID.String(), "event": ev.Event, "from_custodian_type": fromType,
		"from_custodian_id": optID(fromID), "to_custodian_type": ev.ToType, "to_custodian_id": optID(ev.ToID),
		"charge_pct": charge, "meta": meta, "prev_hash": prev, "occurred_at": jsontime.FormatISO(occurred),
		"source": source}
	canon, err := canonjson.Marshal(body)
	if err != nil {
		return err
	}
	sum := sha256.Sum256(canon)
	metaJSON, _ := json.Marshal(meta)
	hub := ev.Hub
	if hub == nil {
		hub = b.CurrentHubID
	}
	return q.InsertBatteryEvent(ctx, db.InsertBatteryEventParams{ID: ids.New(), Event: ev.Event,
		FromCustodianType: fromType, FromCustodianID: fromID, ToCustodianType: ev.ToType, ToCustodianID: ev.ToID,
		ChargePct: &charge, Meta: metaJSON, OccurredAt: occurred, Source: source, ActorID: ev.Actor,
		BatteryID: b.ID, HubID: hub, SwapID: ev.Swap, PrevHash: prev, RowHash: hex.EncodeToString(sum[:])})
}

// saveBattery is a full model.save() of the battery row.
func saveBattery(ctx context.Context, q *db.Queries, b db.MobilityBattery) error {
	return q.SaveBattery(ctx, db.SaveBatteryParams{ID: b.ID, Serial: b.Serial, Status: b.Status,
		ChargePct: b.ChargePct, HealthPct: b.HealthPct, CycleCount: b.CycleCount, BatteryTypeID: b.BatteryTypeID,
		CurrentHubID: b.CurrentHubID, CustodianID: b.CustodianID, CustodianType: b.CustodianType,
		ExpectedReturnBy: b.ExpectedReturnBy, IssuedAt: b.IssuedAt, QrSecret: b.QrSecret,
		ChargeSource: b.ChargeSource, ManufacturedAt: b.ManufacturedAt})
}

// custodian is apply_custodian; clearHub drops the hub, a nil hub keeps it.
func custodian(b *db.MobilityBattery, kind string, id *uuid.UUID, hub *uuid.UUID, clearHub bool) {
	b.CustodianType, b.CustodianID = kind, id
	if clearHub {
		b.CurrentHubID = nil
	} else if hub != nil {
		b.CurrentHubID = hub
	}
}
