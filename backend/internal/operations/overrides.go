package operations

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
)

// overrideAlertThreshold is OVERRIDE_ALERT_THRESHOLD (per agent, per UTC day).
const overrideAlertThreshold = 3

var overrideReasons = map[string]bool{"SYSTEM_DOWN": true, "BALANCE_DISPUTE": true, "DISCRETION": true,
	"BAY_TRIAGE": true, "FACE_EXCEPTION": true, "KYC_PENDING": true, "PAYMENT_EXCEPTION": true}

// OverrideIn is OverrideService.record's arguments.
type OverrideIn struct {
	Agent                  Agent
	Reason, Note, PinGrant string
	Swap, Hub              *uuid.UUID
	Actor                  *events.Actor
}

// RecordOverride is OverrideService.record: the agent's own PIN grant, an
// unknown reason folded into the note, and a daily-limit alert.
func (s *Service) RecordOverride(ctx context.Context, q *db.Queries, in OverrideIn) (uuid.UUID, error) {
	if err := s.tokens.AssertPinGrant(in.PinGrant, in.Agent.ID); err != nil {
		return uuid.Nil, err
	}
	reason, note := strings.ToUpper(strings.TrimSpace(in.Reason)), in.Note
	if reason == "" {
		reason = "DISCRETION"
	}
	if !overrideReasons[reason] {
		note = strings.TrimSpace(fmt.Sprintf("[%s] %s", reason, strings.TrimSpace(note)))
		reason = "DISCRETION"
	}
	note = strings.TrimSpace(note)
	if note == "" {
		return uuid.Nil, apperr.New("VALIDATION_ERROR", "Override note/reason detail is required.").
			WithDetails(apperr.Details{"note": []string{"required"}})
	}
	id := ids.New()
	if err := q.InsertOverride(ctx, db.InsertOverrideParams{ID: id, Reason: reason, Note: note, AgentID: in.Agent.ID,
		SwapID: in.Swap}); err != nil {
		return uuid.Nil, err
	}
	now := time.Now().UTC()
	day := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	count, err := q.AgentOverridesSince(ctx, db.AgentOverridesSinceParams{AgentID: in.Agent.ID, CreatedAt: day})
	if err != nil {
		return uuid.Nil, err
	}
	if count >= overrideAlertThreshold {
		msg := fmt.Sprintf("%s recorded %d overrides today (threshold %d).", in.Agent.label(), count, overrideAlertThreshold)
		if err := OpenAlert(ctx, q, "AGENT_OVERRIDE_LIMIT", msg, "WARNING", in.Hub); err != nil {
			return uuid.Nil, err
		}
	}
	var swap any
	if in.Swap != nil {
		swap = in.Swap.String()
	}
	return id, events.Emit(ctx, q, events.Event{Action: "override.recorded", SubjectType: "override",
		SubjectID: id.String(), Actor: in.Actor,
		Metadata: events.Map{"reason": reason, "swap_id": swap, "day_count": count}})
}

// OverrideDTO is OverrideSerializer.
type OverrideDTO struct {
	ID         string         `json:"id"`
	SwapID     *string        `json:"swap_id"`
	Agent      string         `json:"agent"`
	AgentEmail *string        `json:"agent_email"`
	Reason     string         `json:"reason"`
	Note       string         `json:"note"`
	CreatedAt  jsontime.Field `json:"created_at"`
	UpdatedAt  jsontime.Field `json:"updated_at"`
}

func overrideDTO(o db.OverrideByIDRow) OverrideDTO {
	return OverrideDTO{ID: o.ID.String(), SwapID: idStr(o.SwapID), Agent: o.AgentID.String(), AgentEmail: o.AgentEmail,
		Reason: o.Reason, Note: o.Note, CreatedAt: jsontime.Field(o.CreatedAt), UpdatedAt: jsontime.Field(o.UpdatedAt)}
}

func (h *Handler) overrides(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	agent, err := listq.Model(r, "agent", func(id uuid.UUID) (bool, error) { return h.q.UserExists(ctx, id) })
	var total int64
	if err == nil {
		total, err = h.q.CountOverrides(ctx, agent)
	}
	page, size := paginate.Page(r), paginate.Size(r)
	var rows []db.ListOverridesRow
	if err == nil {
		rows, err = h.q.ListOverrides(ctx, db.ListOverridesParams{Agent: agent, Lim: int32(size),
			Off: int32(paginate.Offset(page, size))})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]OverrideDTO, len(rows))
	for i, o := range rows {
		out[i] = overrideDTO(db.OverrideByIDRow(o))
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

func (h *Handler) override(r *http.Request) (db.OverrideByIDRow, error) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.OverrideByIDRow{}, apperr.NotFound("Not found.")
	}
	o, err := h.q.OverrideByID(r.Context(), id)
	if database.IsNoRows(err) {
		return o, apperr.NotFound("No Override matches the given query.")
	}
	return o, err
}

func (h *Handler) getOverride(w http.ResponseWriter, r *http.Request) {
	o, err := h.override(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, overrideDTO(o))
}

// patchOverride: every field is read-only, so the save only bumps updated_at.
func (h *Handler) patchOverride(w http.ResponseWriter, r *http.Request) {
	o, err := h.override(r)
	if err == nil {
		err = h.q.TouchOverride(r.Context(), o.ID)
	}
	if err == nil {
		o, err = h.q.OverrideByID(r.Context(), o.ID)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, overrideDTO(o))
}

type overrideReq struct {
	Reason   string     `json:"reason" validate:"required,max=50"`
	Note     string     `json:"note" validate:"required,max=2000"`
	PinGrant string     `json:"pin_grant" validate:"required"`
	SwapID   *uuid.UUID `json:"swap_id"`
}

func (h *Handler) createOverride(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b overrideReq
	err := decode.JSON(r, &b)
	var hub *uuid.UUID
	if err == nil && b.SwapID != nil {
		s, serr := h.q.SwapHub(ctx, *b.SwapID)
		if database.IsNoRows(serr) {
			err = apperr.NotFound("Swap not found.")
		} else {
			err, hub = serr, &s
		}
	}
	var agent Agent
	if err == nil {
		agent, err = h.me(ctx)
	}
	var id uuid.UUID
	if err == nil {
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			var err error
			id, err = h.svc.RecordOverride(ctx, q, OverrideIn{Agent: agent, Reason: b.Reason, Note: b.Note,
				PinGrant: b.PinGrant, Swap: b.SwapID, Hub: hub, Actor: who})
			return err
		})
	}
	var o db.OverrideByIDRow
	if err == nil {
		o, err = h.q.OverrideByID(ctx, id)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.JSON(w, http.StatusCreated, overrideDTO(o))
}
