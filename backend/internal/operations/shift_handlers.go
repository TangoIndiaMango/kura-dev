package operations

import (
	"context"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
)

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

// me is the signed-in staff user as an Agent.
func (h *Handler) me(ctx context.Context) (Agent, error) {
	uid, _ := uuid.Parse(reqctx.User(ctx).UserID)
	u, err := h.q.GetUserByID(ctx, uid)
	return Agent{ID: uid, Email: u.Email, Phone: u.Phone}, err
}

type openShiftReq struct {
	HubID   uuid.UUID `json:"hub_id" validate:"required"`
	Opening *int64    `json:"opening_cash_kobo" validate:"omitempty,min=0"`
}

func (h *Handler) openShift(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b openShiftReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	hub, err := h.q.HubRow(ctx, b.HubID)
	if database.IsNoRows(err) {
		err = apperr.New("VALIDATION_ERROR", "Unknown hub.").WithDetails(apperr.Details{"hub_id": []string{"invalid"}})
	}
	var agent Agent
	if err == nil {
		agent, err = h.me(ctx)
	}
	var sh db.OperationsShift
	if err == nil {
		opening := int64(0)
		if b.Opening != nil {
			opening = *b.Opening
		}
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			var err error
			sh, err = OpenShift(ctx, q, agent, hub, opening, who)
			return err
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondShift(w, r, sh.ID, http.StatusCreated)
}

type closeShiftReq struct {
	Closing *int64 `json:"closing_cash_kobo" validate:"required,min=0"`
	Key     string `json:"idempotency_key"`
}

func (h *Handler) closeShift(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b closeShiftReq
	err := decode.JSON(r, &b)
	var s db.ShiftRowsRow
	if err == nil {
		s, err = h.shift(r)
	}
	if err == nil {
		uid, _ := uuid.Parse(reqctx.User(ctx).UserID)
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			return CloseShift(ctx, q, s.ID, *b.Closing, uid, who)
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondShift(w, r, s.ID, http.StatusOK)
}

type lodgeReq struct {
	Ref    string `json:"lodge_ref" validate:"required,max=100"`
	Amount *int64 `json:"amount_kobo" validate:"omitempty,min=0"`
}

func (h *Handler) lodge(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	keys := decode.Keys(r)
	var b lodgeReq
	err := decode.JSON(r, &b)
	if err == nil && keys["amount_kobo"] && b.Amount == nil {
		err = apperr.Field("amount_kobo", "This field may not be null.")
	}
	var s db.ShiftRowsRow
	if err == nil {
		s, err = h.shift(r)
	}
	if err == nil {
		uid, _ := uuid.Parse(reqctx.User(ctx).UserID)
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			return ConfirmLodge(ctx, q, s.ID, b.Ref, b.Amount, uid, who)
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondShift(w, r, s.ID, http.StatusOK)
}
