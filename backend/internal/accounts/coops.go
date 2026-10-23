package accounts

import (
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/actor"
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
)

// CoopDTO is CooperativeListSerializer; detail adds account_ids + updated_at.
type CoopDTO struct {
	ID             string          `json:"id"`
	Name           string          `json:"name"`
	Region         string          `json:"region"`
	Status         string          `json:"status"`
	ChairmanUserID *string         `json:"chairman_user_id"`
	ChairmanEmail  *string         `json:"chairman_email"`
	MemberCount    int32           `json:"member_count"`
	CreatedAt      jsontime.Field  `json:"created_at"`
	AccountIDs     *[]string       `json:"account_ids,omitempty"`
	UpdatedAt      *jsontime.Field `json:"updated_at,omitempty"`
}

// CoopHandler serves /api/v1/cooperatives (CooperativeViewSet).
type CoopHandler struct {
	pool *pgxpool.Pool
	q    *db.Queries
}

func NewCoopHandler(pool *pgxpool.Pool) *CoopHandler {
	return &CoopHandler{pool: pool, q: db.New(pool)}
}

// visibility: managers / CRM readers see all; a chairman sees their own.
func coopScope(r *http.Request) (bool, *uuid.UUID) {
	p := reqctx.User(r.Context())
	if p.Can("cooperatives:manage") || p.Can("accounts:read") {
		return true, nil
	}
	id, _ := uuid.Parse(p.UserID)
	return false, &id
}

func (h *CoopHandler) list(w http.ResponseWriter, r *http.Request) {
	all, chair := coopScope(r)
	page, size := paginate.Page(r), paginate.Size(r)
	q := listq.Search(r)
	total, err := h.q.CountCooperatives(r.Context(), db.CountCooperativesParams{AllRows: all, Chairman: chair, Q: q})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows, err := h.q.ListCooperatives(r.Context(), db.ListCooperativesParams{AllRows: all, Chairman: chair,
		Q: q, Lim: int32(size), Off: int32(paginate.Offset(page, size))})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]CoopDTO, len(rows))
	for i, c := range rows {
		out[i] = coopDTO(db.GetCooperativeRow(c))
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

func coopDTO(c db.GetCooperativeRow) CoopDTO {
	d := CoopDTO{ID: c.ID.String(), Name: c.Name, Region: c.Region, Status: c.Status,
		ChairmanEmail: c.ChairmanEmail, MemberCount: c.MemberCount, CreatedAt: jsontime.Field(c.CreatedAt)}
	if c.ChairmanUserID != nil {
		d.ChairmanUserID = strPtr(c.ChairmanUserID.String())
	}
	return d
}

// detail loads one cooperative within the caller's visibility.
func (h *CoopHandler) detail(r *http.Request, q *db.Queries, id uuid.UUID) (CoopDTO, error) {
	c, err := q.GetCooperative(r.Context(), id)
	all, chair := coopScope(r)
	if database.IsNoRows(err) || (err == nil && !all && (c.ChairmanUserID == nil || *c.ChairmanUserID != *chair)) {
		return CoopDTO{}, apperr.NotFound("No Cooperative matches the given query.")
	}
	if err != nil {
		return CoopDTO{}, err
	}
	accts, err := q.CooperativeAccountIDs(r.Context(), &id)
	if err != nil {
		return CoopDTO{}, err
	}
	d := coopDTO(c)
	ids := make([]string, len(accts))
	for i, a := range accts {
		ids[i] = a.String()
	}
	upd := jsontime.Field(c.UpdatedAt)
	d.AccountIDs, d.UpdatedAt = &ids, &upd
	return d, nil
}

func (h *CoopHandler) get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, r, apperr.NotFound("Not found."))
		return
	}
	d, err := h.detail(r, h.q, id)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, d)
}

type coopWrite struct {
	Name   *string `json:"name" validate:"omitempty,max=200"`
	Region *string `json:"region" validate:"omitempty,max=100"`
	Status *string `json:"status" validate:"omitempty,oneof=ACTIVE INACTIVE"`
}

func (h *CoopHandler) create(w http.ResponseWriter, r *http.Request) {
	var b coopWrite
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	if b.Name == nil {
		respond.Error(w, r, apperr.Field("name", "This field is required."))
		return
	}
	if *b.Name == "" {
		respond.Error(w, r, apperr.Field("name", "This field may not be blank."))
		return
	}
	name := strings.TrimSpace(*b.Name)
	if name == "" {
		respond.Error(w, r, apperr.New("VALIDATION_ERROR", "Cooperative name is required.").
			WithDetails(apperr.Details{"name": []string{"required"}}))
		return
	}
	region := ""
	if b.Region != nil {
		region = strings.TrimSpace(*b.Region)
	}
	id := ids.New()
	var out CoopDTO
	err := database.InTx(r.Context(), h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		if err := q.InsertCooperative(r.Context(), db.InsertCooperativeParams{ID: id, Name: name, Region: region}); err != nil {
			return err
		}
		who, err := actor.FromRequest(r.Context(), q)
		if err != nil {
			return err
		}
		if err := events.Emit(r.Context(), q, events.Event{Action: "cooperative.created", SubjectType: "cooperative",
			SubjectID: id.String(), SubjectLabel: name, Actor: who,
			After: events.Map{"name": name, "region": region, "status": "ACTIVE"}}); err != nil {
			return err
		}
		out, err = h.detail(r, q, id)
		return err
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.Created(w, out)
}
