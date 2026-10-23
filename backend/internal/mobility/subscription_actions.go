package mobility

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
)

type renewReq struct {
	Code     string  `json:"discount_code"`
	Key      string  `json:"idempotency_key"`
	PinGrant string  `json:"pin_grant" validate:"required"`
	Channel  *string `json:"channel" validate:"omitempty,oneof=App USSD Hub"`
}

func (h *SubscriptionHandler) renew(w http.ResponseWriter, r *http.Request) {
	var b renewReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	s, err := h.object(r)
	var who *events.Actor
	if err == nil {
		who, err = h.who(r)
	}
	if err == nil {
		err = h.billing.Renew(r.Context(), s.ID, who, b.Code, b.Key, channelOr(b.Channel), b.PinGrant)
	}
	h.respond(w, r, s.ID, http.StatusOK, err)
}

type switchReq struct {
	Plan      uuid.UUID `json:"plan" validate:"required"`
	Immediate *bool     `json:"immediate"`
	Code      string    `json:"discount_code"`
	Key       string    `json:"idempotency_key"`
	PinGrant  string    `json:"pin_grant"`
	Channel   *string   `json:"channel" validate:"omitempty,oneof=App USSD Hub"`
}

// switchPreview: the plan is loaded before the subscription, like the view.
func (h *SubscriptionHandler) switchPreview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b switchReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	plan, err := h.plan(ctx, b.Plan)
	var s db.SubscriptionRowsRow
	if err == nil {
		s, err = h.object(r)
	}
	var p SwitchPreview
	if err == nil {
		var sub db.MobilitySubscription
		if sub, err = h.q.SubscriptionForUpdate(ctx, s.ID); err == nil { // plain read outside a tx
			p, err = previewSwitch(ctx, h.q, sub, plan, b.Immediate, b.Code, channelOr(b.Channel))
		}
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, p)
}

func (h *SubscriptionHandler) doSwitch(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b switchReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	plan, err := h.plan(ctx, b.Plan)
	var s db.SubscriptionRowsRow
	if err == nil {
		s, err = h.object(r)
	}
	var who *events.Actor
	if err == nil {
		who, err = h.who(r)
	}
	id := s.ID
	if err == nil {
		id, err = h.billing.Switch(ctx, SwitchIn{Sub: s.ID, Plan: plan, Actor: who, Immediate: b.Immediate,
			Code: b.Code, Key: b.Key, Channel: channelOr(b.Channel), PinGrant: b.PinGrant})
	}
	h.respond(w, r, id, http.StatusOK, err)
}

type cancelReq struct {
	Reason string `json:"reason"`
}

func (h *SubscriptionHandler) cancel(w http.ResponseWriter, r *http.Request) {
	var b cancelReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	s, err := h.object(r)
	var who *events.Actor
	if err == nil {
		who, err = h.who(r)
	}
	if err == nil {
		err = h.billing.Cancel(r.Context(), s.ID, who, b.Reason)
	}
	h.respond(w, r, s.ID, http.StatusOK, err)
}

type autoRenewReq struct {
	AutoRenew *bool `json:"auto_renew" validate:"required"`
}

func (h *SubscriptionHandler) autoRenew(w http.ResponseWriter, r *http.Request) {
	var b autoRenewReq
	keys := decode.Keys(r)
	err := decode.JSON(r, &b)
	if e, ok := apperr.As(err); ok && keys["auto_renew"] && b.AutoRenew == nil && e.Details["auto_renew"] != nil {
		e.Details["auto_renew"] = []string{"This field may not be null."}
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	s, err := h.object(r)
	var who *events.Actor
	if err == nil {
		who, err = h.who(r)
	}
	if err == nil {
		err = h.billing.SetAutoRenew(r.Context(), s.ID, *b.AutoRenew, who)
	}
	h.respond(w, r, s.ID, http.StatusOK, err)
}
