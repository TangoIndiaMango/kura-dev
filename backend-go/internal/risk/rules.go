package risk

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
)

// Handler serves /api/v1/risk/*.
type Handler struct {
	pool *pgxpool.Pool
	q    *db.Queries
}

func NewHandler(pool *pgxpool.Pool) *Handler { return &Handler{pool: pool, q: db.New(pool)} }

// RuleDTO is RiskRuleSerializer.
type RuleDTO struct {
	ID       string          `json:"id"`
	Code     string          `json:"code"`
	Name     string          `json:"name"`
	Severity string          `json:"severity"`
	Action   string          `json:"action"`
	Enabled  bool            `json:"enabled"`
	Params   json.RawMessage `json:"params"`
}

func ruleDTO(r db.RiskRiskrule) RuleDTO {
	return RuleDTO{ID: r.ID.String(), Code: r.Code, Name: r.Name, Severity: r.Severity, Action: r.Action,
		Enabled: r.Enabled, Params: r.Params}
}

var (
	severities = []string{"LOW", "MEDIUM", "HIGH", "CRITICAL"}
	actions    = []string{"FLAG", "STEP_UP", "BLOCK", "FREEZE", "RESTRICT"}
)

func (h *Handler) rules(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if err := EnsureRules(ctx, h.q); err != nil {
		respond.Error(w, r, err)
		return
	}
	total, err := h.q.CountRiskRules(ctx)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	page, size := paginate.Page(r), paginate.Size(r)
	rows, err := h.q.ListRiskRules(ctx, db.ListRiskRulesParams{Lim: int32(size), Off: int32(paginate.Offset(page, size))})
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

func (h *Handler) rule(r *http.Request) (db.RiskRiskrule, error) {
	if err := EnsureRules(r.Context(), h.q); err != nil {
		return db.RiskRiskrule{}, err
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.RiskRiskrule{}, apperr.NotFound("No RiskRule matches the given query.")
	}
	x, err := h.q.RiskRuleByID(r.Context(), id)
	if database.IsNoRows(err) {
		return x, apperr.NotFound("No RiskRule matches the given query.")
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

// ruleReq is the writable part of RiskRuleSerializer (code / id read-only).
type ruleReq struct {
	Name     *string         `json:"name" validate:"omitempty,notblank,max=150"`
	Severity *string         `json:"severity" validate:"omitempty,oneof=LOW MEDIUM HIGH CRITICAL"`
	Action   *string         `json:"action" validate:"omitempty,oneof=FLAG STEP_UP BLOCK FREEZE RESTRICT"`
	Enabled  *bool           `json:"enabled"`
	Params   json.RawMessage `json:"params"`
}

// updateRule is UpdateModelMixin: get_object (404) first, then the
// serializer (PUT requires name; PATCH is partial).
func (h *Handler) updateRule(partial bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		x, err := h.rule(r)
		if err != nil {
			respond.Error(w, r, err)
			return
		}
		keys := decode.Keys(r)
		var b ruleReq
		err = decode.JSON(r, &b)
		d := apperr.Details{}
		if e, ok := apperr.As(err); ok && e.Code == "VALIDATION_ERROR" {
			d = e.Details
		} else if err != nil {
			respond.Error(w, r, err)
			return
		}
		for k, isNil := range map[string]bool{"name": b.Name == nil, "severity": b.Severity == nil,
			"action": b.Action == nil, "enabled": b.Enabled == nil, "params": b.Params == nil} {
			if keys[k] && isNil && d[k] == nil {
				d[k] = []string{"This field may not be null."}
			}
		}
		if !partial && !keys["name"] {
			d["name"] = []string{"This field is required."}
		}
		if len(d) > 0 {
			respond.Error(w, r, apperr.Validation(d))
			return
		}
		if b.Name != nil {
			x.Name = strings.TrimSpace(*b.Name)
		}
		if b.Severity != nil {
			x.Severity = *b.Severity
		}
		if b.Action != nil {
			x.Action = *b.Action
		}
		if b.Enabled != nil {
			x.Enabled = *b.Enabled
		}
		if b.Params != nil {
			x.Params = b.Params
		}
		ctx := r.Context()
		if err := h.q.SaveRiskRule(ctx, db.SaveRiskRuleParams{ID: x.ID, Name: x.Name, Severity: x.Severity,
			Action: x.Action, Enabled: x.Enabled, Params: x.Params}); err != nil {
			respond.Error(w, r, err)
			return
		}
		x, err = h.q.RiskRuleByID(ctx, x.ID)
		if err != nil {
			respond.Error(w, r, err)
			return
		}
		respond.OK(w, ruleDTO(x))
	}
}
