package risk

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/export"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

func isNoRows(err error) bool { return database.IsNoRows(err) }

func me(ctx context.Context) string { return reqctx.User(ctx).UserID }

func (h *Handler) tx(ctx context.Context, fn func(q *db.Queries) error) error {
	return database.InTx(ctx, h.pool, func(tx pgx.Tx) error { return fn(db.New(tx)) })
}

// bound is selectors._parse_bound: a bad / missing date is ignored; the end
// bound is 23:59:59.999999 local.
func bound(raw string, end bool) *time.Time {
	d, err := time.ParseInLocation("2006-01-02", raw, lagos)
	if raw == "" || err != nil {
		return nil
	}
	if end {
		d = d.Add(24*time.Hour - time.Microsecond)
	}
	return &d
}

// stats is risk_event_stats (live queue + created_at period).
func (h *Handler) stats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	qs := r.URL.Query()
	from, to := bound(qs.Get("start_date"), false), bound(qs.Get("end_date"), true)
	queue, err := h.q.RiskQueueStats(ctx)
	var period db.RiskPeriodStatsRow
	if err == nil {
		period, err = h.q.RiskPeriodStats(ctx, db.RiskPeriodStatsParams{FromAt: from, ToAt: to})
	}
	var byRule []db.RiskPeriodByRuleRow
	if err == nil {
		byRule, err = h.q.RiskPeriodByRule(ctx, db.RiskPeriodByRuleParams{FromAt: from, ToAt: to})
	}
	var bySev []db.RiskOpenBySeverityRow
	if err == nil {
		bySev, err = h.q.RiskOpenBySeverity(ctx)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rules := make([]map[string]any, len(byRule))
	for i, x := range byRule {
		rules[i] = map[string]any{"rule": x.Rule, "count": x.Count}
	}
	sev := make([]map[string]any, len(bySev))
	for i, x := range bySev {
		sev[i] = map[string]any{"severity": x.Severity, "count": x.Count}
	}
	respond.OK(w, map[string]any{
		"queue": map[string]any{"open": queue.Open, "escalated": queue.Escalated,
			"high_severity": queue.HighSeverity, "critical": queue.Critical},
		"period":      map[string]any{"opened": period.Opened, "reviewed": period.Reviewed, "by_rule": rules},
		"totals":      map[string]any{"all": period.Opened, "open": queue.Open, "reviewed": queue.Reviewed},
		"by_severity": sev,
	})
}

func reviewerName(e db.RiskEventRowsRow) string {
	if e.ReviewedByID == nil {
		return ""
	}
	name := strings.TrimSpace(deref(e.ReviewerFirst) + " " + deref(e.ReviewerLast))
	for _, v := range []string{name, deref(e.ReviewerEmail), deref(e.ReviewerPhone)} {
		if v != "" {
			return v
		}
	}
	return e.ReviewedByID.String()
}

func deref(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

// export is the filtered full set as CSV / PDF (risk_event_export_rows).
func (h *Handler) export(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p, err := eventFilter(r)
	if err == nil {
		err = EnsureRules(ctx, h.q)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	p.Lim = export.RowCap + 1
	ids, err := h.q.RiskEventsPage(ctx, p)
	var rows []db.RiskEventRowsRow
	if err == nil {
		rows, err = h.rows(ctx, ids)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	t := export.Table{Stem: "risk-events", Title: "Kura risk events", Headers: []string{"id", "rule_code",
		"rule_name", "account_kura_id", "operator", "subject_type", "subject_id", "severity", "score",
		"action_taken", "status", "reviewed_by", "review_note", "created_at"}}
	for _, e := range rows {
		t.Rows = append(t.Rows, []string{e.ID.String(), e.RuleCode, e.RuleName, deref(e.AccountKuraID),
			deref(e.AccountDisplayName), e.SubjectType, e.SubjectID, e.Severity, fmt.Sprint(e.Score),
			e.ActionTaken, e.Status, reviewerName(e), e.ReviewNote, jsontime.FormatISO(e.CreatedAt)})
	}
	if err := export.Write(w, r.URL.Query().Get("export"), t); err != nil {
		respond.Error(w, r, err)
	}
}
