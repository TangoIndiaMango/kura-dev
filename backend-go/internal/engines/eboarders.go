package engines

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

// EBoarderDTO is EBoarderListSerializer.
type EBoarderDTO struct {
	ID              string          `json:"id"`
	Serial          string          `json:"serial"`
	Make            string          `json:"make"`
	Model           string          `json:"model"`
	RatedWatts      int32           `json:"rated_watts"`
	RatedKw         string          `json:"rated_kw"`
	PetrolHp        string          `json:"petrol_hp_equivalent"`
	NominalVoltage  int16           `json:"nominal_voltage_v"`
	BatteryTypeID   string          `json:"battery_type_id"`
	BatteryTypeName string          `json:"battery_type_name"`
	ShaftLength     string          `json:"shaft_length"`
	Status          string          `json:"status"`
	HubID           *string         `json:"current_hub_id"`
	HubCode         *string         `json:"current_hub_code"`
	HubName         *string         `json:"current_hub_name"`
	VehicleID       *string         `json:"vehicle_id"`
	VehicleReg      *string         `json:"vehicle_reg"`
	AccountID       *string         `json:"account_id"`
	OwnerName       *string         `json:"owner_name"`
	IssuedAt        *jsontime.Field `json:"issued_at"`
	CreatedAt       jsontime.Field  `json:"created_at"`
}

// EBoarderDetailDTO is EBoarderDetailSerializer.
type EBoarderDetailDTO struct {
	EBoarderDTO
	Raw       json.RawMessage `json:"raw"`
	UpdatedAt jsontime.Field  `json:"updated_at"`
}

// ratedKw is rated_kw_display ("6", "6.5").
func ratedKw(w int32) string {
	if w%1000 == 0 {
		return strconv.Itoa(int(w / 1000))
	}
	s := strings.TrimRight(fmt.Sprintf("%.1f", float64(w)/1000), "0")
	return strings.TrimRight(s, ".")
}

func eboarderDTO(b db.EBoarderRowsRow) EBoarderDTO {
	return EBoarderDTO{ID: b.ID.String(), Serial: b.Serial, Make: b.Make, Model: b.Model, RatedWatts: b.RatedWatts,
		RatedKw: ratedKw(b.RatedWatts), PetrolHp: b.PetrolHpEquivalent, NominalVoltage: b.NominalVoltageV,
		BatteryTypeID: b.BatteryTypeID.String(), BatteryTypeName: b.BatteryTypeName, ShaftLength: b.ShaftLength,
		Status: b.Status, HubID: idStr(b.CurrentHubID), HubCode: b.HubCode, HubName: b.HubName,
		VehicleID: idStr(b.VehicleID), VehicleReg: b.VehicleReg, AccountID: idStr(b.AccountID), OwnerName: b.OwnerName,
		IssuedAt: jsontime.FieldPtr(b.IssuedAt), CreatedAt: jsontime.Field(b.CreatedAt)}
}

func (h *handler) eboarderRows(ctx context.Context, ids []uuid.UUID) ([]db.EBoarderRowsRow, error) {
	rows, err := h.q.EBoarderRows(ctx, ids)
	if err != nil {
		return nil, err
	}
	by := map[uuid.UUID]db.EBoarderRowsRow{}
	for _, r := range rows {
		by[r.ID] = r
	}
	out := make([]db.EBoarderRowsRow, 0, len(ids))
	for _, id := range ids {
		if r, ok := by[id]; ok {
			out = append(out, r)
		}
	}
	return out, nil
}

func (h *handler) listEBoarders(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p := db.EBoarderPageParams{Status: listq.Exact(r, "status"), Q: listq.Search(r),
		Ord: ordering(r.URL.Query().Get("ordering"), "serial", "status", "created_at")}
	var err error
	if v := listq.Exact(r, "hub"); v != nil { // raw filter(current_hub_id=...)
		id, perr := uuid.Parse(*v)
		if perr != nil {
			err = apperr.Field("non_field_errors", "“"+*v+"” is not a valid UUID.")
		}
		p.Hub = &id
	}
	var total int64
	if err == nil {
		total, err = h.q.EBoarderCount(ctx, db.EBoarderCountParams{Status: p.Status, Hub: p.Hub, Q: p.Q})
	}
	page, size := paginate.Page(r), paginate.Size(r)
	p.Lim, p.Off = int32(size), int32(paginate.Offset(page, size))
	var ids []uuid.UUID
	if err == nil {
		ids, err = h.q.EBoarderPage(ctx, p)
	}
	var rows []db.EBoarderRowsRow
	if err == nil {
		rows, err = h.eboarderRows(ctx, ids)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]EBoarderDTO, len(rows))
	for i, x := range rows {
		out[i] = eboarderDTO(x)
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

func (h *handler) eboarder(r *http.Request) (uuid.UUID, error) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return uuid.Nil, apperr.NotFound("Not found.")
	}
	rows, err := h.eboarderRows(r.Context(), []uuid.UUID{id})
	if err == nil && len(rows) == 0 {
		err = apperr.NotFound("No EBoarder matches the given query.")
	}
	return id, err
}

func (h *handler) respondEBoarder(w http.ResponseWriter, r *http.Request, status int, id uuid.UUID) {
	rows, err := h.eboarderRows(r.Context(), []uuid.UUID{id})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.JSON(w, status, EBoarderDetailDTO{EBoarderDTO: eboarderDTO(rows[0]), Raw: rows[0].Raw,
		UpdatedAt: jsontime.Field(rows[0].UpdatedAt)})
}

func (h *handler) getEBoarder(w http.ResponseWriter, r *http.Request) {
	id, err := h.eboarder(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondEBoarder(w, r, http.StatusOK, id)
}

func (h *handler) eboarderStats(w http.ResponseWriter, r *http.Request) {
	rows, err := h.q.EBoarderStats(r.Context())
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	totals := map[string]int32{"all": 0, "in_stock": 0, "issued": 0, "maintenance": 0, "retired": 0}
	for _, s := range rows {
		totals["all"] += s.N
		if k := strings.ToLower(s.Status); k == "in_stock" || k == "issued" || k == "maintenance" || k == "retired" {
			totals[k] = s.N
		}
	}
	respond.OK(w, map[string]any{"totals": totals})
}

// issueToVehicle is EBoarderService.issue_to_vehicle.
func issueToVehicle(ctx context.Context, q *db.Queries, who *events.Actor, eb db.MobilityEboarder, vehicle,
	account uuid.UUID) error {
	locked, err := q.EBoarderForUpdate(ctx, eb.ID)
	if err != nil {
		return err
	}
	if locked.Status != "IN_STOCK" {
		return apperr.New("EBOARDER_UNAVAILABLE", fmt.Sprintf("E-boarder %s is %s, not in stock.", locked.Serial,
			locked.Status)).WithStatus(http.StatusConflict)
	}
	if taken, err := q.VehicleHasOtherEBoarder(ctx, db.VehicleHasOtherEBoarderParams{VehicleID: &vehicle,
		ID: locked.ID}); err != nil || taken {
		if err != nil {
			return err
		}
		return apperr.New("VEHICLE_HAS_EBOARDER", "This vehicle already has an e-boarder issued.").
			WithStatus(http.StatusConflict)
	}
	before := locked.Status
	now := time.Now()
	locked.Status, locked.VehicleID, locked.AccountID, locked.CurrentHubID, locked.IssuedAt =
		"ISSUED", &vehicle, &account, nil, &now
	if err := saveEBoarder(ctx, q, locked); err != nil {
		return err
	}
	return events.Emit(ctx, q, events.Event{Action: "eboarder.issued", SubjectType: "eboarder",
		SubjectID: locked.ID.String(), SubjectLabel: locked.Serial, Actor: who,
		Before: events.Map{"status": before, "vehicle_id": nil},
		After:  events.Map{"status": "ISSUED", "vehicle_id": vehicle.String(), "account_id": account.String()}})
}

func saveEBoarder(ctx context.Context, q *db.Queries, b db.MobilityEboarder) error {
	return q.SaveEBoarder(ctx, db.SaveEBoarderParams{ID: b.ID, Serial: b.Serial, Make: b.Make, Model: b.Model,
		RatedWatts: b.RatedWatts, PetrolHpEquivalent: b.PetrolHpEquivalent, NominalVoltageV: b.NominalVoltageV,
		ShaftLength: b.ShaftLength, Status: b.Status, IssuedAt: b.IssuedAt, Raw: b.Raw, AccountID: b.AccountID,
		BatteryTypeID: b.BatteryTypeID, CurrentHubID: b.CurrentHubID, VehicleID: b.VehicleID})
}
