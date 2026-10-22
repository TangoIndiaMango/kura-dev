package mobility

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/qr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/scope"
)

const batteryStatuses = "AVAILABLE RESERVED ISSUED RETURNED CHARGING UNAVAILABLE FAULTED LOST RETIRED"

// staffRoles is accounts.helpers.staff.STAFF_ROLES.
var staffRoles = set("SUPER_ADMIN", "OPS_MANAGER", "HUB_AGENT", "COMMERCIAL_ADMIN", "GOVERNMENT_VIEWER",
	"PARTNER_VIEWER", "COOPERATIVE_CHAIRMAN")

// canReadAllMobility is selectors._can_read_all_mobility.
func canReadAllMobility(p *reqctx.Principal) bool {
	if p.Can("accounts:read") || p.Can("vehicles:read") {
		return true
	}
	return p.Can("swaps:read") && (p.IsStaff || staffRoles[p.Role])
}

// BatteryDTO is BatteryListSerializer.
type BatteryDTO struct {
	ID              string         `json:"id"`
	Serial          string         `json:"serial"`
	BatteryTypeID   string         `json:"battery_type_id"`
	BatteryTypeName string         `json:"battery_type_name"`
	Status          string         `json:"status"`
	ChargePct       int32          `json:"charge_pct"`
	ChargeSource    string         `json:"charge_source"`
	HealthPct       int32          `json:"health_pct"`
	CycleCount      int32          `json:"cycle_count"`
	ManufacturedAt  *string        `json:"manufactured_at"`
	CurrentHubID    *string        `json:"current_hub_id"`
	HubCode         *string        `json:"hub_code"`
	HubName         *string        `json:"hub_name"`
	CustodianType   string         `json:"custodian_type"`
	CreatedAt       jsontime.Field `json:"created_at"`
}

// BatteryDetailDTO is BatteryDetailSerializer.
type BatteryDetailDTO struct {
	BatteryDTO
	CustodianID      *string         `json:"custodian_id"`
	VehicleID        *string         `json:"vehicle_id"`
	IssuedAt         *jsontime.Field `json:"issued_at"`
	ExpectedReturnBy *jsontime.Field `json:"expected_return_by"`
	UpdatedAt        jsontime.Field  `json:"updated_at"`
}

func dateStr(d pgtype.Date) *string {
	if !d.Valid {
		return nil
	}
	s := d.Time.Format("2006-01-02")
	return &s
}

func batteryDTO(b db.BatteryRowsRow) BatteryDTO {
	return BatteryDTO{ID: b.ID.String(), Serial: b.Serial, BatteryTypeID: b.BatteryTypeID.String(),
		BatteryTypeName: b.TypeName, Status: b.Status, ChargePct: b.ChargePct, ChargeSource: b.ChargeSource,
		HealthPct: b.HealthPct, CycleCount: b.CycleCount, ManufacturedAt: dateStr(b.ManufacturedAt),
		CurrentHubID: idPtr(b.CurrentHubID), HubCode: b.HubCode, HubName: b.HubName,
		CustodianType: b.CustodianType, CreatedAt: jsontime.Field(b.CreatedAt)}
}

func batteryDetailDTO(b db.BatteryRowsRow) BatteryDetailDTO {
	d := BatteryDetailDTO{BatteryDTO: batteryDTO(b), CustodianID: idPtr(b.CustodianID),
		IssuedAt: jsontime.FieldPtr(b.IssuedAt), ExpectedReturnBy: jsontime.FieldPtr(b.ExpectedReturnBy),
		UpdatedAt: jsontime.Field(b.UpdatedAt)}
	if b.VehicleID != "" {
		d.VehicleID = &b.VehicleID
	}
	return d
}

// BatteryHandler serves /api/v1/mobility/batteries (BatteryViewSet).
type BatteryHandler struct {
	pool *pgxpool.Pool
	q    *db.Queries
	qr   qr.Signer
}

func NewBatteryHandler(pool *pgxpool.Pool, signer qr.Signer) *BatteryHandler {
	return &BatteryHandler{pool: pool, q: db.New(pool), qr: signer}
}

// scope is batteries_queryset: all for battery / mobility readers, else the
// caller's hubs plus anything mounted on a vehicle.
func (h *BatteryHandler) scope(ctx context.Context) (bool, []uuid.UUID, error) {
	p := reqctx.User(ctx)
	if p.Can("batteries:read") || canReadAllMobility(p) {
		return true, nil, nil
	}
	hubs, err := scope.HubsFor(ctx, h.q, p)
	if err != nil || hubs.All {
		return true, nil, err
	}
	if len(hubs.IDs) == 0 {
		return false, []uuid.UUID{}, nil
	}
	return false, hubs.IDs, nil
}

func batteryOrdering(raw string) string {
	for _, t := range strings.Split(raw, ",") {
		switch t = strings.TrimSpace(t); strings.TrimPrefix(t, "-") {
		case "created_at", "serial", "status", "charge_pct", "health_pct":
			return t
		}
	}
	return "-created_at"
}

// modelChoice is django-filter's ModelChoiceFilter: the id must exist.
func modelChoice(r *http.Request, name string, exists func(uuid.UUID) (bool, error)) (*uuid.UUID, error) {
	raw := r.URL.Query().Get(name)
	if raw == "" {
		return nil, nil
	}
	bad := apperr.Field(name, "Select a valid choice. That choice is not one of the available choices.")
	id, err := uuid.Parse(strings.TrimSpace(raw))
	if err != nil {
		return nil, bad
	}
	ok, err := exists(id)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, bad
	}
	return &id, nil
}

func (h *BatteryHandler) filters(r *http.Request) (db.ListBatteryIDsParams, error) {
	ctx := r.Context()
	f := db.ListBatteryIDsParams{Q: listq.Search(r), Ord: batteryOrdering(r.URL.Query().Get("ordering"))}
	var err error
	if f.Status, err = listq.Choice(r, "status", strings.Fields(batteryStatuses)...); err != nil {
		return f, err
	}
	if f.BatteryType, err = modelChoice(r, "battery_type", func(id uuid.UUID) (bool, error) {
		_, e := h.q.BatteryTypeByID(ctx, id)
		return e == nil, ignoreNoRows(e)
	}); err != nil {
		return f, err
	}
	if f.Hub, err = modelChoice(r, "current_hub", func(id uuid.UUID) (bool, error) {
		return h.q.HubExists(ctx, id)
	}); err != nil {
		return f, err
	}
	f.AllRows, f.ScopeIds, err = h.scope(ctx)
	return f, err
}

func (h *BatteryHandler) rows(ctx context.Context, ids []uuid.UUID) ([]db.BatteryRowsRow, error) {
	rows, err := h.q.BatteryRows(ctx, ids)
	if err != nil {
		return nil, err
	}
	by := make(map[uuid.UUID]db.BatteryRowsRow, len(rows))
	for _, r := range rows {
		by[r.ID] = r
	}
	out := make([]db.BatteryRowsRow, 0, len(ids))
	for _, id := range ids {
		if r, ok := by[id]; ok {
			out = append(out, r)
		}
	}
	return out, nil
}

func (h *BatteryHandler) list(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	f, err := h.filters(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	total, err := h.q.CountBatteries(ctx, db.CountBatteriesParams{AllRows: f.AllRows, ScopeIds: f.ScopeIds,
		Status: f.Status, BatteryType: f.BatteryType, Hub: f.Hub, Q: f.Q})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	page, size := paginate.Page(r), paginate.Size(r)
	f.Lim, f.Off = int32(size), int32(paginate.Offset(page, size))
	ids, err := h.q.ListBatteryIDs(ctx, f)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows, err := h.rows(ctx, ids)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]BatteryDTO, len(rows))
	for i, b := range rows {
		out[i] = batteryDTO(b)
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

// object is get_object within batteries_queryset.
func (h *BatteryHandler) object(r *http.Request) (db.BatteryRowsRow, error) {
	ctx := r.Context()
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.BatteryRowsRow{}, apperr.NotFound("Not found.")
	}
	return h.load(ctx, id)
}

// load reads one battery the caller may see (also _reload after writes).
func (h *BatteryHandler) load(ctx context.Context, id uuid.UUID) (db.BatteryRowsRow, error) {
	all, hubs, err := h.scope(ctx)
	if err != nil {
		return db.BatteryRowsRow{}, err
	}
	rows, err := h.q.BatteryRows(ctx, []uuid.UUID{id})
	if err != nil {
		return db.BatteryRowsRow{}, err
	}
	nf := apperr.NotFound("No Battery matches the given query.")
	if len(rows) == 0 {
		return db.BatteryRowsRow{}, nf
	}
	b := rows[0]
	if !all && b.VehicleID == "" && (b.CurrentHubID == nil || !contains(hubs, *b.CurrentHubID)) {
		return db.BatteryRowsRow{}, nf
	}
	return b, nil
}

func (h *BatteryHandler) get(w http.ResponseWriter, r *http.Request) {
	b, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, batteryDetailDTO(b))
}
