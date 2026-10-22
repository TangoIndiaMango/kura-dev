package mobility

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/export"
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

// stats is battery_stats.
func (h *BatteryHandler) stats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	all, hubs, err := h.scope(ctx)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	counts, err := h.q.BatteryStatusCounts(ctx, db.BatteryStatusCountsParams{AllRows: all, ScopeIds: hubs})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	st, total := map[string]int32{}, int32(0)
	for _, c := range counts {
		st[c.Status], total = c.N, total+c.N
	}
	types, err := h.q.BatteryTypeCounts(ctx, db.BatteryTypeCountsParams{AllRows: all, ScopeIds: hubs})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	type byType struct {
		Name      string `json:"name"`
		Count     int32  `json:"count"`
		Available int32  `json:"available"`
	}
	bt := make([]byType, len(types))
	for i, t := range types {
		bt[i] = byType{t.Name, t.N, t.Available}
	}
	respond.OK(w, map[string]any{
		"totals": map[string]int32{"all": total, "available": st["AVAILABLE"], "charging": st["CHARGING"],
			"issued": st["ISSUED"], "reserved": st["RESERVED"], "faulted": st["FAULTED"], "retired": st["RETIRED"]},
		"by_type": bt,
	})
}

// types is the unpaginated battery type catalogue.
func (h *BatteryHandler) types(w http.ResponseWriter, r *http.Request) {
	rows, err := h.q.AllBatteryTypes(r.Context())
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]BatteryTypeDTO, len(rows))
	for i, t := range rows {
		out[i] = batteryTypeDTO(t)
	}
	respond.OK(w, out)
}

type batteryEventDTO struct {
	ID                string          `json:"id"`
	Event             string          `json:"event"`
	FromCustodianType string          `json:"from_custodian_type"`
	FromCustodianID   *string         `json:"from_custodian_id"`
	ToCustodianType   string          `json:"to_custodian_type"`
	ToCustodianID     *string         `json:"to_custodian_id"`
	HubID             *string         `json:"hub_id"`
	HubCode           *string         `json:"hub_code"`
	SwapID            *string         `json:"swap_id"`
	ChargePct         *int32          `json:"charge_pct"`
	Meta              json.RawMessage `json:"meta"`
	OccurredAt        jsontime.Field  `json:"occurred_at"`
	RecordedAt        jsontime.Field  `json:"recorded_at"`
	Source            string          `json:"source"`
	ActorLabel        string          `json:"actor_label"`
	PrevHash          string          `json:"prev_hash"`
	RowHash           string          `json:"row_hash"`
}

// events is the custody trail, cursor-paginated newest first.
func (h *BatteryHandler) events(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	b, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	at, err := paginate.Cursor(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	size := paginate.Size(r)
	p := db.BatteryEventsPageParams{BatteryID: b.ID, Lim: int32(size + 1)}
	if at != nil {
		p.AfterAt, p.Back = &at.CreatedAt, at.Back
		p.AfterID, _ = uuid.Parse(at.ID)
	}
	rows, err := h.q.BatteryEventsPage(ctx, p)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows = paginate.Display(rows, size, p.Back)
	out := make([]batteryEventDTO, len(rows))
	for i, e := range rows {
		label := "System"
		if e.ActorID != nil {
			label = firstOf(deref(e.ActorEmail), deref(e.ActorPhone), e.ActorID.String()[:8])
		}
		out[i] = batteryEventDTO{ID: e.ID.String(), Event: e.Event, FromCustodianType: e.FromCustodianType,
			FromCustodianID: idPtr(e.FromCustodianID), ToCustodianType: e.ToCustodianType,
			ToCustodianID: idPtr(e.ToCustodianID), HubID: idPtr(e.HubID), HubCode: e.HubCode,
			SwapID: idPtr(e.SwapID), ChargePct: e.ChargePct, Meta: json.RawMessage(e.Meta),
			OccurredAt: jsontime.Field(e.OccurredAt), RecordedAt: jsontime.Field(e.RecordedAt), Source: e.Source,
			ActorLabel: label, PrevHash: e.PrevHash, RowHash: e.RowHash}
	}
	respond.OK(w, paginate.BuildCursorPage(r, out, size, at, func(e batteryEventDTO) paginate.Key {
		return paginate.Key{CreatedAt: time.Time(e.OccurredAt), ID: e.ID}
	}))
}

func (h *BatteryHandler) export(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	f, err := h.filters(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	f.Lim = export.RowCap + 1
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
	t := export.Table{Stem: "batteries", Title: "Kura batteries", Headers: []string{"id", "serial", "battery_type",
		"status", "charge_pct", "health_pct", "cycle_count", "hub_code", "hub_name", "created_at"}}
	for _, b := range rows {
		t.Rows = append(t.Rows, []string{b.ID.String(), b.Serial, b.TypeName, b.Status, itoa(b.ChargePct),
			itoa(b.HealthPct), itoa(b.CycleCount), deref(b.HubCode), deref(b.HubName), jsontime.FormatISO(b.CreatedAt)})
	}
	if err := export.Write(w, r.URL.Query().Get("export"), t); err != nil {
		respond.Error(w, r, err)
	}
}

func deref(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}
