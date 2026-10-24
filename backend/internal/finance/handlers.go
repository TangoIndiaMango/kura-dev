package finance

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
)

var lagos = func() *time.Location {
	l, err := time.LoadLocation("Africa/Lagos")
	if err != nil {
		panic(err)
	}
	return l
}()

// staffRoles is accounts.helpers.staff.STAFF_ROLES.
var staffRoles = map[string]bool{"SUPER_ADMIN": true, "OPS_MANAGER": true, "HUB_AGENT": true,
	"COMMERCIAL_ADMIN": true, "GOVERNMENT_VIEWER": true, "PARTNER_VIEWER": true, "COOPERATIVE_CHAIRMAN": true}

// Handler serves /api/v1/finance/*.
type Handler struct {
	pool       *pgxpool.Pool
	q          *db.Queries
	receiptKey []byte
	demoFund   bool
	checkout   CheckoutConfig
}

func NewHandler(pool *pgxpool.Pool, receiptKey string, demoFund bool, checkout CheckoutConfig) *Handler {
	return &Handler{pool: pool, q: db.New(pool), receiptKey: []byte(receiptKey), demoFund: demoFund,
		checkout: checkout}
}

// CanReadAll is _can_read_all_finance: wallets:manage, or finance:read held
// by staff (rider roles carry finance:read for their own rows only).
func CanReadAll(p *reqctx.Principal) bool {
	return p.Can("wallets:manage") || (p.Can("finance:read") && (p.IsStaff || staffRoles[p.Role]))
}

// scope is payments_for / wallets_for: everything for finance staff, else
// the caller's own accounts.
func (h *Handler) scope(ctx context.Context) (bool, []uuid.UUID, error) {
	p := reqctx.User(ctx)
	if CanReadAll(p) {
		return true, nil, nil
	}
	uid, _ := uuid.Parse(p.UserID)
	own := []uuid.UUID{}
	if d, err := h.q.DriverRowByUser(ctx, uid); err == nil {
		own = append(own, d.AccountID)
	} else if !database.IsNoRows(err) {
		return false, nil, err
	}
	owned, err := h.q.OwnedAccountIDs(ctx, uid)
	return false, append(own, owned...), err
}

// PaymentDTO is PaymentSerializer.
type PaymentDTO struct {
	ID            string         `json:"id"`
	AccountID     string         `json:"account_id"`
	AccountKuraID string         `json:"account_kura_id"`
	AccountName   string         `json:"account_name"`
	HubID         *string        `json:"hub_id"`
	HubCode       *string        `json:"hub_code"`
	Channel       string         `json:"channel"`
	AmountKobo    int64          `json:"amount_kobo"`
	VatKobo       int64          `json:"vat_kobo"`
	ReceiptCode   string         `json:"receipt_code"`
	Status        string         `json:"status"`
	Purpose       string         `json:"purpose"`
	CreatedAt     jsontime.Field `json:"created_at"`
}

func idPtr(id *uuid.UUID) *string {
	if id == nil {
		return nil
	}
	s := id.String()
	return &s
}

// paymentFilter is PaymentFilter (Lagos days for start/end).
type paymentFilter struct {
	all                         bool
	own                         []uuid.UUID
	account, hub                *uuid.UUID
	status, channel, purpose, q *string
	from, to                    *time.Time
}

func (h *Handler) paymentFilter(r *http.Request) (paymentFilter, error) {
	qp := decode.Params(r)
	f := paymentFilter{account: qp.UUID("account"), hub: qp.UUID("hub"), status: listq.Exact(r, "status"),
		channel: listq.Exact(r, "channel"), purpose: listq.Exact(r, "purpose"), q: listq.Exact(r, "search")}
	if f.q != nil {
		q := escapeLike(*f.q)
		f.q = &q
	}
	if d := qp.Date("start_date"); d != nil {
		t := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, lagos)
		f.from = &t
	}
	if d := qp.Date("end_date"); d != nil {
		t := time.Date(d.Year(), d.Month(), d.Day()+1, 0, 0, 0, 0, lagos)
		f.to = &t
	}
	if err := qp.Err(); err != nil {
		return f, err
	}
	var err error
	f.all, f.own, err = h.scope(r.Context())
	if f.own == nil {
		f.own = []uuid.UUID{}
	}
	return f, err
}

func escapeLike(s string) string {
	out := make([]rune, 0, len(s))
	for _, c := range s {
		if c == '\\' || c == '%' || c == '_' {
			out = append(out, '\\')
		}
		out = append(out, c)
	}
	return string(out)
}

func (h *Handler) payments(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	f, err := h.paymentFilter(r)
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
	p := db.PaymentsPageParams{AllRows: f.all, Own: f.own, Account: f.account, Status: f.status, Channel: f.channel,
		Purpose: f.purpose, Hub: f.hub, Q: f.q, FromAt: f.from, ToAt: f.to, Lim: int32(size + 1)}
	if at != nil {
		p.AfterAt, p.Back = &at.CreatedAt, at.Back
		p.AfterID, _ = uuid.Parse(at.ID)
	}
	rows, err := h.q.PaymentsPage(ctx, p)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows = paginate.Display(rows, size, p.Back)
	out := make([]PaymentDTO, len(rows))
	for i, x := range rows {
		out[i] = PaymentDTO{ID: x.ID.String(), AccountID: x.AccountID.String(), AccountKuraID: x.AccountKuraID,
			AccountName: x.AccountName, HubID: idPtr(x.HubID), HubCode: x.HubCode, Channel: x.Channel,
			AmountKobo: x.AmountKobo, VatKobo: x.VatKobo, ReceiptCode: x.ReceiptCode, Status: x.Status,
			Purpose: x.Purpose, CreatedAt: jsontime.Field(x.CreatedAt)}
	}
	respond.OK(w, paginate.BuildCursorPage(r, out, size, at, func(d PaymentDTO) paginate.Key {
		return paginate.Key{CreatedAt: time.Time(d.CreatedAt), ID: d.ID}
	}))
}

func (h *Handler) paymentStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	f, err := h.paymentFilter(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	s, err := h.q.PaymentStats(ctx, db.PaymentStatsParams{AllRows: f.all, Own: f.own, Account: f.account,
		Status: f.status, Channel: f.channel, Purpose: f.purpose, Hub: f.hub, Q: f.q, FromAt: f.from, ToAt: f.to})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	chans, err := h.q.PaymentChannelTotals(ctx, db.PaymentChannelTotalsParams{AllRows: f.all, Own: f.own,
		Account: f.account, Status: f.status, Channel: f.channel, Purpose: f.purpose, Hub: f.hub, Q: f.q,
		FromAt: f.from, ToAt: f.to})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	type ch struct {
		Channel string `json:"channel"`
		Count   int32  `json:"count"`
		Amount  int64  `json:"amount_kobo"`
	}
	by := make([]ch, len(chans))
	for i, c := range chans {
		by[i] = ch{c.Channel, c.N, c.Total}
	}
	respond.OK(w, map[string]any{"success_kobo": s.SuccessKobo, "success_count": s.Success,
		"pending_count": s.Pending, "failed_count": s.Failed, "by_channel": by})
}

// payment is get_object: scoped (404) then the owner rule (403).
func (h *Handler) payment(r *http.Request) (db.PaymentByIDRow, error) {
	ctx := r.Context()
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.PaymentByIDRow{}, apperr.NotFound("Not found.")
	}
	all, own, err := h.scope(ctx)
	if err != nil {
		return db.PaymentByIDRow{}, err
	}
	p, err := h.q.PaymentByID(ctx, id)
	if database.IsNoRows(err) || (err == nil && !all && !contains(own, p.AccountID)) {
		return p, apperr.NotFound("No Payment matches the given query.")
	}
	if err != nil {
		return p, err
	}
	u := reqctx.User(ctx)
	if u.Can("accounts:manage") || u.Can("accounts:read") || p.OwnerUserID.String() == u.UserID {
		return p, nil
	}
	return p, apperr.Forbidden("")
}

func contains(ids []uuid.UUID, id uuid.UUID) bool {
	for _, x := range ids {
		if x == id {
			return true
		}
	}
	return false
}

func (h *Handler) paymentDetail(w http.ResponseWriter, r *http.Request) {
	p, err := h.payment(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, PaymentDTO{ID: p.ID.String(), AccountID: p.AccountID.String(), AccountKuraID: p.AccountKuraID,
		AccountName: p.AccountName, HubID: idPtr(p.HubID), HubCode: p.HubCode, Channel: p.Channel,
		AmountKobo: p.AmountKobo, VatKobo: p.VatKobo, ReceiptCode: p.ReceiptCode, Status: p.Status,
		Purpose: p.Purpose, CreatedAt: jsontime.Field(p.CreatedAt)})
}
