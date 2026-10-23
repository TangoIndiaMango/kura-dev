// Package mobility ports the mobility app: hubs, batteries, vehicles, plans,
// reservations and swaps.
package mobility

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/export"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/scope"
)

// HubDTO is HubListSerializer.
type HubDTO struct {
	ID              string         `json:"id"`
	Code            string         `json:"code"`
	Name            string         `json:"name"`
	Address         string         `json:"address"`
	Status          string         `json:"status"`
	SlotCount       int32          `json:"slot_count"`
	SolarCapacityKw string         `json:"solar_capacity_kw"`
	ReadyCount      int32          `json:"ready_count"`
	ChargingCount   int32          `json:"charging_count"`
	EmptyCount      int32          `json:"empty_count"`
	FaultCount      int32          `json:"fault_count"`
	CreatedAt       jsontime.Field `json:"created_at"`
}

// HubDetailDTO is HubDetailSerializer.
type HubDetailDTO struct {
	HubDTO
	Lat            float64         `json:"lat"`
	Lng            float64         `json:"lng"`
	Timezone       string          `json:"timezone"`
	OperatingHours json.RawMessage `json:"operating_hours"`
	LastSyncAt     *jsontime.Field `json:"last_sync_at"`
	BatteryTypes   []string        `json:"battery_types"`
	UpdatedAt      jsontime.Field  `json:"updated_at"`
}

func hubDTO(h db.HubRowsRow) HubDTO {
	return HubDTO{ID: h.ID.String(), Code: h.Code, Name: h.Name, Address: h.Address, Status: h.Status,
		SlotCount: h.SlotCount, SolarCapacityKw: h.SolarCapacityKw, ReadyCount: h.ReadyCount,
		ChargingCount: h.ChargingCount, EmptyCount: h.EmptyCount, FaultCount: h.FaultCount,
		CreatedAt: jsontime.Field(h.CreatedAt)}
}

// HubHandler serves /api/v1/mobility/hubs (HubViewSet).
type HubHandler struct {
	pool *pgxpool.Pool
	q    *db.Queries
}

func NewHubHandler(pool *pgxpool.Pool) *HubHandler { return &HubHandler{pool: pool, q: db.New(pool)} }

// hubScope is hub_ids_for: nil IDs with all=true means every hub.
func (h *HubHandler) hubScope(ctx context.Context) (bool, []uuid.UUID, error) {
	hubs, err := scope.HubsFor(ctx, h.q, reqctx.User(ctx))
	return hubs.All, hubs.IDs, err
}

// hubOrdering is OrderingFilter over code / name / created_at (default code).
func hubOrdering(raw string) string {
	for _, t := range strings.Split(raw, ",") {
		switch t = strings.TrimSpace(t); t {
		case "code", "-code", "name", "-name", "created_at", "-created_at":
			return t
		}
	}
	return "code"
}

func (h *HubHandler) filters(r *http.Request) (db.ListHubIDsParams, error) {
	status, err := listq.Choice(r, "status", strings.Fields(hubStatuses)...)
	if err != nil {
		return db.ListHubIDsParams{}, err
	}
	all, ids, err := h.hubScope(r.Context())
	return db.ListHubIDsParams{AllRows: all, ScopeIds: ids, Status: status, Q: listq.Search(r),
		Ord: hubOrdering(r.URL.Query().Get("ordering"))}, err
}

// rows loads hub rows in the order of ids.
func (h *HubHandler) rows(ctx context.Context, ids []uuid.UUID) ([]db.HubRowsRow, error) {
	rows, err := h.q.HubRows(ctx, ids)
	if err != nil {
		return nil, err
	}
	by := make(map[uuid.UUID]db.HubRowsRow, len(rows))
	for _, r := range rows {
		by[r.ID] = r
	}
	out := make([]db.HubRowsRow, 0, len(ids))
	for _, id := range ids {
		if r, ok := by[id]; ok {
			out = append(out, r)
		}
	}
	return out, nil
}

func (h *HubHandler) list(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	f, err := h.filters(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	total, err := h.q.CountHubs(ctx, db.CountHubsParams{AllRows: f.AllRows, ScopeIds: f.ScopeIds, Status: f.Status, Q: f.Q})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	page, size := paginate.Page(r), paginate.Size(r)
	f.Lim, f.Off = int32(size), int32(paginate.Offset(page, size))
	ids, err := h.q.ListHubIDs(ctx, f)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows, err := h.rows(ctx, ids)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]HubDTO, len(rows))
	for i, row := range rows {
		out[i] = hubDTO(row)
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

// object is get_object over the scoped hubs.
func (h *HubHandler) object(r *http.Request) (db.HubRowsRow, error) {
	ctx := r.Context()
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.HubRowsRow{}, apperr.NotFound("Not found.")
	}
	all, ids, err := h.hubScope(ctx)
	if err != nil {
		return db.HubRowsRow{}, err
	}
	rows, err := h.q.HubRows(ctx, []uuid.UUID{id})
	if err != nil {
		return db.HubRowsRow{}, err
	}
	if len(rows) == 0 || (!all && !contains(ids, id)) {
		return db.HubRowsRow{}, apperr.NotFound("No Hub matches the given query.")
	}
	return rows[0], nil
}

// detail is HubDetailSerializer for a freshly loaded hub.
func (h *HubHandler) detail(ctx context.Context, id uuid.UUID) (HubDetailDTO, error) {
	rows, err := h.q.HubRows(ctx, []uuid.UUID{id})
	if err != nil {
		return HubDetailDTO{}, err
	}
	if len(rows) == 0 {
		return HubDetailDTO{}, apperr.NotFound("No Hub matches the given query.")
	}
	row := rows[0]
	types, err := h.q.HubBatteryTypeNames(ctx, id)
	if err != nil {
		return HubDetailDTO{}, err
	}
	if types == nil {
		types = []string{}
	}
	return HubDetailDTO{HubDTO: hubDTO(row), Lat: row.Lat, Lng: row.Lng, Timezone: row.Timezone,
		OperatingHours: json.RawMessage(row.OperatingHours), LastSyncAt: jsontime.FieldPtr(row.LastSyncAt),
		BatteryTypes: types, UpdatedAt: jsontime.Field(row.UpdatedAt)}, nil
}

func (h *HubHandler) get(w http.ResponseWriter, r *http.Request) {
	row, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	d, err := h.detail(r.Context(), row.ID)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, d)
}

type slotDTO struct {
	ID               string  `json:"id"`
	SlotNo           int32   `json:"slot_no"`
	State            string  `json:"state"`
	BatteryID        *string `json:"battery_id"`
	BatterySerial    *string `json:"battery_serial"`
	BatteryChargePct *int32  `json:"battery_charge_pct"`
}

func (h *HubHandler) slots(w http.ResponseWriter, r *http.Request) {
	row, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	slots, err := h.q.HubSlotRows(r.Context(), row.ID)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]slotDTO, len(slots))
	for i, s := range slots {
		out[i] = slotDTO{ID: s.ID.String(), SlotNo: s.SlotNo, State: s.State, BatterySerial: s.BatterySerial,
			BatteryChargePct: s.BatteryChargePct}
		if s.BatteryID != nil {
			id := s.BatteryID.String()
			out[i].BatteryID = &id
		}
	}
	respond.OK(w, out)
}

func (h *HubHandler) export(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	f, err := h.filters(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	f.Lim = export.RowCap + 1
	ids, err := h.q.ListHubIDs(ctx, f)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows, err := h.rows(ctx, ids)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	t := export.Table{Stem: "hubs", Title: "Kura hubs", Headers: []string{"id", "code", "name", "address", "status",
		"slot_count", "ready_count", "charging_count", "empty_count", "fault_count", "solar_capacity_kw", "created_at"}}
	for _, h := range rows {
		t.Rows = append(t.Rows, []string{h.ID.String(), h.Code, h.Name, h.Address, h.Status, itoa(h.SlotCount),
			itoa(h.ReadyCount), itoa(h.ChargingCount), itoa(h.EmptyCount), itoa(h.FaultCount), h.SolarCapacityKw,
			jsontime.FormatISO(h.CreatedAt)})
	}
	if err := export.Write(w, r.URL.Query().Get("export"), t); err != nil {
		respond.Error(w, r, err)
	}
}
