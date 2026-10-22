package telemetry

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

type handler struct {
	pool *pgxpool.Pool
	q    *db.Queries
}

// EventDTO is TelemetryEventSerializer.
type EventDTO struct {
	ID          string          `json:"id"`
	VehicleID   string          `json:"vehicle_id"`
	VehicleReg  string          `json:"vehicle_reg"`
	RecordedAt  jsontime.Field  `json:"recorded_at"`
	BatteryPct  *int16          `json:"battery_pct"`
	Lat         *float64        `json:"lat"`
	Lng         *float64        `json:"lng"`
	SpeedKmh    *float64        `json:"speed_kmh"`
	OdometerKm  *float64        `json:"odometer_km"`
	Source      string          `json:"source"`
	IngestBatch string          `json:"ingest_batch"`
	Raw         json.RawMessage `json:"raw"`
	CreatedAt   jsontime.Field  `json:"created_at"`
}

func eventDTO(e db.TelemetryEventRowsRow) EventDTO {
	return EventDTO{ID: e.ID.String(), VehicleID: e.VehicleID.String(), VehicleReg: e.VehicleReg,
		RecordedAt: jsontime.Field(e.RecordedAt), BatteryPct: e.BatteryPct, Lat: e.Lat, Lng: e.Lng,
		SpeedKmh: e.SpeedKmh, OdometerKm: e.OdometerKm, Source: e.Source, IngestBatch: e.IngestBatch,
		Raw: e.Raw, CreatedAt: jsontime.Field(e.CreatedAt)}
}

// rows loads events in the given id order.
func (h handler) rows(r *http.Request, ids []uuid.UUID) ([]EventDTO, error) {
	rows, err := h.q.TelemetryEventRows(r.Context(), ids)
	if err != nil {
		return nil, err
	}
	by := map[uuid.UUID]db.TelemetryEventRowsRow{}
	for _, e := range rows {
		by[e.ID] = e
	}
	out := make([]EventDTO, 0, len(ids))
	for _, id := range ids {
		if e, ok := by[id]; ok {
			out = append(out, eventDTO(e))
		}
	}
	return out, nil
}

// classify is classify_telemetry.
func classify(recorded *time.Time, speed *float64, now time.Time) string {
	if recorded == nil {
		return "OFFLINE"
	}
	age := now.Sub(*recorded)
	switch {
	case age > 48*time.Hour:
		return "OFFLINE"
	case speed != nil && *speed <= 1.0 && age > 24*time.Hour:
		return "STATIONARY"
	case age <= 24*time.Hour:
		return "LIVE"
	}
	return "STATIONARY"
}

// fleet is TelemetryFleetView: one row per active vehicle with its latest event.
func (h handler) fleet(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var search *string
	if s := strings.TrimSpace(r.URL.Query().Get("search")); s != "" {
		esc := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(s)
		search = &esc
	}
	vehicles, err := h.q.TelemetryFleetVehicles(ctx, search)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	idList := make([]uuid.UUID, len(vehicles))
	for i, v := range vehicles {
		idList[i] = v.ID
	}
	latest, err := h.q.TelemetryLatestByVehicle(ctx, idList)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	by := map[uuid.UUID]db.TelemetryLatestByVehicleRow{}
	for _, e := range latest {
		by[e.VehicleID] = e
	}
	now := time.Now()
	totals := map[string]int{"vehicles": len(vehicles), "live": 0, "stationary": 0, "offline": 0}
	out := make([]map[string]any, 0, len(vehicles))
	for _, v := range vehicles {
		row := map[string]any{"vehicle_id": v.ID.String(), "registration_plate": v.RegistrationPlate,
			"vehicle_type": v.VehicleType, "make": v.Make, "model": v.Model, "account_id": v.AccountID.String(),
			"owner_name": v.OwnerName, "vehicle_status": v.Status, "last_recorded_at": nil, "battery_pct": nil,
			"speed_kmh": nil, "source": nil}
		var status string
		if e, ok := by[v.ID]; ok {
			status = classify(&e.RecordedAt, e.SpeedKmh, now)
			row["last_recorded_at"] = jsontime.FormatISO(e.RecordedAt)
			row["battery_pct"], row["speed_kmh"], row["source"] = e.BatteryPct, e.SpeedKmh, e.Source
		} else {
			status = classify(nil, nil, now)
		}
		row["telemetry_status"] = status
		totals[strings.ToLower(status)]++
		out = append(out, row)
	}
	respond.OK(w, map[string]any{"totals": totals, "results": out})
}

// list is TelemetryEventViewSet.list: cursor feed, optional raw vehicle_id.
func (h handler) list(w http.ResponseWriter, r *http.Request) {
	// The raw filter(vehicle_id=...) rejects a bad id as a non-field error.
	var p db.TelemetryEventsPageParams
	var err error
	if v := r.URL.Query().Get("vehicle_id"); v != "" {
		id, perr := uuid.Parse(v)
		if perr != nil {
			err = apperr.Field("non_field_errors", "\u201c"+v+"\u201d is not a valid UUID.")
		}
		p.Vehicle = &id
	}
	var at *paginate.Key
	if err == nil {
		at, err = paginate.Cursor(r)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	size := paginate.Size(r)
	p.Lim = int32(size + 1)
	if at != nil {
		p.AfterAt, p.Back = &at.CreatedAt, at.Back
		p.AfterID, _ = uuid.Parse(at.ID)
	}
	ids, err := h.q.TelemetryEventsPage(r.Context(), p)
	var out []EventDTO
	if err == nil {
		out, err = h.rows(r, paginate.Display(ids, size, p.Back))
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, paginate.BuildCursorPage(r, out, size, at, func(d EventDTO) paginate.Key {
		return paginate.Key{CreatedAt: time.Time(d.CreatedAt), ID: d.ID}
	}))
}

func (h handler) get(w http.ResponseWriter, r *http.Request) {
	id, perr := uuid.Parse(r.PathValue("id"))
	if perr != nil {
		respond.Error(w, r, apperr.NotFound("Not found."))
		return
	}
	out, err := h.rows(r, []uuid.UUID{id})
	if err == nil && len(out) == 0 {
		err = apperr.NotFound("No TelemetryEvent matches the given query.")
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, out[0])
}
