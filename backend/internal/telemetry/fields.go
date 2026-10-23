package telemetry

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
)

// eventFields are the per-reading fields shared by both ingest serializers.
type eventFields struct {
	RecordedAt  *decode.DateTime `json:"recorded_at"`
	BatteryPct  *int64           `json:"battery_pct" validate:"omitempty,min=0,max=100"`
	Lat         *float64         `json:"lat"`
	Lng         *float64         `json:"lng"`
	SpeedKmh    *float64         `json:"speed_kmh"`
	OdometerKm  *float64         `json:"odometer_km"`
	BatteryID   *uuid.UUID       `json:"battery_id"`
	VehicleID   *uuid.UUID       `json:"vehicle_id" validate:"omitempty"`
	Source      *string          `json:"source"`
	IngestBatch *string          `json:"ingest_batch" validate:"omitempty,max=64"`
	HardwareID  *string          `json:"hardware_id" validate:"omitempty,max=64"`
	Raw         map[string]any   `json:"-"`
}

func (f eventFields) input() Input {
	in := Input{BatteryPct: f.BatteryPct, Lat: f.Lat, Lng: f.Lng, SpeedKmh: f.SpeedKmh, OdometerKm: f.OdometerKm,
		BatteryID: f.BatteryID, Raw: f.Raw}
	if f.RecordedAt != nil {
		t := f.RecordedAt.Time
		in.RecordedAt = &t
	}
	return in
}

func isNull(raw json.RawMessage) bool { return bytes.Equal(bytes.TrimSpace(raw), []byte("null")) }

// parseObject decodes one serializer's worth of fields. known lists the
// fields this serializer declares (others are ignored, like DRF); notNull
// are the declared fields without allow_null. Returns DRF-shaped details.
func parseObject(raw []byte, known, notNull []string) (eventFields, map[string]json.RawMessage, apperr.Details) {
	var f eventFields
	errs := apperr.Details{}
	var obj map[string]json.RawMessage
	_ = json.Unmarshal(raw, &obj)
	filtered := map[string]json.RawMessage{}
	for _, k := range known {
		if v, ok := obj[k]; ok {
			filtered[k] = v
		}
	}
	body, _ := json.Marshal(filtered)
	if obj == nil {
		body = raw
	}
	var verr *apperr.Error
	if err := decode.Bytes(body, &f); errors.As(err, &verr) {
		for k, v := range verr.Details {
			errs[k] = v
		}
		if obj == nil {
			return f, nil, errs
		}
	}
	for _, k := range notNull {
		if v, ok := filtered[k]; ok && isNull(v) {
			errs[k] = []string{"This field may not be null."}
		}
	}
	if v, ok := filtered["raw"]; ok && !isNull(v) {
		var val any
		_ = json.Unmarshal(v, &val)
		if m, isMap := val.(map[string]any); isMap {
			f.Raw = m
		} else {
			errs["raw"] = []string{fmt.Sprintf("Expected a dictionary of items but got type \"%s\".", pyType(val, v))}
		}
	}
	if f.Source != nil && *f.Source != "iot" && *f.Source != "manual" {
		errs["source"] = []string{fmt.Sprintf("\"%s\" is not a valid choice.", *f.Source)}
	}
	return f, filtered, errs
}

// pyType is Python's type name for a JSON value (raw tells int from float).
func pyType(v any, raw json.RawMessage) string {
	switch v.(type) {
	case string:
		return "str"
	case float64:
		if !bytes.ContainsAny(raw, ".eE") {
			return "int"
		}
		return "float"
	case bool:
		return "bool"
	case []any:
		return "list"
	}
	return "NoneType"
}
