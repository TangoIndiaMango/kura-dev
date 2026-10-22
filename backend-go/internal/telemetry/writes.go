package telemetry

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
)

var (
	readingFields = []string{"recorded_at", "battery_pct", "lat", "lng", "speed_kmh", "odometer_km", "battery_id", "raw"}
	readingStrict = []string{"recorded_at", "battery_pct", "raw"}
)

func readBody(r *http.Request) ([]byte, error) {
	raw, err := io.ReadAll(http.MaxBytesReader(nil, r.Body, 1<<20))
	if err != nil {
		return nil, apperr.Field("non_field_errors", "Invalid request body.")
	}
	if strings.TrimSpace(string(raw)) == "" {
		raw = []byte("{}")
	}
	return raw, nil
}

// ingest is TelemetryEventViewSet.ingest (TelemetryIngestSerializer).
func (h handler) ingest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	raw, err := readBody(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	known := append([]string{"vehicle_id", "source", "ingest_batch"}, readingFields...)
	f, obj, errs := parseObject(raw, known, append([]string{"vehicle_id", "source", "ingest_batch"}, readingStrict...))
	if obj != nil {
		if _, ok := obj["vehicle_id"]; !ok {
			errs["vehicle_id"] = []string{"This field is required."}
		}
	}
	if len(errs) > 0 {
		respond.Error(w, r, apperr.Validation(errs))
		return
	}
	in := f.input()
	in.VehicleID = *f.VehicleID
	if f.Source != nil {
		in.Source = *f.Source
	}
	if f.IngestBatch != nil {
		in.IngestBatch = *f.IngestBatch
	}
	var id uuid.UUID
	err = database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		who, err := actor.FromRequest(ctx, q)
		if err == nil {
			id, err = Ingest(ctx, q, in, who)
		}
		return err
	})
	var out []EventDTO
	if err == nil {
		out, err = h.rows(r, []uuid.UUID{id})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.JSON(w, http.StatusCreated, out[0])
}

// deviceIngest is TelemetryDeviceIngestView → TelemetryIotService.ingest_batch:
// X-Kura-Device-Key (sha256 at rest) picks the vehicle; one reading or an
// events batch (max 100), all in one transaction.
func (h handler) deviceIngest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	raw, err := readBody(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	known := append([]string{"hardware_id", "ingest_batch"}, readingFields...)
	top, obj, errs := parseObject(raw, known, append([]string{"hardware_id", "ingest_batch"}, readingStrict...))
	var items []eventFields
	evRaw, hasEvents := []byte(nil), false
	if obj != nil {
		var whole map[string]json.RawMessage
		_ = json.Unmarshal(raw, &whole)
		if v, ok := whole["events"]; ok {
			evRaw, hasEvents = v, true
		}
	}
	if hasEvents {
		var list []json.RawMessage
		switch {
		case isNull(evRaw):
			errs["events"] = []string{"This field may not be null."}
		case json.Unmarshal(evRaw, &list) != nil:
			var val any
			_ = json.Unmarshal(evRaw, &val)
			errs["events"] = map[string]any{"non_field_errors": []string{
				"Expected a list of items but got type \"" + pyDictType(val, evRaw) + "\"."}}
		default:
			// DRF reports only the failing items, keyed by index.
			itemErrs := map[string]any{}
			for i, item := range list {
				f, _, e := parseObject(item, readingFields, readingStrict)
				if len(e) > 0 {
					itemErrs[strconv.Itoa(i)] = e
				}
				items = append(items, f)
			}
			if len(itemErrs) > 0 {
				errs["events"] = itemErrs
			}
		}
	}
	if len(errs) > 0 {
		respond.Error(w, r, apperr.Validation(errs))
		return
	}
	if !hasEvents {
		items = []eventFields{top}
	}
	var created []uuid.UUID
	err = database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		var err error
		created, err = ingestBatch(ctx, db.New(tx), r.Header.Get("X-Kura-Device-Key"), top, items)
		return err
	})
	var out []EventDTO
	if err == nil {
		out, err = h.rows(r, created)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.JSON(w, http.StatusCreated, out)
}

func pyDictType(v any, raw json.RawMessage) string {
	if _, ok := v.(map[string]any); ok {
		return "dict"
	}
	return pyType(v, raw)
}

func ingestBatch(ctx context.Context, q *db.Queries, key string, top eventFields, items []eventFields) ([]uuid.UUID, error) {
	key = strings.TrimSpace(key)
	if key == "" {
		return nil, apperr.New("UNAUTHORIZED", "Device key required.").WithStatus(http.StatusUnauthorized)
	}
	hid := ""
	if top.HardwareID != nil {
		hid = strings.TrimSpace(*top.HardwareID)
	}
	var hidArg *string
	if hid != "" {
		hidArg = &hid
	}
	vehicle, err := q.TelemetryVehicleByKey(ctx, db.TelemetryVehicleByKeyParams{Digest: hashKey(key), HardwareID: hidArg})
	if database.IsNoRows(err) {
		return nil, apperr.New("UNAUTHORIZED", "Invalid device credentials.").WithStatus(http.StatusUnauthorized)
	}
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, apperr.New("VALIDATION", "events must be a non-empty list.")
	}
	if len(items) > 100 {
		return nil, apperr.New("VALIDATION", "Max 100 events per batch.")
	}
	batch := ""
	if top.IngestBatch != nil {
		batch = strings.TrimSpace(*top.IngestBatch)
	}
	if batch == "" {
		batch = "iot:" + strconv.FormatFloat(float64(time.Now().UnixMicro())/1e6, 'f', -1, 64)
	}
	hardware := hid
	if vehicle.HardwareID != nil && *vehicle.HardwareID != "" {
		hardware = *vehicle.HardwareID
	}
	out := make([]uuid.UUID, 0, len(items))
	for _, item := range items {
		in := item.input()
		in.VehicleID, in.Source, in.IngestBatch = vehicle.ID, "iot", batch
		rawMap := map[string]any{}
		for k, v := range item.Raw {
			rawMap[k] = v
		}
		rawMap["hardware_id"] = hardware
		in.Raw = rawMap
		id, err := Ingest(ctx, q, in, nil)
		if err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, nil
}
