package operations

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

// RuleDTO is AlertRuleSerializer.
type RuleDTO struct {
	ID        string          `json:"id"`
	Name      string          `json:"name"`
	Kind      string          `json:"kind"`
	Severity  string          `json:"severity"`
	Threshold json.RawMessage `json:"threshold"`
	Channels  json.RawMessage `json:"channels"`
	Cooldown  int32           `json:"cooldown_minutes"`
	Status    string          `json:"status"`
	CreatedAt jsontime.Field  `json:"created_at"`
	UpdatedAt jsontime.Field  `json:"updated_at"`
}

func ruleDTO(x db.OperationsAlertrule) RuleDTO {
	return RuleDTO{ID: x.ID.String(), Name: x.Name, Kind: x.Kind, Severity: x.Severity, Threshold: x.Threshold,
		Channels: x.Channels, Cooldown: x.CooldownMinutes, Status: x.Status, CreatedAt: jsontime.Field(x.CreatedAt),
		UpdatedAt: jsontime.Field(x.UpdatedAt)}
}

func (h *Handler) rules(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	total, err := h.q.CountAlertRules(ctx)
	page, size := paginate.Page(r), paginate.Size(r)
	var rows []db.OperationsAlertrule
	if err == nil {
		rows, err = h.q.ListAlertRules(ctx, db.ListAlertRulesParams{Lim: int32(size), Off: int32(paginate.Offset(page, size))})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]RuleDTO, len(rows))
	for i, x := range rows {
		out[i] = ruleDTO(x)
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

func (h *Handler) rule(r *http.Request) (db.OperationsAlertrule, error) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.OperationsAlertrule{}, apperr.NotFound("Not found.")
	}
	x, err := h.q.AlertRuleByID(r.Context(), id)
	if database.IsNoRows(err) {
		return x, apperr.NotFound("No AlertRule matches the given query.")
	}
	return x, err
}

func (h *Handler) getRule(w http.ResponseWriter, r *http.Request) {
	x, err := h.rule(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, ruleDTO(x))
}

// ruleReq is AlertRuleWriteSerializer.
type ruleReq struct {
	Name      *string         `json:"name" validate:"omitempty,notblank,max=120"`
	Kind      *string         `json:"kind" validate:"omitempty,oneof=BATTERY_MISMATCH LOW_INVENTORY SOLAR_FAULT CASH_LIMIT HUB_OFFLINE PAYMENT_FAILURE SHIFT_CASH_VARIANCE SETTLEMENT_MISMATCH AGENT_OVERRIDE_LIMIT OTHER"`
	Severity  *string         `json:"severity" validate:"omitempty,oneof=INFO WARNING CRITICAL"`
	Threshold json.RawMessage `json:"threshold"`
	Channels  json.RawMessage `json:"channels"`
	Cooldown  *int64          `json:"cooldown_minutes" validate:"omitempty,min=1"`
	Status    *string         `json:"status" validate:"omitempty,oneof=ACTIVE PAUSED"`
}

func pyType(v any) string {
	switch v.(type) {
	case []any:
		return "list"
	case string:
		return "str"
	case float64:
		return "int"
	case bool:
		return "bool"
	}
	return "dict"
}

// validate runs the serializer; required fields only on create.
func (b *ruleReq) validate(r *http.Request, create bool) error {
	keys := decode.Keys(r)
	err := decode.JSON(r, b)
	d := apperr.Details{}
	if e, ok := apperr.As(err); ok && e.Code == "VALIDATION_ERROR" {
		d = e.Details
	} else if err != nil {
		return err
	}
	for k, isNil := range map[string]bool{"name": b.Name == nil, "kind": b.Kind == nil, "severity": b.Severity == nil,
		"threshold": b.Threshold == nil, "channels": b.Channels == nil, "cooldown_minutes": b.Cooldown == nil,
		"status": b.Status == nil} {
		if keys[k] && isNil && d[k] == nil {
			d[k] = []string{"This field may not be null."}
		}
	}
	if b.Threshold != nil && d["threshold"] == nil {
		var v any
		_ = json.Unmarshal(b.Threshold, &v)
		if _, ok := v.(map[string]any); !ok {
			d["threshold"] = []string{fmt.Sprintf("Expected a dictionary of items but got type \"%s\".", pyType(v))}
		}
	}
	if b.Channels != nil && d["channels"] == nil {
		var v any
		_ = json.Unmarshal(b.Channels, &v)
		list, ok := v.([]any)
		if !ok {
			d["channels"] = []string{fmt.Sprintf("Expected a list of items but got type \"%s\".", pyType(v))}
		} else {
			items, out := map[string]any{}, make([]string, 0, len(list))
			for i, x := range list {
				s, isStr := x.(string)
				switch {
				case x == nil:
					items[fmt.Sprint(i)] = []string{"This field may not be null."}
				case !isStr && pyType(x) != "int":
					items[fmt.Sprint(i)] = []string{"Not a valid string."}
				default:
					if !isStr {
						s = fmt.Sprint(x)
					}
					s = strings.TrimSpace(s)
					if s == "" {
						items[fmt.Sprint(i)] = []string{"This field may not be blank."}
					} else if len([]rune(s)) > 40 {
						items[fmt.Sprint(i)] = []string{"Ensure this field has no more than 40 characters."}
					}
					out = append(out, s)
				}
			}
			if len(items) > 0 {
				d["channels"] = items
			} else {
				b.Channels, _ = json.Marshal(out)
			}
		}
	}
	if create {
		for _, k := range []string{"name", "kind"} {
			if !keys[k] {
				d[k] = []string{"This field is required."}
			}
		}
	}
	if len(d) > 0 {
		return apperr.Validation(d)
	}
	return nil
}

func emptyJSON(raw json.RawMessage) bool {
	s := strings.TrimSpace(string(raw))
	return s == "" || s == "{}" || s == "[]"
}

func (h *Handler) createRule(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b ruleReq
	if err := b.validate(r, true); err != nil {
		respond.Error(w, r, err)
		return
	}
	x := db.OperationsAlertrule{ID: ids.New(), Name: strings.TrimSpace(*b.Name), Kind: *b.Kind, Severity: "WARNING",
		Threshold: []byte("{}"), Channels: []byte(`["IN_APP"]`), CooldownMinutes: 30, Status: "ACTIVE"}
	if b.Severity != nil && *b.Severity != "" {
		x.Severity = *b.Severity
	}
	if !emptyJSON(b.Threshold) {
		x.Threshold = b.Threshold
	}
	if !emptyJSON(b.Channels) {
		x.Channels = b.Channels
	}
	if b.Cooldown != nil {
		x.CooldownMinutes = int32(*b.Cooldown)
	}
	if b.Status != nil && *b.Status != "" {
		x.Status = *b.Status
	}
	uid, _ := uuid.Parse(reqctx.User(ctx).UserID)
	err := h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
		if err := q.InsertAlertRule(ctx, db.InsertAlertRuleParams{ID: x.ID, Name: x.Name, Kind: x.Kind,
			Severity: x.Severity, Threshold: x.Threshold, Channels: x.Channels, CooldownMinutes: x.CooldownMinutes,
			Status: x.Status, CreatedByID: &uid}); err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "alert_rule.created", SubjectType: "alert_rule",
			SubjectID: x.ID.String(), SubjectLabel: x.Name, Actor: who,
			After: events.Map{"kind": x.Kind, "status": x.Status}})
	})
	if err == nil {
		x, err = h.q.AlertRuleByID(ctx, x.ID)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.JSON(w, http.StatusCreated, ruleDTO(x))
}

// patchRule: get_object first, then the partial serializer.
func (h *Handler) patchRule(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	x, err := h.rule(r)
	var b ruleReq
	if err == nil {
		err = b.validate(r, false)
	}
	if err == nil {
		before := events.Map{"status": x.Status, "severity": x.Severity}
		if b.Name != nil {
			x.Name = strings.TrimSpace(*b.Name)
		}
		if b.Kind != nil {
			x.Kind = *b.Kind
		}
		if b.Severity != nil {
			x.Severity = *b.Severity
		}
		if b.Threshold != nil {
			x.Threshold = b.Threshold
		}
		if b.Channels != nil {
			x.Channels = b.Channels
		}
		if b.Cooldown != nil {
			x.CooldownMinutes = int32(*b.Cooldown)
		}
		if b.Status != nil {
			x.Status = *b.Status
		}
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			if err := q.SaveAlertRule(ctx, db.SaveAlertRuleParams{ID: x.ID, Name: x.Name, Kind: x.Kind,
				Severity: x.Severity, Threshold: x.Threshold, Channels: x.Channels, CooldownMinutes: x.CooldownMinutes,
				Status: x.Status}); err != nil {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "alert_rule.updated", SubjectType: "alert_rule",
				SubjectID: x.ID.String(), SubjectLabel: x.Name, Actor: who, Before: before,
				After: events.Map{"status": x.Status, "severity": x.Severity}})
		})
	}
	if err == nil {
		x, err = h.q.AlertRuleByID(ctx, x.ID)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, ruleDTO(x))
}
