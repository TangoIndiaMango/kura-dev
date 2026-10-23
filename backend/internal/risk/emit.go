// Package risk ports risk.services: the rule catalogue and RiskService.emit.
package risk

import (
	"context"
	"encoding/json"
	"strings"
	"sync"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
)

type rule struct {
	Code, Name, Severity, Action string
	Params                       map[string]any
}

// DefaultRules mirrors DEFAULT_RULES (PRD 07 catalogue).
var DefaultRules = []rule{
	{"BATTERY_MISMATCH", "Returned battery mismatch", "HIGH", "FLAG", nil},
	{"SWAP_VELOCITY", "Swap velocity exceeded", "HIGH", "BLOCK", map[string]any{
		"MAX_SWAPS_PER_VEHICLE_DAY": 4, "MIN_MINUTES_BETWEEN_SWAPS": 45,
		"GRANT_TTL_HOURS": 4, "GRANT_MAX_USES": 1}},
	{"GEO_IMPOSSIBLE", "Geo-impossible travel", "HIGH", "FLAG", map[string]any{
		"MAX_SPEED_KMH": 80, "MAX_SPEED_KMH_BOAT": 40}},
	{"OVERRIDE_CASH_CORR", "Override vs cash variance", "HIGH", "FLAG", nil},
	{"NEW_DEVICE", "New trusted device", "MEDIUM", "STEP_UP", nil},
	{"PHONE_CHANGE", "Phone change", "MEDIUM", "FREEZE", nil},
	{"PIN_BRUTE", "PIN brute force", "HIGH", "STEP_UP", nil},
	{"AGENT_REG_VELOCITY", "Agent registration velocity", "MEDIUM", "FLAG", nil},
	{"NOSHOW_RATE", "No-show rate", "MEDIUM", "FLAG", nil},
	{"FUNDING_ANOMALY", "Funding anomaly", "HIGH", "FLAG", nil},
	{"CHARGEBACK", "Chargeback after spend", "CRITICAL", "RESTRICT", nil},
	{"CREDIT_BUSTOUT", "Credit bust-out pattern", "HIGH", "RESTRICT", nil},
	{"DUPLICATE_IDENTITY", "Duplicate identity", "CRITICAL", "BLOCK", nil},
	{"UNRETURNED_48H", "Battery unreturned 48h", "HIGH", "SUSPEND", nil},
	{"MANUAL_FLAG", "Manual ops flag", "MEDIUM", "FLAG", nil},
}

// staffNotify are the rules that page risk reviewers (_STAFF_NOTIFY_RULES).
var staffNotify = map[string]bool{"SWAP_VELOCITY": true, "GEO_IMPOSSIBLE": true}

var ensured sync.Map // per-process: rules only need inserting once

// EnsureRules inserts any missing catalogue rows (get_or_create).
func EnsureRules(ctx context.Context, q *db.Queries) error {
	for _, r := range DefaultRules {
		if _, done := ensured.Load(r.Code); done {
			continue
		}
		params, _ := json.Marshal(orEmpty(r.Params))
		if err := q.EnsureRiskRule(ctx, db.EnsureRiskRuleParams{ID: ids.New(), Code: r.Code,
			Name: r.Name, Severity: r.Severity, Params: params, Action: r.Action}); err != nil {
			return err
		}
		ensured.Store(r.Code, true)
	}
	return nil
}

// Event is one RiskService.emit call.
type Event struct {
	RuleCode    string
	SubjectType string
	SubjectID   string
	AccountID   *uuid.UUID
	Severity    string // default: the rule's
	Score       int32
	Context     map[string]any
	ActionTaken string // default: the rule's action
}

// Emit opens a RiskEvent, audits it, and pages reviewers for velocity/geo.
// Run it with transaction-bound queries.
func Emit(ctx context.Context, q *db.Queries, ev Event) (uuid.UUID, error) {
	if err := EnsureRules(ctx, q); err != nil {
		return uuid.Nil, err
	}
	r, err := q.EnabledRiskRule(ctx, ev.RuleCode)
	if database.IsNoRows(err) {
		return uuid.Nil, apperr.New("NOT_FOUND", "Risk rule "+ev.RuleCode+" not found or disabled.")
	}
	if err != nil {
		return uuid.Nil, err
	}
	id := ids.New()
	subjectType := strings.ToLower(ev.SubjectType)
	if len(subjectType) > 40 {
		subjectType = subjectType[:40]
	}
	subjectID := ev.SubjectID
	if len(subjectID) > 64 {
		subjectID = subjectID[:64]
	}
	ctxJSON, _ := json.Marshal(orEmpty(ev.Context))
	err = q.InsertRiskEvent(ctx, db.InsertRiskEventParams{ID: id, SubjectType: subjectType,
		SubjectID: subjectID, Severity: def(ev.Severity, r.Severity), Score: ev.Score,
		Context: ctxJSON, ActionTaken: def(ev.ActionTaken, r.Action), AccountID: ev.AccountID,
		RuleID: r.ID})
	if err != nil {
		return uuid.Nil, err
	}
	var account any
	if ev.AccountID != nil {
		account = ev.AccountID.String()
	}
	audit := events.Event{Action: "risk_event.opened", SubjectType: "risk_event",
		SubjectID: id.String(), SubjectLabel: r.Code,
		Metadata: events.Map{"rule": r.Code, "account_id": account,
			"subject_type": subjectType, "subject_id": subjectID}}
	if staffNotify[r.Code] {
		reason, _ := ev.Context["reason"].(string)
		if reason == "" {
			reason = r.Action
		}
		reviewers, err := q.RiskReviewers(ctx)
		if err != nil {
			return uuid.Nil, err
		}
		for _, uid := range reviewers {
			audit.Notify = append(audit.Notify, events.NotifySpec{UserID: uid,
				Title: "Risk · " + r.Code, Body: r.Code + " · " + reason + ". Open the risk queue to review.",
				Source: "Risk", Severity: events.Warning, TemplateCode: "risk.event.opened",
				LinkPath:  "/risk/" + id.String(),
				DedupeKey: "risk.event.opened:" + id.String() + ":" + uid.String()})
		}
	}
	return id, events.Emit(ctx, q, audit)
}

func orEmpty(m map[string]any) map[string]any {
	if m == nil {
		return map[string]any{}
	}
	return m
}

func def(v, d string) string {
	if v == "" {
		return d
	}
	return v
}
