package mobility

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/qr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/scope"
)

// VehicleDTO is VehicleListSerializer.
type VehicleDTO struct {
	ID                         string          `json:"id"`
	RegistrationPlate          string          `json:"registration_plate"`
	Make                       string          `json:"make"`
	ModelName                  string          `json:"model_name"`
	VehicleType                string          `json:"vehicle_type"`
	BatteryTypeName            string          `json:"battery_type_name"`
	AccountID                  string          `json:"account_id"`
	OwnerName                  string          `json:"owner_name"`
	OwnerKuraID                string          `json:"owner_kura_id"`
	CurrentBatterySerial       *string         `json:"current_battery_serial"`
	CurrentBatteryCharge       *int32          `json:"current_battery_charge"`
	CurrentBatteryChargeSource *string         `json:"current_battery_charge_source"`
	CurrentBatteryChargeAt     *jsontime.Field `json:"current_battery_charge_at"`
	AssignedDriverID           *string         `json:"assigned_driver_id"`
	AssignedDriverName         *string         `json:"assigned_driver_name"`
	EstimatedRangeKm           *int64          `json:"estimated_range_km"`
	PayPerSwapKobo             *int64          `json:"pay_per_swap_kobo"`
	HardwareID                 *string         `json:"hardware_id"`
	Vin                        string          `json:"vin"`
	Status                     string          `json:"status"`
	CreatedAt                  jsontime.Field  `json:"created_at"`
}

// VehicleDetailDTO is VehicleDetailSerializer.
type VehicleDetailDTO struct {
	VehicleDTO
	VehicleModelID   string         `json:"vehicle_model_id"`
	CurrentBatteryID *string        `json:"current_battery_id"`
	PetrolEngineID   *string        `json:"petrol_engine_id"`
	AcquisitionPath  string         `json:"acquisition_path"`
	UpdatedAt        jsontime.Field `json:"updated_at"`
}

// estimateRangeKm is range_estimate.estimate_range_km: SoC × usable Wh ×
// SoH / Wh-per-km, truncated.
func estimateRangeKm(v db.VehicleRowsRow) *int64 {
	if v.CurrentBatteryID == nil || v.BatteryUsableWh == nil || v.BatteryWhPerKm == nil ||
		*v.BatteryUsableWh == 0 || *v.BatteryWhPerKm <= 0 {
		return nil
	}
	soc := float64(min(100, max(0, *v.BatteryCharge))) / 100
	health := int32(100)
	if v.BatteryHealth != nil && *v.BatteryHealth != 0 {
		health = *v.BatteryHealth
	}
	soh := float64(min(100, max(50, health))) / 100
	km := int64(soc * float64(*v.BatteryUsableWh) * soh / float64(*v.BatteryWhPerKm))
	return &km
}

// driverName is the assigned driver's "First Last", else phone, else nil.
func driverName(first, last, phone *string) *string {
	if first == nil && phone == nil {
		return nil
	}
	n := strings.TrimSpace(strings.TrimSpace(deref(first)) + " " + strings.TrimSpace(deref(last)))
	if n == "" {
		if phone == nil || *phone == "" {
			return nil
		}
		return phone
	}
	return &n
}

// VehicleHandler serves /api/v1/mobility/vehicles (VehicleViewSet).
type VehicleHandler struct {
	pool *pgxpool.Pool
	q    *db.Queries
	qr   qr.Signer
}

func NewVehicleHandler(pool *pgxpool.Pool, signer qr.Signer) *VehicleHandler {
	return &VehicleHandler{pool: pool, q: db.New(pool), qr: signer}
}

// dtos renders rows; pay-per-swap is cached per vehicle type like the
// serializer's context cache.
func (h *VehicleHandler) dtos(ctx context.Context, rows []db.VehicleRowsRow) ([]VehicleDetailDTO, error) {
	pps := map[string]*int64{}
	out := make([]VehicleDetailDTO, len(rows))
	for i, v := range rows {
		price, seen := pps[v.VehicleType]
		if !seen && v.VehicleType != "" {
			m, err := activeMatrix(ctx, h.q, v.VehicleType) // ensure_defaults + matrix, like resolve_pps_kobo
			if err == nil {
				price = &m.PayPerSwapKobo
			} else if ae, ok := err.(*apperr.Error); !ok || ae.Code != "PRICE_NOT_CONFIGURED" {
				return nil, err
			}
			pps[v.VehicleType] = price
		}
		d := VehicleDTO{ID: v.ID.String(), RegistrationPlate: v.RegistrationPlate, Make: v.Make, ModelName: v.Model,
			VehicleType: v.VehicleType, BatteryTypeName: v.BatteryTypeName, AccountID: v.AccountID.String(),
			OwnerName: v.OwnerName, OwnerKuraID: v.OwnerKuraID, CurrentBatterySerial: v.BatterySerial,
			CurrentBatteryCharge: v.BatteryCharge, CurrentBatteryChargeSource: v.BatteryChargeSource,
			CurrentBatteryChargeAt: jsontime.FieldPtr(v.BatteryChargeAt), AssignedDriverID: idPtr(v.AssignedDriverID),
			EstimatedRangeKm: estimateRangeKm(v), PayPerSwapKobo: price, HardwareID: v.HardwareID, Vin: v.Vin,
			Status: v.Status, CreatedAt: jsontime.Field(v.CreatedAt)}
		if v.AssignedDriverID != nil {
			d.AssignedDriverName = driverName(v.DriverFirst, v.DriverLast, v.DriverPhone)
		}
		out[i] = VehicleDetailDTO{VehicleDTO: d, VehicleModelID: v.VehicleModelID.String(),
			CurrentBatteryID: idPtr(v.CurrentBatteryID), PetrolEngineID: idPtr(v.PetrolEngineID),
			AcquisitionPath: v.AcquisitionPath, UpdatedAt: jsontime.Field(v.UpdatedAt)}
	}
	return out, nil
}

// vehicleScope is vehicles_for.
type vehicleScope struct {
	all              bool
	own, hubs, touch []uuid.UUID
}

func (h *VehicleHandler) scope(ctx context.Context) (vehicleScope, error) {
	p := reqctx.User(ctx)
	if canReadAllMobility(p) {
		return vehicleScope{all: true}, nil
	}
	hubs, err := scope.HubsFor(ctx, h.q, p)
	if err != nil {
		return vehicleScope{}, err
	}
	if !hubs.All {
		touch, err := scope.AccountsTouching(ctx, h.q, hubs.IDs)
		return vehicleScope{hubs: nonNil(hubs.IDs), touch: nonNil(touch), own: []uuid.UUID{}}, err
	}
	uid, _ := uuid.Parse(p.UserID)
	own, err := ownAccounts(ctx, h.q, uid)
	return vehicleScope{own: own, hubs: []uuid.UUID{}, touch: []uuid.UUID{}}, err
}

func nonNil(ids []uuid.UUID) []uuid.UUID {
	if ids == nil {
		return []uuid.UUID{}
	}
	return ids
}

// ownAccounts is _own_account_ids (order irrelevant here).
func ownAccounts(ctx context.Context, q *db.Queries, user uuid.UUID) ([]uuid.UUID, error) {
	return scope.OwnAccounts(ctx, q, user)
}

func (s vehicleScope) allows(ctx context.Context, q *db.Queries, v db.VehicleRowsRow) (bool, error) {
	if s.all || contains(s.own, v.AccountID) || contains(s.touch, v.AccountID) {
		return true, nil
	}
	if len(s.hubs) == 0 {
		return false, nil
	}
	n, err := q.CountVehicles(ctx, db.CountVehiclesParams{HubIds: s.hubs, OwnAccounts: []uuid.UUID{},
		Touching: s.touch, Account: &v.AccountID})
	return n > 0 && err == nil, err
}

func vehicleOrdering(raw string) string {
	for _, t := range strings.Split(raw, ",") {
		switch t = strings.TrimSpace(t); strings.TrimPrefix(t, "-") {
		case "registration_plate", "created_at", "status":
			return t
		}
	}
	return "-created_at"
}

func (h *VehicleHandler) filters(r *http.Request) (db.ListVehicleIDsParams, error) {
	qp := decode.Params(r)
	account := qp.UUID("account")
	if err := qp.Err(); err != nil {
		return db.ListVehicleIDsParams{}, err
	}
	sc, err := h.scope(r.Context())
	return db.ListVehicleIDsParams{AllRows: sc.all, OwnAccounts: nonNil(sc.own), HubIds: nonNil(sc.hubs),
		Touching: nonNil(sc.touch), Account: account, Status: listq.Exact(r, "status"), Q: listq.Search(r),
		Ord: vehicleOrdering(r.URL.Query().Get("ordering"))}, err
}

func (h *VehicleHandler) rows(ctx context.Context, ids []uuid.UUID) ([]db.VehicleRowsRow, error) {
	rows, err := h.q.VehicleRows(ctx, ids)
	if err != nil {
		return nil, err
	}
	by := make(map[uuid.UUID]db.VehicleRowsRow, len(rows))
	for _, r := range rows {
		by[r.ID] = r
	}
	out := make([]db.VehicleRowsRow, 0, len(ids))
	for _, id := range ids {
		if r, ok := by[id]; ok {
			out = append(out, r)
		}
	}
	return out, nil
}

func (h *VehicleHandler) list(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	f, err := h.filters(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	total, err := h.q.CountVehicles(ctx, db.CountVehiclesParams{AllRows: f.AllRows, OwnAccounts: f.OwnAccounts,
		HubIds: f.HubIds, Touching: f.Touching, Account: f.Account, Status: f.Status, Q: f.Q})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	page, size := paginate.Page(r), paginate.Size(r)
	f.Lim, f.Off = int32(size), int32(paginate.Offset(page, size))
	ids, err := h.q.ListVehicleIDs(ctx, f)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows, err := h.rows(ctx, ids)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	full, err := h.dtos(ctx, rows)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]VehicleDTO, len(full))
	for i, d := range full {
		out[i] = d.VehicleDTO
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}
