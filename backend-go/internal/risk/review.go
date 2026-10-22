package risk

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

// reviewReq is RiskReviewSerializer.
type reviewReq struct {
	Status    string `json:"status" validate:"required,oneof=REVIEWED_OK REVIEWED_FRAUD ESCALATED"`
	Note      string `json:"note"`
	AllowSwap *bool  `json:"allow_swap"`
	TTLHours  *int64 `json:"ttl_hours" validate:"omitempty,min=1,max=48"`
	MaxUses   *int64 `json:"max_uses" validate:"omitempty,min=1,max=5"`
}

func noteRequired() error {
	return apperr.New("VALIDATION_ERROR", "A review note is required to grant a velocity exception.").
		WithDetails(apperr.Details{"note": []string{"required"}})
}

// review is RiskService.review (serializer, then get_object).
func (h *Handler) review(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b reviewReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	e, err := h.event(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	reviewer, _ := uuid.Parse(me(ctx))
	err = h.tx(ctx, func(q *db.Queries) error {
		locked, err := q.RiskEventForUpdate(ctx, e.ID)
		if err != nil {
			return err
		}
		grant := b.Status == "REVIEWED_OK" && locked.RuleCode == "SWAP_VELOCITY" && (b.AllowSwap == nil || *b.AllowSwap)
		note := strings.TrimSpace(b.Note)
		if grant && note == "" {
			return noteRequired()
		}
		note = truncate(note, 4000)
		if err := q.SaveRiskEventReview(ctx, db.SaveRiskEventReviewParams{ID: locked.ID, Status: b.Status,
			ReviewedByID: &reviewer, ReviewNote: note}); err != nil {
			return err
		}
		who, err := actor.FromRequest(ctx, q)
		if err != nil {
			return err
		}
		var grantID any
		if grant {
			gid, err := createGrant(ctx, q, locked, reviewer, who, note, b.TTLHours, b.MaxUses)
			if err != nil {
				return err
			}
			grantID = gid.String()
		}
		return events.Emit(ctx, q, events.Event{Action: "risk_event.reviewed", SubjectType: "risk_event",
			SubjectID: locked.ID.String(), SubjectLabel: locked.RuleCode, Actor: who,
			Metadata: events.Map{"status": b.Status, "velocity_grant_id": grantID}})
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondEvent(w, r, e.ID, http.StatusOK)
}

func truncate(s string, n int) string {
	if r := []rune(s); len(r) > n {
		return string(r[:n])
	}
	return s
}

// grantParams is _grant_params: rule params over the defaults.
func grantParams(ctx context.Context, q *db.Queries) (hours, uses int64, err error) {
	if err = EnsureRules(ctx, q); err != nil {
		return
	}
	hours, uses = 4, 1
	rule, err := q.RiskRuleByCode(ctx, "SWAP_VELOCITY")
	if isNoRows(err) {
		return hours, uses, nil
	}
	if err != nil {
		return
	}
	var p map[string]any
	_ = json.Unmarshal(rule.Params, &p)
	if v, ok := p["GRANT_TTL_HOURS"].(float64); ok {
		hours = int64(v)
	}
	if v, ok := p["GRANT_MAX_USES"].(float64); ok {
		uses = int64(v)
	}
	return hours, uses, nil
}

// createGrant is create_velocity_grant (one active grant per event).
func createGrant(ctx context.Context, q *db.Queries, e db.RiskEventForUpdateRow, reviewer uuid.UUID,
	who *events.Actor, note string, ttl, maxUses *int64) (uuid.UUID, error) {
	if e.SubjectType != "vehicle" {
		return uuid.Nil, apperr.New("VALIDATION_ERROR", "SWAP_VELOCITY subject must be a vehicle.")
	}
	vehicle, err := uuid.Parse(e.SubjectID)
	if err != nil {
		return uuid.Nil, apperr.New("VALIDATION_ERROR", "SWAP_VELOCITY subject must be a vehicle.")
	}
	hours, uses, err := grantParams(ctx, q)
	if err != nil {
		return uuid.Nil, err
	}
	if ttl != nil {
		hours = *ttl
	}
	if maxUses != nil {
		uses = *maxUses
	}
	hours, uses = max(1, min(hours, 48)), max(1, min(uses, 5))
	expires := time.Now().Add(time.Duration(hours) * time.Hour)
	if err := q.RevokeEventGrants(ctx, e.ID); err != nil {
		return uuid.Nil, err
	}
	id := ids.New()
	if err := q.InsertVelocityGrant(ctx, db.InsertVelocityGrantParams{ID: id, VehicleID: vehicle,
		ExpiresAt: expires, MaxUses: int16(uses), Note: note, AccountID: e.AccountID, GrantedByID: reviewer,
		RiskEventID: e.ID}); err != nil {
		return uuid.Nil, err
	}
	label := vehicle.String()[:12]
	return id, events.Emit(ctx, q, events.Event{Action: "risk.velocity_grant.created",
		SubjectType: "risk_velocity_grant", SubjectID: id.String(), SubjectLabel: label, Actor: who,
		Metadata: events.Map{"risk_event_id": e.ID.String(), "vehicle_id": vehicle.String(),
			"expires_at": jsontime.FormatISO(expires), "max_uses": uses},
		Notify: []events.NotifySpec{{UserID: reviewer, Title: "Velocity exception granted",
			Body: fmt.Sprintf("Bay may complete up to %d swap(s) for this vehicle until %s.", uses,
				expires.In(lagos).Format("2006-01-02 15:04")),
			Source: "Risk", Severity: events.Info, LinkPath: "/risk/" + e.ID.String(),
			TemplateCode: "risk.velocity_grant.created", DedupeKey: "risk.velocity_grant.created:" + id.String()}}})
}
