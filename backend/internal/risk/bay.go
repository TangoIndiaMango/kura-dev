package risk

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/router"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/throttle"
)

// VelocityStatus is velocity_bay_status (bay pre-check before start).
func VelocityStatus(ctx context.Context, q *db.Queries, vehicle uuid.UUID) (map[string]any, error) {
	grant, err := q.ActiveGrantForVehicle(ctx, vehicle)
	hasGrant := err == nil
	if err != nil && !isNoRows(err) {
		return nil, err
	}
	event, err := q.OpenVelocityEvent(ctx, vehicle.String())
	hasEvent := err == nil
	if err != nil && !isNoRows(err) {
		return nil, err
	}
	hit, err := InspectSwapVelocity(ctx, q, vehicle)
	if err != nil {
		return nil, err
	}
	note := ""
	if hasEvent {
		var c map[string]any
		_ = json.Unmarshal(event.Context, &c)
		if v, ok := c["bay_request_note"]; ok && v != nil {
			note = strings.TrimSpace(pyStr(v))
		}
	}
	out := map[string]any{"vehicle_id": vehicle.String(), "blocked": hit != nil && !hasGrant,
		"reason": nil, "message": nil, "retry_after_seconds": int64(0), "risk_event_id": nil,
		"bay_request_note": nil, "exception_requested": note != "", "active_grant": nil}
	if hit != nil {
		out["reason"], out["message"], out["retry_after_seconds"] = hit.Reason, hit.Message, hit.RetryAfter
	}
	if hasEvent {
		out["risk_event_id"] = event.ID.String()
	}
	if note != "" {
		out["bay_request_note"] = note
	}
	if hasGrant {
		out["active_grant"] = map[string]any{"id": grant.ID.String(), "uses_remaining": grant.UsesRemaining,
			"max_uses": grant.MaxUses, "expires_at": jsontime.FormatISO(grant.ExpiresAt)}
	}
	return out, nil
}

func pyStr(v any) string {
	if s, ok := v.(string); ok {
		return s
	}
	b, _ := json.Marshal(v)
	return string(b)
}

// RequestException is request_velocity_exception: note the bay's request on
// the open SWAP_VELOCITY event (opening one if needed) and page reviewers.
func RequestException(ctx context.Context, pool *pgxpool.Pool, vehicle uuid.UUID, note string, agent *events.Actor,
	agentID uuid.UUID, hub, account *uuid.UUID) (db.RiskRiskevent, error) {
	note = strings.TrimSpace(note)
	if note == "" {
		return db.RiskRiskevent{}, apperr.New("VALIDATION_ERROR", "A reason is required to request a velocity exception.").
			WithDetails(apperr.Details{"note": []string{"required"}})
	}
	var out db.RiskRiskevent
	err := database.InTx(ctx, pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		e, err := q.OpenVelocityEvent(ctx, vehicle.String())
		id := e.ID
		if isNoRows(err) {
			id, err = Emit(ctx, q, Event{RuleCode: "SWAP_VELOCITY", SubjectType: "vehicle", SubjectID: vehicle.String(),
				AccountID: account, Severity: "HIGH", ActionTaken: "BLOCK",
				Context: map[string]any{"reason": "BAY_EXCEPTION_REQUEST", "requested_by": agentID.String()}})
		}
		if err != nil {
			return err
		}
		locked, err := q.RiskEventForUpdate(ctx, id)
		if err != nil {
			return err
		}
		if locked.Status != "OPEN" {
			return apperr.Conflict("CONFLICT", "This velocity alert was already reviewed. Retry start or wait.")
		}
		c := map[string]any{}
		_ = json.Unmarshal(locked.Context, &c)
		c["bay_request_note"], c["bay_requested_by"] = truncate(note, 4000), agentID.String()
		c["bay_requested_at"] = jsontime.FormatISO(time.Now())
		if hub != nil {
			c["hub_id"] = hub.String()
		}
		raw, _ := json.Marshal(c)
		if err := q.SaveRiskEventContext(ctx, db.SaveRiskEventContextParams{ID: id, Context: raw}); err != nil {
			return err
		}
		var hubID any
		if hub != nil {
			hubID = hub.String()
		}
		ev := events.Event{Action: "risk.velocity_exception.requested", SubjectType: "risk_event",
			SubjectID: id.String(), SubjectLabel: "SWAP_VELOCITY", Actor: agent,
			Metadata: events.Map{"vehicle_id": vehicle.String(), "hub_id": hubID, "note": truncate(note, 200)}}
		reviewers, err := q.RiskReviewers(ctx)
		if err != nil {
			return err
		}
		for _, uid := range reviewers {
			ev.Notify = append(ev.Notify, events.NotifySpec{UserID: uid, Title: "Bay · velocity exception requested",
				Body: "Agent requested an exception: " + truncate(note, 160), Source: "Risk", Severity: events.Warning,
				TemplateCode: "risk.event.opened", LinkPath: "/risk/" + id.String(),
				DedupeKey: "risk.velocity_exception.requested:" + id.String() + ":" + uid.String()})
		}
		if err := events.Emit(ctx, q, ev); err != nil {
			return err
		}
		out = db.RiskRiskevent{ID: locked.ID, Status: locked.Status}
		return nil
	})
	return out, err
}

// Module mounts /api/v1/risk/*.
type Module struct {
	h       *Handler
	limiter *throttle.Limiter
}

func NewModule(pool *pgxpool.Pool, limiter *throttle.Limiter) *Module {
	return &Module{h: NewHandler(pool), limiter: limiter}
}

func (m *Module) Register(mux *http.ServeMux) {
	r := router.New(mux, "/api/v1/risk", m.limiter)
	r.Cap("GET", "/rules/", "risk:read", m.h.rules)
	r.Cap("GET", "/rules/{id}/", "risk:read", m.h.getRule)
	r.Cap("PUT", "/rules/{id}/", "risk:review", m.h.updateRule(false))
	r.Cap("PATCH", "/rules/{id}/", "risk:review", m.h.updateRule(true))
	r.Cap("GET", "/events/", "risk:read", m.h.events)
	r.Cap("POST", "/events/", "risk:review", m.h.create)
	r.Cap("GET", "/events/export/", "risk:read", m.h.export)
	r.Cap("GET", "/events/stats/", "risk:read", m.h.stats)
	r.Cap("GET", "/events/{id}/", "risk:read", m.h.getEvent)
	r.Cap("POST", "/events/{id}/review/", "risk:review", m.h.review)
}
