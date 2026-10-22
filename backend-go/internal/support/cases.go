package support

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
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/media"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/scope"
)

var lagos, _ = time.LoadLocation("Africa/Lagos")

// Handler serves /api/v1/support/cases.
type Handler struct {
	pool *pgxpool.Pool
	q    *db.Queries
	cdn  media.Cloudinary
}

func NewHandler(pool *pgxpool.Pool, cdn media.Cloudinary) *Handler {
	return &Handler{pool: pool, q: db.New(pool), cdn: cdn}
}

// CaseDTO is SupportCaseListSerializer.
type CaseDTO struct {
	ID                 string          `json:"id"`
	Code               string          `json:"code"`
	AccountID          string          `json:"account_id"`
	AccountKuraID      string          `json:"account_kura_id"`
	AccountDisplayName string          `json:"account_display_name"`
	Kind               string          `json:"kind"`
	Priority           string          `json:"priority"`
	Status             string          `json:"status"`
	Subject            string          `json:"subject"`
	AssignedToID       *string         `json:"assigned_to_id"`
	AssignedToName     *string         `json:"assigned_to_name"`
	PaymentID          *string         `json:"payment_id"`
	PaymentReceiptCode *string         `json:"payment_receipt_code"`
	PaymentAmountKobo  *int64          `json:"payment_amount_kobo"`
	SLADueAt           *jsontime.Field `json:"sla_due_at"`
	CreatedAt          jsontime.Field  `json:"created_at"`
}

// EventDTO is CaseEventSerializer.
type EventDTO struct {
	ID                    string         `json:"id"`
	Kind                  string         `json:"kind"`
	Body                  string         `json:"body"`
	ActorID               *string        `json:"actor_id"`
	ActorName             *string        `json:"actor_name"`
	AttachmentID          *string        `json:"attachment_id"`
	AttachmentURL         *string        `json:"attachment_url"`
	AttachmentName        *string        `json:"attachment_name"`
	AttachmentContentType *string        `json:"attachment_content_type"`
	CreatedAt             jsontime.Field `json:"created_at"`
}

// CaseDetailDTO is SupportCaseDetailSerializer.
type CaseDetailDTO struct {
	CaseDTO
	DriverID   *string        `json:"driver_id"`
	OpenedByID *string        `json:"opened_by_id"`
	UpdatedAt  jsontime.Field `json:"updated_at"`
	Events     []EventDTO     `json:"events"`
}

func idStr(p *uuid.UUID) *string {
	if p == nil {
		return nil
	}
	s := p.String()
	return &s
}

// personName is "first last" or email / phone / id (nil without a user).
func personName(id *uuid.UUID, first, last, email, phone *string) *string {
	if id == nil {
		return nil
	}
	name := strings.TrimSpace(deref(first) + " " + deref(last))
	for _, v := range []string{name, deref(email), deref(phone)} {
		if v != "" {
			return &v
		}
	}
	s := id.String()
	return &s
}

func deref(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func caseDTO(c db.CaseRowsRow) CaseDTO {
	return CaseDTO{ID: c.ID.String(), Code: c.Code, AccountID: c.AccountID.String(), AccountKuraID: c.AccountKuraID,
		AccountDisplayName: c.AccountDisplayName, Kind: c.Kind, Priority: c.Priority, Status: c.Status,
		Subject: c.Subject, AssignedToID: idStr(c.AssignedToID),
		AssignedToName: personName(c.AssignedToID, c.AssigneeFirst, c.AssigneeLast, c.AssigneeEmail, c.AssigneePhone),
		PaymentID:      idStr(c.PaymentID), PaymentReceiptCode: c.PaymentReceiptCode, PaymentAmountKobo: c.PaymentAmountKobo,
		SLADueAt: jsontime.FieldPtr(c.SlaDueAt), CreatedAt: jsontime.Field(c.CreatedAt)}
}

func (h *Handler) detail(ctx context.Context, c db.CaseRowsRow) (CaseDetailDTO, error) {
	evs, err := h.q.CaseEventRows(ctx, c.ID)
	if err != nil {
		return CaseDetailDTO{}, err
	}
	out := CaseDetailDTO{CaseDTO: caseDTO(c), DriverID: idStr(c.DriverID), OpenedByID: idStr(c.OpenedByID),
		UpdatedAt: jsontime.Field(c.UpdatedAt), Events: make([]EventDTO, len(evs))}
	for i, e := range evs {
		d := EventDTO{ID: e.ID.String(), Kind: e.Kind, Body: e.Body, ActorID: idStr(e.ActorID),
			ActorName:    personName(e.ActorID, e.ActorFirst, e.ActorLast, e.ActorEmail, e.ActorPhone),
			AttachmentID: idStr(e.AttachmentID), CreatedAt: jsontime.Field(e.CreatedAt)}
		if e.AttachmentID != nil {
			d.AttachmentURL = h.cdn.DeliveryURL(&media.Asset{Provider: deref(e.Provider), StorageKey: deref(e.StorageKey),
				ResourceType: deref(e.ResourceType), Visibility: deref(e.Visibility)})
			if n := deref(e.OriginalFilename); n != "" {
				d.AttachmentName = &n
			}
			d.AttachmentContentType = e.ContentType
		}
		out.Events[i] = d
	}
	return out, nil
}

// scope is cases_for: cases:read sees all; hub-scoped staff see accounts
// touching their hubs; everyone else their own accounts.
func (h *Handler) scope(ctx context.Context) (bool, []uuid.UUID, error) {
	p := reqctx.User(ctx)
	if p.Can("cases:read") {
		return true, []uuid.UUID{}, nil
	}
	hubs, err := scope.HubsFor(ctx, h.q, p)
	if err != nil {
		return false, nil, err
	}
	if !hubs.All {
		if len(hubs.IDs) == 0 {
			return false, []uuid.UUID{}, nil
		}
		ids, err := scope.AccountsTouching(ctx, h.q, hubs.IDs)
		return false, ids, err
	}
	uid, _ := uuid.Parse(p.UserID)
	own, err := scope.OwnAccounts(ctx, h.q, uid)
	return false, own, err
}

// nullBool is django-filter's BooleanFilter (NullBooleanSelect): anything
// but true/false/True/False is "no filter".
func nullBool(raw string) *bool {
	t, f := true, false
	switch raw {
	case "true", "True":
		return &t
	case "false", "False":
		return &f
	}
	return nil
}

func (h *Handler) filter(r *http.Request) (db.CasesPageParams, error) {
	qp := decode.Params(r)
	p := db.CasesPageParams{Account: qp.UUID("account"), Status: listq.Exact(r, "status"), Kind: listq.Exact(r, "kind"),
		Priority: listq.Exact(r, "priority"), Unassigned: nullBool(r.URL.Query().Get("unassigned")),
		Sla: listq.Exact(r, "sla"), Q: listq.Search(r)}
	if d := qp.Date("start_date"); d != nil {
		t := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, lagos)
		p.FromAt = &t
	}
	if d := qp.Date("end_date"); d != nil {
		t := time.Date(d.Year(), d.Month(), d.Day()+1, 0, 0, 0, 0, lagos)
		p.ToAt = &t
	}
	if err := qp.Err(); err != nil {
		return p, err
	}
	var err error
	p.AllRows, p.Own, err = h.scope(r.Context())
	return p, err
}

func (h *Handler) rows(ctx context.Context, ids []uuid.UUID) ([]db.CaseRowsRow, error) {
	rows, err := h.q.CaseRows(ctx, ids)
	if err != nil {
		return nil, err
	}
	by := map[uuid.UUID]db.CaseRowsRow{}
	for _, c := range rows {
		by[c.ID] = c
	}
	out := make([]db.CaseRowsRow, 0, len(ids))
	for _, id := range ids {
		if c, ok := by[id]; ok {
			out = append(out, c)
		}
	}
	return out, nil
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p, err := h.filter(r)
	var at *paginate.Key
	if err == nil {
		at, err = paginate.Cursor(r)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	size := paginate.Size(r)
	p.Lim = int32(size + 1)
	if at != nil {
		p.AfterAt, p.Back = &at.CreatedAt, at.Back
		p.AfterID, _ = uuid.Parse(at.ID)
	}
	ids, err := h.q.CasesPage(ctx, p)
	var rows []db.CaseRowsRow
	if err == nil {
		rows, err = h.rows(ctx, paginate.Display(ids, size, p.Back))
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]CaseDTO, len(rows))
	for i, c := range rows {
		out[i] = caseDTO(c)
	}
	respond.OK(w, paginate.BuildCursorPage(r, out, size, at, func(c CaseDTO) paginate.Key {
		return paginate.Key{CreatedAt: time.Time(c.CreatedAt), ID: c.ID}
	}))
}

// object is get_object over cases_for (404 outside the scope).
func (h *Handler) object(r *http.Request) (db.CaseRowsRow, error) {
	ctx := r.Context()
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.CaseRowsRow{}, apperr.NotFound("No SupportCase matches the given query.")
	}
	all, own, err := h.scope(ctx)
	if err != nil {
		return db.CaseRowsRow{}, err
	}
	rows, err := h.q.CaseRows(ctx, []uuid.UUID{id})
	if err != nil {
		return db.CaseRowsRow{}, err
	}
	if len(rows) == 0 || (!all && !contains(own, rows[0].AccountID)) {
		return db.CaseRowsRow{}, apperr.NotFound("No SupportCase matches the given query.")
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

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	c, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondDetail(w, r, c.ID, http.StatusOK)
}

// respondDetail is _reload + SupportCaseDetailSerializer.
func (h *Handler) respondDetail(w http.ResponseWriter, r *http.Request, id uuid.UUID, status int) {
	rows, err := h.q.CaseRows(r.Context(), []uuid.UUID{id})
	if err == nil && len(rows) == 0 {
		err = apperr.NotFound("No SupportCase matches the given query.")
	}
	var out CaseDetailDTO
	if err == nil {
		out, err = h.detail(r.Context(), rows[0])
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.JSON(w, status, out)
}
