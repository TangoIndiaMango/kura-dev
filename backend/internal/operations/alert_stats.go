package operations

import (
	"net/http"
	"time"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/export"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
)

// bound is selectors._parse_bound (end = 23:59:59.999999 local).
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

// alertStats is alert_stats (hub-scoped like the list).
func (h *Handler) alertStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	from, to := bound(r.URL.Query().Get("start_date"), false), bound(r.URL.Query().Get("end_date"), true)
	all, hubs, err := h.hubScope(ctx)
	var queue db.AlertQueueStatsRow
	if err == nil {
		queue, err = h.q.AlertQueueStats(ctx, db.AlertQueueStatsParams{AllHubs: all, Hubs: hubs})
	}
	var period db.AlertPeriodStatsRow
	if err == nil {
		period, err = h.q.AlertPeriodStats(ctx, db.AlertPeriodStatsParams{AllHubs: all, Hubs: hubs, FromAt: from, ToAt: to})
	}
	var bySev []db.AlertPeriodBySeverityRow
	if err == nil {
		bySev, err = h.q.AlertPeriodBySeverity(ctx, db.AlertPeriodBySeverityParams{AllHubs: all, Hubs: hubs,
			FromAt: from, ToAt: to})
	}
	var byDay []db.AlertPeriodByDayRow
	if err == nil {
		byDay, err = h.q.AlertPeriodByDay(ctx, db.AlertPeriodByDayParams{AllHubs: all, Hubs: hubs, FromAt: from, ToAt: to})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	sev := make([]map[string]any, len(bySev))
	for i, x := range bySev {
		sev[i] = map[string]any{"severity": x.Severity, "count": x.Count}
	}
	days := make([]map[string]any, len(byDay))
	for i, x := range byDay {
		label := ""
		if x.Day.Valid {
			label = x.Day.Time.Format("2006-01-02")
		}
		days[i] = map[string]any{"label": label, "count": x.Count}
	}
	respond.OK(w, map[string]any{
		"queue": map[string]any{"open": queue.Open, "acknowledged": queue.Acknowledged, "escalated": queue.Escalated,
			"critical_open": queue.CriticalOpen, "active": queue.Active},
		"period": map[string]any{"opened": period.Opened, "resolved": period.Resolved, "by_severity": sev,
			"by_day": days},
		"totals": map[string]any{"all": period.Opened, "resolved": queue.Resolved},
	})
}

func isoPtr(t *time.Time) string {
	if t == nil {
		return ""
	}
	return jsontime.FormatISO(*t)
}

func (h *Handler) alertExport(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p, err := h.alertFilter(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	p.Lim = export.RowCap + 1
	ids, err := h.q.AlertsPage(ctx, p)
	var rows []db.AlertRowsRow
	if err == nil {
		rows, err = h.alertRows(ctx, ids)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	t := export.Table{Stem: "alerts", Title: "Kura alerts", Headers: []string{"id", "kind", "severity", "status",
		"message", "hub_code", "hub_name", "delivery_channel", "resolve_note", "created_at", "acknowledged_at",
		"resolved_at"}}
	for _, a := range rows {
		t.Rows = append(t.Rows, []string{a.ID.String(), a.Kind, a.Severity, a.Status, a.Message, deref(a.HubCode),
			deref(a.HubName), a.DeliveryChannel, a.ResolveNote, jsontime.FormatISO(a.CreatedAt),
			isoPtr(a.AcknowledgedAt), isoPtr(a.ResolvedAt)})
	}
	if err := export.Write(w, r.URL.Query().Get("export"), t); err != nil {
		respond.Error(w, r, err)
	}
}
