package credit

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/auth"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platformcfg"
)

// Handler serves /api/v1/credit, /offers and /segments.
type Handler struct {
	pool   *pgxpool.Pool
	q      *db.Queries
	tokens *auth.Tokens
}

func me(ctx context.Context) uuid.UUID {
	id, _ := uuid.Parse(reqctx.User(ctx).UserID)
	return id
}

// accountFor is account_for_user: the driver's account, else the oldest owned.
func accountFor(ctx context.Context, q *db.Queries) (db.AccountsAccount, error) {
	uid := me(ctx)
	if d, err := q.DriverRowByUser(ctx, uid); err == nil {
		return q.AccountByID(ctx, d.AccountID)
	} else if !database.IsNoRows(err) {
		return db.AccountsAccount{}, err
	}
	a, err := q.FirstOwnedAccount(ctx, uid)
	if database.IsNoRows(err) {
		return a, apperr.New("ACCOUNT_REQUIRED", "Complete profile before continuing.")
	}
	return a, err
}

// readOwn is HasCapabilityOrReadOwn.has_object_permission.
func readOwn(ctx context.Context, owner uuid.UUID) error {
	p := reqctx.User(ctx)
	if p.Can("accounts:manage") || p.Can("accounts:read") || owner.String() == p.UserID {
		return nil
	}
	return apperr.Forbidden("")
}

func (h *Handler) tx(ctx context.Context, fn func(q *db.Queries, who *events.Actor) error) error {
	return database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		who, err := actor.FromRequest(ctx, q)
		if err != nil {
			return err
		}
		return fn(q, who)
	})
}

func (h *Handler) eligibility(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	acct, err := accountFor(ctx, h.q)
	var el Eligibility
	if err == nil {
		el, err = Evaluate(ctx, h.q, acct, strings.TrimSpace(r.Header.Get("X-Kura-Device-Id")))
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, el.Payload)
}

// scopeAccount: credit:approve sees all rows, everyone else their account.
func (h *Handler) scopeAccount(ctx context.Context) (bool, uuid.UUID, error) {
	if reqctx.User(ctx).Can("credit:approve") {
		return true, uuid.Nil, nil
	}
	a, err := accountFor(ctx, h.q)
	return false, a.ID, err
}

func (h *Handler) applications(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	all, acct, err := h.scopeAccount(ctx)
	var at *paginate.Key
	if err == nil {
		at, err = paginate.Cursor(r)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	size := paginate.Size(r)
	p := db.ApplicationsPageParams{AllRows: all, Account: acct, Lim: int32(size + 1)}
	if at != nil {
		p.AfterAt, p.Back = &at.CreatedAt, at.Back
		p.AfterID, _ = uuid.Parse(at.ID)
	}
	rows, err := h.q.ApplicationsPage(ctx, p)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows = paginate.Display(rows, size, p.Back)
	out := make([]AppDTO, 0, len(rows))
	for _, x := range rows {
		a, err := h.q.ApplicationByID(ctx, x.ID)
		if err != nil {
			respond.Error(w, r, err)
			return
		}
		out = append(out, appListDTO(a))
	}
	respond.OK(w, paginate.BuildCursorPage(r, out, size, at, func(d AppDTO) paginate.Key {
		return paginate.Key{CreatedAt: time.Time(d.CreatedAt), ID: d.ID}
	}))
}

// AppDTO is CreditApplicationListSerializer.
type AppDTO struct {
	ID           string         `json:"id"`
	AmountKobo   int64          `json:"amount_kobo"`
	TenorDays    int16          `json:"tenor_days"`
	Status       string         `json:"status"`
	Disbursement string         `json:"disbursement"`
	CreatedAt    jsontime.Field `json:"created_at"`
}

func appListDTO(a db.CreditCreditapplication) AppDTO {
	return AppDTO{ID: a.ID.String(), AmountKobo: a.AmountKobo, TenorDays: a.TenorDays, Status: a.Status,
		Disbursement: a.Disbursement, CreatedAt: jsontime.Field(a.CreatedAt)}
}

// application is get_object: scoped, then the read-own object check.
func (h *Handler) application(r *http.Request) (db.CreditCreditapplication, error) {
	ctx := r.Context()
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.CreditCreditapplication{}, apperr.NotFound("Not found.")
	}
	all, acct, err := h.scopeAccount(ctx)
	if err != nil {
		return db.CreditCreditapplication{}, err
	}
	a, err := h.q.ApplicationByID(ctx, id)
	if database.IsNoRows(err) || (err == nil && !all && a.AccountID != acct) {
		return a, apperr.NotFound("No CreditApplication matches the given query.")
	}
	if err != nil {
		return a, err
	}
	owner, err := h.q.AccountByID(ctx, a.AccountID)
	if err != nil {
		return a, err
	}
	return a, readOwn(ctx, owner.OwnerUserID)
}

func (h *Handler) getApplication(w http.ResponseWriter, r *http.Request) {
	a, err := h.application(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, appListDTO(a))
}

type applyReq struct {
	Amount   *int64 `json:"amount_kobo" validate:"required,min=1"`
	Tenor    *int64 `json:"tenor_days" validate:"required"`
	Key      string `json:"idempotency_key" validate:"required,max=64"`
	PinGrant string `json:"pin_grant" validate:"required"`
}

func (h *Handler) apply(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b applyReq
	err := decode.JSON(r, &b)
	var acct db.AccountsAccount
	if err == nil {
		acct, err = accountFor(ctx, h.q)
	}
	if err == nil {
		err = platformcfg.RequireEnabled(ctx, h.q, "credit")
	}
	if err == nil {
		err = h.tokens.AssertPinGrant(b.PinGrant, me(ctx))
	}
	var out map[string]any
	if err == nil {
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			var err error
			out, err = Apply(ctx, q, ApplyIn{Account: acct, Amount: *b.Amount, Tenor: *b.Tenor, Key: b.Key, Actor: who})
			return err
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.JSON(w, http.StatusCreated, out)
}

// rawReason is request.data.get("reason") or "" (no serializer on approve).
func rawReason(r *http.Request) string {
	body, _ := io.ReadAll(r.Body)
	var m map[string]any
	if json.Unmarshal(body, &m) == nil {
		if s, ok := m["reason"].(string); ok {
			return s
		}
	}
	return ""
}

type declineReq struct {
	Reason string `json:"reason"`
}

func (h *Handler) decide(approve bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		a, err := h.application(r)
		reason := ""
		if err == nil && approve {
			reason = rawReason(r)
		} else if err == nil {
			var b declineReq
			err = decode.JSON(r, &b)
			reason = strings.TrimSpace(b.Reason)
		}
		var out map[string]any
		if err == nil {
			err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
				var err error
				out, err = Decide(ctx, q, a.ID, approve, me(ctx), who, reason)
				return err
			})
		}
		if err != nil {
			respond.Error(w, r, err)
			return
		}
		respond.OK(w, out)
	}
}
