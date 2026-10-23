package mobility

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/approval"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/numeric"
)

// BatteryTypeDTO is BatteryTypeSerializer.
type BatteryTypeDTO struct {
	ID             string         `json:"id"`
	Name           string         `json:"name"`
	Manufacturer   string         `json:"manufacturer"`
	CapacityKwh    string         `json:"capacity_kwh"`
	NominalVoltage int32          `json:"nominal_voltage"`
	VehicleType    string         `json:"vehicle_type"`
	QrScheme       string         `json:"qr_scheme"`
	Status         string         `json:"status"`
	CreatedBy      *string        `json:"created_by"`
	ApprovedBy     *string        `json:"approved_by"`
	CreatedAt      jsontime.Field `json:"created_at"`
	UpdatedAt      jsontime.Field `json:"updated_at"`
}

func batteryTypeDTO(t db.MobilityBatterytype) BatteryTypeDTO {
	return BatteryTypeDTO{ID: t.ID.String(), Name: t.Name, Manufacturer: t.Manufacturer,
		CapacityKwh: numeric.Text(t.CapacityKwh, 2), NominalVoltage: t.NominalVoltage, VehicleType: t.VehicleType,
		QrScheme: t.QrScheme, Status: t.Status, CreatedBy: idPtr(t.CreatedByID), ApprovedBy: idPtr(t.ApprovedByID),
		CreatedAt: jsontime.Field(t.CreatedAt), UpdatedAt: jsontime.Field(t.UpdatedAt)}
}

func idPtr(id *uuid.UUID) *string {
	if id == nil {
		return nil
	}
	s := id.String()
	return &s
}

var vehicleTypeJunk = regexp.MustCompile(`[^A-Z0-9]+`)

// normalizeVehicleType is mobility.models.choices.normalize_vehicle_type.
func normalizeVehicleType(raw string) string {
	code := strings.Trim(vehicleTypeJunk.ReplaceAllString(strings.ToUpper(strings.TrimSpace(raw)), "_"), "_")
	if len(code) > 50 {
		code = code[:50]
	}
	if code == "" {
		return "MOTORCYCLE"
	}
	return code
}

// BatteryTypeHandler serves /api/v1/mobility/battery-types.
type BatteryTypeHandler struct {
	pool *pgxpool.Pool
	q    *db.Queries
}

func NewBatteryTypeHandler(pool *pgxpool.Pool) *BatteryTypeHandler {
	return &BatteryTypeHandler{pool: pool, q: db.New(pool)}
}

// filters are get_queryset's ?status= / ?vehicle_type= plus ?q=.
func btFilters(r *http.Request) (status, vt, q *string) {
	return listq.Exact(r, "status"), listq.Exact(r, "vehicle_type"), listq.Search(r)
}

func (h *BatteryTypeHandler) list(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	status, vt, q := btFilters(r)
	total, err := h.q.CountBatteryTypes(ctx, db.CountBatteryTypesParams{Status: status, VehicleType: vt, Q: q})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	page, size := paginate.Page(r), paginate.Size(r)
	rows, err := h.q.ListBatteryTypes(ctx, db.ListBatteryTypesParams{Status: status, VehicleType: vt, Q: q,
		Lim: int32(size), Off: int32(paginate.Offset(page, size))})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]BatteryTypeDTO, len(rows))
	for i, t := range rows {
		out[i] = batteryTypeDTO(t)
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

// object is get_object: the filtered queryset still applies on detail routes.
func (h *BatteryTypeHandler) object(r *http.Request) (db.MobilityBatterytype, error) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.MobilityBatterytype{}, apperr.NotFound("Not found.")
	}
	t, err := h.q.BatteryTypeByID(r.Context(), id)
	status, vt, _ := btFilters(r)
	if database.IsNoRows(err) || (err == nil && ((status != nil && t.Status != *status) ||
		(vt != nil && t.VehicleType != *vt))) {
		return t, apperr.NotFound("No BatteryType matches the given query.")
	}
	return t, err
}

func (h *BatteryTypeHandler) get(w http.ResponseWriter, r *http.Request) {
	t, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, batteryTypeDTO(t))
}

// batteryTypeReq is BatteryTypeSerializer's writable fields.
type batteryTypeReq struct {
	Name           string          `json:"name" validate:"required,max=100"`
	Manufacturer   *string         `json:"manufacturer" validate:"omitempty,notblank,max=100"`
	CapacityKwh    *decode.Decimal `json:"capacity_kwh" decimal:"5,2"`
	NominalVoltage *int64          `json:"nominal_voltage" validate:"omitempty,min=0,max=2147483647"`
	VehicleType    string          `json:"vehicle_type" validate:"required,max=50"`
	QrScheme       *string         `json:"qr_scheme" validate:"omitempty,oneof=PRINTED SIGNED BMS_AUTH NFC_SUN"`
}

// create is BatteryTypeService.create: a proposal that needs approval.
func (h *BatteryTypeHandler) create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b batteryTypeReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	manufacturer, capacity, voltage, scheme := "KURA Energy", "3.24", int32(72), "SIGNED"
	if b.Manufacturer != nil && *b.Manufacturer != "" {
		manufacturer = *b.Manufacturer
	}
	if b.CapacityKwh != nil && strings.Trim(b.CapacityKwh.Text, "-0.") != "" { // Decimal zero is falsy
		capacity = b.CapacityKwh.Text
	}
	if b.NominalVoltage != nil && *b.NominalVoltage != 0 {
		voltage = int32(*b.NominalVoltage)
	}
	if b.QrScheme != nil && *b.QrScheme != "" {
		scheme = *b.QrScheme
	}
	id := ids.New()
	err := database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		who, err := actor.FromRequest(ctx, q)
		if err != nil {
			return err
		}
		uid, _ := uuid.Parse(reqctx.User(ctx).UserID)
		if err := q.InsertBatteryType(ctx, db.InsertBatteryTypeParams{ID: id, Name: strings.TrimSpace(b.Name),
			Manufacturer: manufacturer, Capacity: capacity, NominalVoltage: voltage,
			VehicleType: normalizeVehicleType(b.VehicleType), QrScheme: scheme, CreatedByID: &uid}); err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "battery_type.proposed", SubjectType: "battery_type",
			SubjectID: id.String(), SubjectLabel: strings.TrimSpace(b.Name), Actor: who,
			After: events.Map{"status": "PENDING", "qr_scheme": scheme}})
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	t, err := h.q.BatteryTypeByID(ctx, id)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.Created(w, batteryTypeDTO(t))
}

// activate is BatteryTypeService.activate (PENDING → ACTIVE, checker ≠ maker).
func (h *BatteryTypeHandler) activate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	t, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	err = database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		locked, err := q.BatteryTypeForUpdate(ctx, t.ID)
		if err != nil {
			return err
		}
		if locked.Status != "PENDING" {
			return apperr.Conflict("INVALID_TRANSITION", fmt.Sprintf("Cannot activate type in status %s.", locked.Status))
		}
		uid, _ := uuid.Parse(reqctx.User(ctx).UserID)
		me, err := q.GetUserByID(ctx, uid)
		if err != nil {
			return err
		}
		if err := approval.AssertNotSelf(me, locked.CreatedByID,
			"Creator cannot activate their own battery type."); err != nil {
			return err
		}
		if err := q.ActivateBatteryType(ctx, db.ActivateBatteryTypeParams{ID: locked.ID, ApprovedByID: &uid}); err != nil {
			return err
		}
		who, err := actor.FromRequest(ctx, q)
		if err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "battery_type.activated", SubjectType: "battery_type",
			SubjectID: locked.ID.String(), SubjectLabel: locked.Name, Actor: who,
			Before: events.Map{"status": locked.Status},
			After: events.Map{"status": "ACTIVE", "approved_by_id": uid.String(),
				"created_by_id": idOrNil(locked.CreatedByID)},
			Metadata: approval.Metadata(me, locked.CreatedByID)})
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	fresh, err := h.q.BatteryTypeByID(ctx, t.ID)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, batteryTypeDTO(fresh))
}

func idOrNil(id *uuid.UUID) any {
	if id == nil {
		return nil
	}
	return id.String()
}
