package mobility

import (
	"context"
	"net/http"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
)

// holdPolicy is get_hold_policy (first row, created on demand).
func holdPolicy(ctx context.Context, q *db.Queries) (db.MobilityBayholdpolicy, error) {
	p, err := q.FirstHoldPolicy(ctx)
	if database.IsNoRows(err) {
		return q.InsertHoldPolicy(ctx, db.InsertHoldPolicyParams{ID: ids.New(), DefaultHoldMinutes: 15, MaxExtendMinutes: 15})
	}
	return p, err
}

func (h *PricingHandler) getHold(w http.ResponseWriter, r *http.Request) {
	p, err := holdPolicy(r.Context(), h.q)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, map[string]int32{"default_hold_minutes": p.DefaultHoldMinutes, "max_extend_minutes": p.MaxExtendMinutes})
}

type holdReq struct {
	Default *int64 `json:"default_hold_minutes" validate:"required,min=5,max=60"`
	Extend  *int64 `json:"max_extend_minutes" validate:"required,min=5,max=60"`
}

func (h *PricingHandler) putHold(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b holdReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	var out db.MobilityBayholdpolicy
	err := h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
		p, err := holdPolicy(ctx, q)
		if err != nil {
			return err
		}
		before := events.Map{"default_hold_minutes": p.DefaultHoldMinutes, "max_extend_minutes": p.MaxExtendMinutes}
		p.DefaultHoldMinutes, p.MaxExtendMinutes = int32(*b.Default), int32(*b.Extend)
		if err := q.UpdateHoldPolicy(ctx, db.UpdateHoldPolicyParams{ID: p.ID, DefaultHoldMinutes: p.DefaultHoldMinutes,
			MaxExtendMinutes: p.MaxExtendMinutes}); err != nil {
			return err
		}
		out = p
		return events.Emit(ctx, q, events.Event{Action: "hold_policy.updated", SubjectType: "hold_policy",
			SubjectID: p.ID.String(), Actor: who, Before: before,
			After: events.Map{"default_hold_minutes": p.DefaultHoldMinutes, "max_extend_minutes": p.MaxExtendMinutes}})
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, map[string]int32{"default_hold_minutes": out.DefaultHoldMinutes, "max_extend_minutes": out.MaxExtendMinutes})
}
