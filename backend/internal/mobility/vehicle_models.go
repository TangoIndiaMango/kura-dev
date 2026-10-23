package mobility

import (
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
)

// VehicleModelDTO is VehicleModelListSerializer.
type VehicleModelDTO struct {
	ID                  string         `json:"id"`
	Make                string         `json:"make"`
	Model               string         `json:"model"`
	VehicleType         string         `json:"vehicle_type"`
	BatteryType         string         `json:"battery_type"`
	BatteryTypeID       string         `json:"battery_type_id"`
	BatteryTypeName     string         `json:"battery_type_name"`
	ServiceIntervalKm   *int32         `json:"service_interval_km"`
	ServiceIntervalDays *int32         `json:"service_interval_days"`
	CreatedAt           jsontime.Field `json:"created_at"`
	UpdatedAt           jsontime.Field `json:"updated_at"`
}

func vehicleModelDTO(m db.ListVehicleModelsRow) VehicleModelDTO {
	return VehicleModelDTO{ID: m.ID.String(), Make: m.Make, Model: m.Model, VehicleType: m.VehicleType,
		BatteryType: m.BatteryTypeID.String(), BatteryTypeID: m.BatteryTypeID.String(),
		BatteryTypeName: m.BatteryTypeName, ServiceIntervalKm: m.ServiceIntervalKm,
		ServiceIntervalDays: m.ServiceIntervalDays, CreatedAt: jsontime.Field(m.CreatedAt),
		UpdatedAt: jsontime.Field(m.UpdatedAt)}
}

// VehicleModelHandler serves /api/v1/mobility/vehicle-models.
type VehicleModelHandler struct {
	pool *pgxpool.Pool
	q    *db.Queries
}

func NewVehicleModelHandler(pool *pgxpool.Pool) *VehicleModelHandler {
	return &VehicleModelHandler{pool: pool, q: db.New(pool)}
}

func vmOrdering(raw string) string {
	for _, t := range strings.Split(raw, ",") {
		switch t = strings.TrimSpace(t); strings.TrimPrefix(t, "-") {
		case "make", "model", "vehicle_type", "created_at":
			return t
		}
	}
	return ""
}

// vmFilters are ?vehicle_type= / ?battery_type= / ?q=. A malformed
// battery_type is a validation error (Django's UUID field check).
func vmFilters(r *http.Request) (vt *string, bt *uuid.UUID, q *string, err error) {
	vt, q = listq.Exact(r, "vehicle_type"), listq.Search(r)
	if raw := listq.Exact(r, "battery_type"); raw != nil {
		id, perr := uuid.Parse(*raw)
		if perr != nil {
			return nil, nil, nil, apperr.Field("non_field_errors", "“"+*raw+"” is not a valid UUID.")
		}
		bt = &id
	}
	return vt, bt, q, nil
}

func (h *VehicleModelHandler) list(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vt, bt, q, err := vmFilters(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	total, err := h.q.CountVehicleModels(ctx, db.CountVehicleModelsParams{VehicleType: vt, BatteryType: bt, Q: q})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	page, size := paginate.Page(r), paginate.Size(r)
	rows, err := h.q.ListVehicleModels(ctx, db.ListVehicleModelsParams{VehicleType: vt, BatteryType: bt, Q: q,
		Ord: vmOrdering(r.URL.Query().Get("ordering")), Lim: int32(size), Off: int32(paginate.Offset(page, size))})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]VehicleModelDTO, len(rows))
	for i, m := range rows {
		out[i] = vehicleModelDTO(m)
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

func asListRow(m db.VehicleModelByIDRow) db.ListVehicleModelsRow { return db.ListVehicleModelsRow(m) }

// object is get_object within the filtered catalogue.
func (h *VehicleModelHandler) object(r *http.Request) (db.VehicleModelByIDRow, error) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.VehicleModelByIDRow{}, apperr.NotFound("Not found.")
	}
	vt, bt, _, err := vmFilters(r)
	if err != nil {
		return db.VehicleModelByIDRow{}, err
	}
	m, err := h.q.VehicleModelByID(r.Context(), id)
	if database.IsNoRows(err) || (err == nil && ((vt != nil && m.VehicleType != *vt) ||
		(bt != nil && m.BatteryTypeID != *bt))) {
		return m, apperr.NotFound("No VehicleModel matches the given query.")
	}
	return m, err
}

func (h *VehicleModelHandler) get(w http.ResponseWriter, r *http.Request) {
	m, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, vehicleModelDTO(asListRow(m)))
}

// stats is vehicle_model_stats.
func (h *VehicleModelHandler) stats(w http.ResponseWriter, r *http.Request) {
	counts, err := h.q.VehicleModelTypeCounts(r.Context())
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	by, total := map[string]int32{}, int32(0)
	for _, c := range counts {
		by[c.VehicleType], total = c.N, total+c.N
	}
	type row struct {
		VehicleType string `json:"vehicle_type"`
		Count       int32  `json:"count"`
	}
	respond.OK(w, map[string]any{
		"totals": map[string]int32{"all": total, "motorcycle": by["MOTORCYCLE"], "tricycle": by["TRICYCLE"],
			"boat": by["BOAT"]},
		"by_type": []row{{"MOTORCYCLE", by["MOTORCYCLE"]}, {"TRICYCLE", by["TRICYCLE"]}, {"BOAT", by["BOAT"]}},
	})
}
