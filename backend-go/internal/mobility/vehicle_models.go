package mobility

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
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

// vehicleModelReq is VehicleModelWriteSerializer.
type vehicleModelReq struct {
	Make        *string    `json:"make" validate:"omitempty,notblank,max=100"`
	Model       *string    `json:"model" validate:"omitempty,notblank,max=100"`
	VehicleType *string    `json:"vehicle_type" validate:"omitempty,notblank,max=50"`
	BatteryType *uuid.UUID `json:"battery_type"`
	IntervalKm  *int64     `json:"service_interval_km" validate:"omitempty,min=1"`
	IntervalDay *int64     `json:"service_interval_days" validate:"omitempty,min=1"`
}

func (b vehicleModelReq) required() error {
	d := apperr.Details{}
	for name, missing := range map[string]bool{"make": b.Make == nil, "model": b.Model == nil,
		"vehicle_type": b.VehicleType == nil, "battery_type": b.BatteryType == nil} {
		if missing {
			d[name] = []string{"This field is required."}
		}
	}
	if len(d) > 0 {
		return apperr.Validation(d)
	}
	return nil
}

func i32(p *int64) *int32 {
	if p == nil {
		return nil
	}
	v := int32(*p)
	return &v
}

func duplicateModel() error {
	return apperr.New("VALIDATION_ERROR", "A catalogue model with this make and model already exists.")
}

func unknownBatteryType() error {
	return apperr.New("VALIDATION_ERROR", "Unknown battery type.").
		WithDetails(apperr.Details{"battery_type": []string{"invalid"}})
}

func modelSnap(m db.MobilityVehiclemodel, intervals bool) events.Map {
	out := events.Map{"make": m.Make, "model": m.Model, "vehicle_type": m.VehicleType,
		"battery_type_id": m.BatteryTypeID.String()}
	if intervals {
		out["service_interval_km"], out["service_interval_days"] = m.ServiceIntervalKm, m.ServiceIntervalDays
	}
	return out
}

func (h *VehicleModelHandler) create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b vehicleModelReq
	err := decode.JSON(r, &b)
	if err == nil {
		err = b.required()
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	m := db.MobilityVehiclemodel{ID: ids.New(), Make: strings.TrimSpace(*b.Make), Model: strings.TrimSpace(*b.Model),
		VehicleType: normalizeVehicleType(*b.VehicleType), BatteryTypeID: *b.BatteryType,
		ServiceIntervalKm: i32(b.IntervalKm), ServiceIntervalDays: i32(b.IntervalDay)}
	err = h.write(ctx, func(q *db.Queries, who *events.Actor) error {
		if _, err := q.BatteryTypeByID(ctx, m.BatteryTypeID); database.IsNoRows(err) {
			return unknownBatteryType()
		} else if err != nil {
			return err
		}
		if err := q.InsertVehicleModel(ctx, db.InsertVehicleModelParams{ID: m.ID, Make: m.Make, Model: m.Model,
			VehicleType: m.VehicleType, BatteryTypeID: m.BatteryTypeID, ServiceIntervalKm: m.ServiceIntervalKm,
			ServiceIntervalDays: m.ServiceIntervalDays}); err != nil {
			if _, dup := database.IsUniqueViolation(err); dup {
				return duplicateModel()
			}
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "vehicle_model.created", SubjectType: "vehicle_model",
			SubjectID: m.ID.String(), SubjectLabel: m.Make + " " + m.Model, Actor: who, After: modelSnap(m, false)})
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	row, err := h.q.VehicleModelByID(ctx, m.ID)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.Created(w, vehicleModelDTO(asListRow(row)))
}

// write runs a catalogue mutation in a savepoint so a unique violation can
// be answered as a validation error.
func (h *VehicleModelHandler) write(ctx context.Context, fn func(q *db.Queries, who *events.Actor) error) error {
	return database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		who, err := actor.FromRequest(ctx, q)
		if err != nil {
			return err
		}
		sp, err := tx.Begin(ctx)
		if err != nil {
			return err
		}
		if err := fn(db.New(sp), who); err != nil {
			_ = sp.Rollback(ctx)
			return err
		}
		return sp.Commit(ctx)
	})
}

func (h *VehicleModelHandler) patch(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	keys := decode.Keys(r)
	var b vehicleModelReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	cur, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	err = h.write(ctx, func(q *db.Queries, who *events.Actor) error {
		m, err := q.VehicleModelForUpdate(ctx, cur.ID)
		if err != nil {
			return err
		}
		before := modelSnap(m, true)
		if b.Make != nil {
			m.Make = strings.TrimSpace(*b.Make)
		}
		if b.Model != nil {
			m.Model = strings.TrimSpace(*b.Model)
		}
		if b.VehicleType != nil && *b.VehicleType != "" {
			m.VehicleType = normalizeVehicleType(*b.VehicleType)
		}
		if b.BatteryType != nil {
			if _, err := q.BatteryTypeByID(ctx, *b.BatteryType); database.IsNoRows(err) {
				return unknownBatteryType()
			} else if err != nil {
				return err
			}
			m.BatteryTypeID = *b.BatteryType
		}
		if keys["service_interval_km"] {
			m.ServiceIntervalKm = i32(b.IntervalKm)
		}
		if keys["service_interval_days"] {
			m.ServiceIntervalDays = i32(b.IntervalDay)
		}
		if err := q.SaveVehicleModel(ctx, db.SaveVehicleModelParams{ID: m.ID, Make: m.Make, Model: m.Model,
			VehicleType: m.VehicleType, BatteryTypeID: m.BatteryTypeID, ServiceIntervalKm: m.ServiceIntervalKm,
			ServiceIntervalDays: m.ServiceIntervalDays}); err != nil {
			if _, dup := database.IsUniqueViolation(err); dup {
				return duplicateModel()
			}
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "vehicle_model.updated", SubjectType: "vehicle_model",
			SubjectID: m.ID.String(), SubjectLabel: m.Make + " " + m.Model, Actor: who, Before: before,
			After: modelSnap(m, true)})
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	row, err := h.q.VehicleModelByID(ctx, cur.ID)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, vehicleModelDTO(asListRow(row)))
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
