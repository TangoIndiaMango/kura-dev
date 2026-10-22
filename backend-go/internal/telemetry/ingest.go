// Package telemetry ports mobility telemetry: the fleet summary, the event
// feed, staff ingest and device-key (IoT) batch ingest, all applied through
// apply_normalized_telemetry (event row + battery SoC + audit).
package telemetry

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
)

// Input is TelemetryService.ingest's data dict (already validated).
type Input struct {
	VehicleID                      uuid.UUID
	RecordedAt                     *time.Time
	BatteryPct                     *int64
	Lat, Lng, SpeedKmh, OdometerKm *float64
	Source                         string
	BatteryID                      *uuid.UUID
	IngestBatch                    string
	Raw                            map[string]any
	// Provider / Kind / BatterySerial are set by vendor adapters (mock IoT);
	// otherwise the provider follows Source and the kind follows BatteryPct.
	Provider, Kind, BatterySerial string
}

// Ingest is TelemetryService.ingest → apply_normalized_telemetry. Run it in
// the caller's transaction; it returns the new event id.
func Ingest(ctx context.Context, q *db.Queries, in Input, who *events.Actor) (uuid.UUID, error) {
	vehicle, err := q.VehicleByIDPlain(ctx, in.VehicleID)
	if database.IsNoRows(err) {
		return uuid.Nil, apperr.New("VALIDATION", "Unknown vehicle.")
	}
	if err != nil {
		return uuid.Nil, err
	}
	provider := in.Provider
	if provider == "" {
		provider = "IOT"
		if in.Source == "" || in.Source == "manual" {
			provider = "MANUAL"
		}
	}
	source, chargeSource := "iot", "TELEMETRY"
	switch provider {
	case "MANUAL":
		source, chargeSource = "manual", "MANUAL"
	case "BMS", "OCPP_BSS":
		chargeSource = "BMS"
	}
	kind := in.Kind
	if kind == "" {
		kind = "HEARTBEAT"
		if in.BatteryPct != nil {
			kind = "SOC_UPDATE"
		}
	}
	recorded := time.Now()
	if in.RecordedAt != nil {
		recorded = *in.RecordedAt
	}
	battery := vehicle.CurrentBatteryID
	if in.BatteryID == nil && strings.TrimSpace(in.BatterySerial) != "" {
		battery = nil
		if id, err := q.TelemetryBatteryBySerial(ctx, strings.TrimSpace(in.BatterySerial)); err == nil {
			battery = &id
		} else if !database.IsNoRows(err) {
			return uuid.Nil, err
		}
	}
	if in.BatteryID != nil {
		battery = nil
		ok, err := q.TelemetryBatteryExists(ctx, *in.BatteryID)
		if err != nil {
			return uuid.Nil, err
		}
		if ok {
			battery = in.BatteryID
		}
	}
	raw := map[string]any{}
	for k, v := range in.Raw {
		raw[k] = v
	}
	raw["provider"], raw["event_kind"], raw["range_km"], raw["soh_pct"] = provider, kind, nil, nil
	rawJSON, _ := json.Marshal(raw)
	var pct *int16
	if in.BatteryPct != nil {
		p := int16(*in.BatteryPct)
		pct = &p
	}
	id := ids.New()
	if err := q.InsertTelemetryEvent(ctx, db.InsertTelemetryEventParams{ID: id, RecordedAt: recorded, BatteryPct: pct,
		Lat: in.Lat, Lng: in.Lng, SpeedKmh: in.SpeedKmh, OdometerKm: in.OdometerKm, Source: source,
		IngestBatch: strings.TrimSpace(in.IngestBatch), Raw: rawJSON, BatteryID: battery, VehicleID: vehicle.ID}); err != nil {
		return uuid.Nil, err
	}
	if battery != nil && pct != nil {
		c := max(0, min(100, int32(*pct)))
		if err := q.ObserveBatteryCharge(ctx, db.ObserveBatteryChargeParams{ID: *battery, ChargePct: c,
			ChargeSource: chargeSource, ChargeObservedAt: &recorded}); err != nil {
			return uuid.Nil, err
		}
	}
	var batteryOut any
	if battery != nil {
		batteryOut = battery.String()
	}
	var pctOut any
	if pct != nil {
		pctOut = *pct
	}
	return id, events.Emit(ctx, q, events.Event{Action: "telemetry.ingested", SubjectType: "telemetry_event",
		SubjectID: id.String(), SubjectLabel: vehicle.RegistrationPlate, Actor: who,
		After: events.Map{"vehicle_id": vehicle.ID.String(), "provider": provider, "battery_pct": pctOut,
			"battery_id": batteryOut, "event_kind": kind}})
}
