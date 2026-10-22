package operations

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/scope"
)

// Handler serves /api/v1/operations/*.
type Handler struct {
	pool *pgxpool.Pool
	q    *db.Queries
	svc  *Service
}

func NewHandler(pool *pgxpool.Pool, svc *Service) *Handler {
	return &Handler{pool: pool, q: db.New(pool), svc: svc}
}

// ShiftDTO is ShiftListSerializer.
type ShiftDTO struct {
	ID               string          `json:"id"`
	AgentID          string          `json:"agent_id"`
	AgentName        string          `json:"agent_name"`
	HubID            string          `json:"hub_id"`
	HubCode          string          `json:"hub_code"`
	HubName          string          `json:"hub_name"`
	OpenedAt         jsontime.Field  `json:"opened_at"`
	ClosedAt         *jsontime.Field `json:"closed_at"`
	OpeningCashKobo  int64           `json:"opening_cash_kobo"`
	ClosingCashKobo  *int64          `json:"closing_cash_kobo"`
	ExpectedCashKobo *int64          `json:"expected_cash_kobo"`
	VarianceKobo     *int64          `json:"variance_kobo"`
	LodgeRef         string          `json:"lodge_ref"`
	LodgedAmountKobo *int64          `json:"lodged_amount_kobo"`
	LodgedAt         *jsontime.Field `json:"lodged_at"`
	Status           string          `json:"status"`
	CreatedAt        jsontime.Field  `json:"created_at"`
	CollectedCash    int64           `json:"collected_cash_kobo"`
	IsStale          bool            `json:"is_stale"`
	AutoClosed       bool            `json:"auto_closed"`
}

// ShiftDetailDTO is ShiftDetailSerializer.
type ShiftDetailDTO struct {
	ShiftDTO
	DepositIDs []string       `json:"deposit_ids"`
	UpdatedAt  jsontime.Field `json:"updated_at"`
}

func personName(first, last string, email, phone *string, id uuid.UUID) string {
	if n := strings.TrimSpace(first + " " + last); n != "" {
		return n
	}
	for _, v := range []*string{email, phone} {
		if v != nil && *v != "" {
			return *v
		}
	}
	return id.String()
}

func shiftDTO(s db.ShiftRowsRow) ShiftDTO {
	return ShiftDTO{ID: s.ID.String(), AgentID: s.AgentID.String(),
		AgentName: personName(s.AgentFirst, s.AgentLast, s.AgentEmail, s.AgentPhone, s.AgentID),
		HubID:     s.HubID.String(), HubCode: s.HubCode, HubName: s.HubName, OpenedAt: jsontime.Field(s.OpenedAt),
		ClosedAt: jsontime.FieldPtr(s.ClosedAt), OpeningCashKobo: s.OpeningCashKobo, ClosingCashKobo: s.ClosingCashKobo,
		ExpectedCashKobo: s.ExpectedCashKobo, VarianceKobo: s.VarianceKobo, LodgeRef: s.LodgeRef,
		LodgedAmountKobo: s.LodgedAmountKobo, LodgedAt: jsontime.FieldPtr(s.LodgedAt), Status: s.Status,
		CreatedAt: jsontime.Field(s.CreatedAt), CollectedCash: s.CollectedCashKobo,
		IsStale: s.ClosedAt == nil && s.OpenedAt.Before(time.Now().Add(-24*time.Hour)), AutoClosed: s.AutoClosed}
}

// hubScope is hub_ids_for: all, or these hubs (possibly none).
func (h *Handler) hubScope(ctx context.Context) (bool, []uuid.UUID, error) {
	hubs, err := scope.HubsFor(ctx, h.q, reqctx.User(ctx))
	if err != nil {
		return false, nil, err
	}
	if hubs.IDs == nil {
		hubs.IDs = []uuid.UUID{}
	}
	return hubs.All, hubs.IDs, nil
}

func shiftOrdering(raw string) string {
	for _, t := range strings.Split(raw, ",") {
		switch t = strings.TrimSpace(t); strings.TrimPrefix(t, "-") {
		case "opened_at", "closed_at":
			return t
		}
	}
	return ""
}

func midnight(d time.Time, days int) *time.Time {
	t := time.Date(d.Year(), d.Month(), d.Day()+days, 0, 0, 0, 0, lagos)
	return &t
}

func (h *Handler) shifts(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	qp := decode.Params(r)
	p := db.ShiftIDsParams{Status: listq.Exact(r, "status"), Hub: qp.UUID("hub"), Agent: qp.UUID("agent"),
		Ord: shiftOrdering(r.URL.Query().Get("ordering"))}
	if d := qp.Date("start_date"); d != nil {
		p.FromAt = midnight(*d, 0)
	}
	if d := qp.Date("end_date"); d != nil {
		p.ToAt = midnight(*d, 1)
	}
	err := qp.Err()
	if err == nil {
		p.AllHubs, p.Hubs, err = h.hubScope(ctx)
	}
	var total int64
	if err == nil {
		total, err = h.q.CountShifts(ctx, db.CountShiftsParams{AllHubs: p.AllHubs, Hubs: p.Hubs, Status: p.Status,
			Hub: p.Hub, Agent: p.Agent, FromAt: p.FromAt, ToAt: p.ToAt})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	page, size := paginate.Page(r), paginate.Size(r)
	p.Lim, p.Off = int32(size), int32(paginate.Offset(page, size))
	ids, err := h.q.ShiftIDs(ctx, p)
	var rows []db.ShiftRowsRow
	if err == nil {
		rows, err = h.shiftRows(ctx, ids)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]ShiftDTO, len(rows))
	for i, s := range rows {
		out[i] = shiftDTO(s)
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

func (h *Handler) shiftRows(ctx context.Context, ids []uuid.UUID) ([]db.ShiftRowsRow, error) {
	rows, err := h.q.ShiftRows(ctx, ids)
	if err != nil {
		return nil, err
	}
	by := map[uuid.UUID]db.ShiftRowsRow{}
	for _, s := range rows {
		by[s.ID] = s
	}
	out := make([]db.ShiftRowsRow, 0, len(ids))
	for _, id := range ids {
		if s, ok := by[id]; ok {
			out = append(out, s)
		}
	}
	return out, nil
}

// shift is get_object over the hub-scoped queryset.
func (h *Handler) shift(r *http.Request) (db.ShiftRowsRow, error) {
	ctx := r.Context()
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.ShiftRowsRow{}, apperr.NotFound("Not found.")
	}
	return h.scopedShift(ctx, id)
}

func (h *Handler) scopedShift(ctx context.Context, id uuid.UUID) (db.ShiftRowsRow, error) {
	all, hubs, err := h.hubScope(ctx)
	if err != nil {
		return db.ShiftRowsRow{}, err
	}
	rows, err := h.q.ShiftRows(ctx, []uuid.UUID{id})
	if err != nil {
		return db.ShiftRowsRow{}, err
	}
	if len(rows) == 0 || (!all && !contains(hubs, rows[0].HubID)) {
		return db.ShiftRowsRow{}, apperr.NotFound("No Shift matches the given query.")
	}
	return rows[0], nil
}

func contains(ids []uuid.UUID, id uuid.UUID) bool {
	for _, x := range ids {
		if x == id {
			return true
		}
	}
	return false
}

func (h *Handler) respondShift(w http.ResponseWriter, r *http.Request, id uuid.UUID, status int) {
	s, err := h.scopedShift(r.Context(), id)
	var deps []uuid.UUID
	if err == nil {
		deps, err = h.q.ShiftDepositIDs(r.Context(), id)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := ShiftDetailDTO{ShiftDTO: shiftDTO(s), DepositIDs: make([]string, len(deps)), UpdatedAt: jsontime.Field(s.UpdatedAt)}
	for i, d := range deps {
		out.DepositIDs[i] = d.String()
	}
	respond.JSON(w, status, out)
}

func (h *Handler) getShift(w http.ResponseWriter, r *http.Request) {
	s, err := h.shift(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondShift(w, r, s.ID, http.StatusOK)
}
