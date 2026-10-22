package analytics

import (
	"context"
	"net/http"
	"time"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
)

// overview is revenue_overview: inclusive Lagos-day window (default the
// last 30 days), success totals, pending, channel / purpose / daily splits.
func (h *handler) overview(ctx context.Context, start, end *time.Time) (map[string]any, []db.RevenueByPurposeRow, error) {
	today := midnight(time.Now())
	from, to := today.AddDate(0, 0, -29), today
	if start != nil {
		from = *start
	}
	if end != nil {
		to = *end
	}
	if from.After(to) {
		from, to = to, from
	}
	fromAt, toAt := from, to.AddDate(0, 0, 1)
	t, err := h.q.RevenueTotals(ctx, db.RevenueTotalsParams{FromAt: fromAt, ToAt: toAt})
	if err != nil {
		return nil, nil, err
	}
	chans, err := h.q.RevenueByChannel(ctx, db.RevenueByChannelParams{FromAt: fromAt, ToAt: toAt})
	if err != nil {
		return nil, nil, err
	}
	purposes, err := h.q.RevenueByPurpose(ctx, db.RevenueByPurposeParams{FromAt: fromAt, ToAt: toAt})
	if err != nil {
		return nil, nil, err
	}
	daily, err := h.q.RevenueDaily(ctx, db.RevenueDailyParams{FromAt: fromAt, ToAt: toAt})
	if err != nil {
		return nil, nil, err
	}
	subs, err := h.q.SubscriptionStatusCounts(ctx)
	if err != nil {
		return nil, nil, err
	}
	channels := make([]map[string]any, len(chans))
	for i, c := range chans {
		channels[i] = map[string]any{"channel": c.K, "amount_kobo": c.Amount, "transactions": c.N}
	}
	purps := make([]map[string]any, len(purposes))
	for i, p := range purposes {
		purps[i] = map[string]any{"purpose": p.K, "amount_kobo": p.Amount, "transactions": p.N}
	}
	days := make([]map[string]any, len(daily))
	for i, d := range daily {
		days[i] = map[string]any{"day": d.Day.Time.Format(time.DateOnly), "amount_kobo": d.Amount, "transactions": d.N}
	}
	return map[string]any{
		"range":      map[string]string{"start_date": from.Format(time.DateOnly), "end_date": to.Format(time.DateOnly)},
		"gross_kobo": t.Gross, "vat_kobo": t.Vat, "transactions": t.Transactions,
		"outstanding_kobo": t.Outstanding, "outstanding_transactions": t.OutstandingN,
		"channels": channels, "purposes": purps, "daily": days,
		"subscriptions": map[string]any{"active": subs.Active, "pending": subs.Pending, "lapsed": subs.Lapsed},
	}, purposes, nil
}

func (h *handler) dates(w http.ResponseWriter, r *http.Request) (*time.Time, *time.Time, bool) {
	start, err := dateParam(r, "start_date")
	var end *time.Time
	if err == nil {
		end, err = dateParam(r, "end_date")
	}
	if err != nil {
		respond.Error(w, r, err)
		return nil, nil, false
	}
	return start, end, true
}

func (h *handler) revenueOverview(w http.ResponseWriter, r *http.Request) {
	start, end, ok := h.dates(w, r)
	if !ok {
		return
	}
	out, _, err := h.overview(r.Context(), start, end)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, out)
}

// revenueStreams is revenue_streams: purposes as labelled streams.
func (h *handler) revenueStreams(w http.ResponseWriter, r *http.Request) {
	start, end, ok := h.dates(w, r)
	if !ok {
		return
	}
	out, purposes, err := h.overview(r.Context(), start, end)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	streams := make([]map[string]any, len(purposes))
	for i, p := range purposes {
		code, label := p.K, p.K
		if code == "" {
			code, label = "OTHER", "Other"
		}
		streams[i] = map[string]any{"code": code, "label": label, "amount_kobo": p.Amount, "transactions": p.N}
	}
	respond.OK(w, map[string]any{"range": out["range"], "gross_kobo": out["gross_kobo"], "streams": streams,
		"channels": out["channels"]})
}
