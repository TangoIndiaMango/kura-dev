package credit

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/auth"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/router"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platformcfg"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/throttle"
)

type assignReq struct {
	AccountIDs []uuid.UUID     `json:"account_ids"`
	Criteria   json.RawMessage `json:"segment_criteria"`
	Channel    *string         `json:"channel" validate:"omitempty,oneof=APP USSD"`
}

// matchIDs is resolve_account_ids_for_segment (limit 500, empty → 404).
func matchIDs(ctx context.Context, q *db.Queries, c Criteria) ([]uuid.UUID, error) {
	p, err := MatchParams(ctx, q, c)
	if err != nil {
		return nil, err
	}
	p.Lim, p.Off = 500, 0
	rows, err := q.SegmentAccounts(ctx, p)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, apperr.New("SEGMENT_EMPTY", "No accounts match this segment_criteria.").WithStatus(http.StatusNotFound)
	}
	out := make([]uuid.UUID, len(rows))
	for i, a := range rows {
		out[i] = a.ID
	}
	return out, nil
}

// assign is OfferService.assign: explicit ids or a segment, OFFERED rows
// (existing pairs are reused) each with an audit row + rider notice.
func (h *Handler) assign(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	keys := decode.Keys(r)
	var b assignReq
	err := decode.JSON(r, &b)
	d := apperr.Details{}
	if e, ok := apperr.As(err); ok && e.Code == "VALIDATION_ERROR" {
		d, err = e.Details, nil
	}
	criteria := dictField(map[string]any(d), "segment_criteria", b.Criteria, keys["segment_criteria"], false)
	if err == nil && len(b.AccountIDs) > 500 && d["account_ids"] == nil {
		d["account_ids"] = []string{"Ensure this field has no more than 500 elements."}
	}
	if err == nil && len(d) == 0 && len(b.AccountIDs) == 0 && !truthy(map[string]any(ParseCriteria(criteria))) {
		d["non_field_errors"] = []string{"Provide account_ids or segment_criteria."}
	}
	if err == nil && len(d) > 0 {
		err = apperr.Validation(d)
	}
	var o db.CreditProductoffer
	if err == nil {
		o, err = h.offer(r)
	}
	if err == nil {
		err = platformcfg.RequireEnabled(ctx, h.q, "offers")
	}
	if err == nil && o.Status != "ACTIVE" {
		err = apperr.Conflict("OFFER_NOT_ACTIVE", "Only ACTIVE offers can be assigned.")
	}
	idsList := b.AccountIDs
	if err == nil && len(idsList) == 0 {
		c := ParseCriteria(criteria)
		if !truthy(map[string]any(c)) {
			c = ParseCriteria(o.SegmentCriteria)
		}
		idsList, err = matchIDs(ctx, h.q, c)
	}
	channel := "APP"
	if b.Channel != nil {
		channel = *b.Channel
	}
	made := []string{}
	if err == nil {
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			for _, id := range idsList {
				acct, err := q.AccountByID(ctx, id)
				if database.IsNoRows(err) {
					return apperr.NotFound("Account not found.") // Django: DoesNotExist → 500
				}
				if err != nil {
					return err
				}
				row, err := q.AssignmentByAccountOffer(ctx, db.AssignmentByAccountOfferParams{AccountID: id, OfferID: o.ID})
				if database.IsNoRows(err) {
					row.ID = ids.New()
					err = q.InsertOfferAssignment(ctx, db.InsertOfferAssignmentParams{ID: row.ID, Channel: channel,
						AccountID: id, OfferID: o.ID})
				}
				if err != nil {
					return err
				}
				made = append(made, row.ID.String())
				if err := events.Emit(ctx, q, events.Event{Action: "offer.assigned", SubjectType: "offer_assignment",
					SubjectID: row.ID.String(), Actor: who,
					After: events.Map{"offer_id": o.ID.String(), "account_id": id.String()},
					Notify: []events.NotifySpec{{UserID: acct.OwnerUserID, Title: "New offer available", Body: o.Name,
						Severity: events.Info, DedupeKey: "offer.assign:" + row.ID.String()}}}); err != nil {
					return err
				}
			}
			return nil
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, map[string]any{"assigned": len(made), "assignment_ids": made})
}

type acceptReq struct {
	PinGrant string `json:"pin_grant" validate:"required"`
	Amount   *int64 `json:"amount_kobo" validate:"omitempty,min=1"`
}

// accept is OfferService.accept: serializer, get_object (scoped), offers
// on, the rider's PIN grant, OFFERED → ACCEPTED.
func (h *Handler) accept(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b acceptReq
	err := decode.JSON(r, &b)
	var a db.CreditOfferassignment
	if err == nil {
		id, perr := uuid.Parse(r.PathValue("id"))
		if perr != nil {
			err = apperr.NotFound("Not found.")
		} else if a, err = h.q.AssignmentByID(ctx, id); database.IsNoRows(err) {
			err = apperr.NotFound("No OfferAssignment matches the given query.")
		}
	}
	if err == nil && !reqctx.User(ctx).Can("offers:manage") {
		acct, aerr := accountFor(ctx, h.q)
		if aerr != nil {
			err = aerr
		} else if acct.ID != a.AccountID {
			err = apperr.NotFound("No OfferAssignment matches the given query.")
		}
	}
	if err == nil {
		err = platformcfg.RequireEnabled(ctx, h.q, "offers")
	}
	if err == nil {
		err = h.tokens.AssertPinGrant(b.PinGrant, me(ctx))
	}
	if err == nil && a.Status != "OFFERED" {
		err = apperr.Conflict("INVALID_TRANSITION", fmt.Sprintf("Cannot accept assignment in %s.", a.Status))
	}
	if err == nil {
		if b.Amount != nil {
			a.AmountKobo = b.Amount
		}
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			if err := q.SaveAssignmentAccepted(ctx, db.SaveAssignmentAcceptedParams{ID: a.ID, AmountKobo: a.AmountKobo}); err != nil {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "offer.accepted", SubjectType: "offer_assignment",
				SubjectID: a.ID.String(), Actor: who, After: events.Map{"status": "ACCEPTED", "amount_kobo": a.AmountKobo}})
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, map[string]any{"id": a.ID.String(), "status": "ACCEPTED", "amount_kobo": a.AmountKobo,
		"offer_id": a.OfferID.String()})
}

// Module mounts /api/v1/credit, /offers (alias) and /segments.
type Module struct {
	h       *Handler
	limiter *throttle.Limiter
}

func NewModule(pool *pgxpool.Pool, tokens *auth.Tokens, limiter *throttle.Limiter) *Module {
	return &Module{h: &Handler{pool: pool, q: db.New(pool), tokens: tokens}, limiter: limiter}
}

func (m *Module) Register(mux *http.ServeMux) {
	h := m.h
	c := router.New(mux, "/api/v1/credit", m.limiter)
	c.User("GET", "/eligibility/", h.eligibility)
	c.User("GET", "/applications/", h.applications)
	c.User("POST", "/applications/", h.apply)
	c.User("GET", "/applications/{id}/", h.getApplication)
	c.Cap("POST", "/applications/{id}/approve/", "credit:approve", h.decide(true))
	c.Cap("POST", "/applications/{id}/decline/", "credit:approve", h.decide(false))
	c.User("GET", "/loans/", h.loans)
	c.User("GET", "/loans/{id}/", h.getLoan)
	c.User("POST", "/loans/{id}/repay/", h.repay)
	c.Cap("GET", "/scores/", "credit:approve", h.scores)
	c.Cap("POST", "/scores/{account_id}/override/", "credit:approve", h.override)
	for _, prefix := range []string{"/api/v1/credit/offers", "/api/v1/offers"} {
		o := router.New(mux, prefix, m.limiter)
		o.Cap("GET", "/", "offers:manage", h.offers)
		o.Cap("POST", "/", "offers:manage", h.createOffer)
		o.User("GET", "/mine/", h.mine)
		o.Cap("GET", "/{id}/", "offers:manage", h.getOffer)
		o.Cap("PATCH", "/{id}/", "offers:manage", h.patchOffer)
		o.Cap("POST", "/{id}/assign/", "offers:manage", h.assign)
	}
	router.New(mux, "/api/v1/credit/offer-assignments", m.limiter).User("POST", "/{id}/accept/", h.accept)
	router.New(mux, "/api/v1/offers/assignments", m.limiter).User("POST", "/{id}/accept/", h.accept)
	s := router.New(mux, "/api/v1/segments", m.limiter)
	s.Cap("GET", "/", "segments:manage", h.segments)
	s.Cap("POST", "/", "segments:manage", h.createSegment)
	s.Cap("POST", "/preview/", "segments:manage", h.preview)
	s.Cap("GET", "/{id}/", "segments:manage", h.getSegment)
	s.Cap("PATCH", "/{id}/", "segments:manage", h.patchSegment)
	s.Cap("GET", "/{id}/members/", "segments:manage", h.members)
	s.Cap("POST", "/{id}/refresh/", "segments:manage", h.refresh)
}
