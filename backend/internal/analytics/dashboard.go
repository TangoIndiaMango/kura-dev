// Package analytics ports the analytics app: dashboard tiles, hub demand
// forecast, revenue overview / streams, government impact, impact stories
// and cooperative rollups.
package analytics

import (
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/scope"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/spend"
)

var lagos, _ = time.LoadLocation("Africa/Lagos")

type handler struct {
	pool   *pgxpool.Pool
	q      *db.Queries
	petrol spend.Petrol
}

func midnight(t time.Time) time.Time {
	t = t.In(lagos)
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, lagos)
}

// dashboard is DashboardStatsView: network tiles since Lagos midnight.
func (h *handler) dashboard(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	c, err := h.q.DashboardCounts(ctx, midnight(time.Now()))
	var slots []db.SlotStateCountsRow
	if err == nil {
		slots, err = h.q.SlotStateCounts(ctx)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	dist := map[string]int32{}
	for _, s := range slots {
		dist[s.State] = s.N
	}
	respond.OK(w, map[string]any{
		"hubs":      map[string]any{"total": c.Hubs, "online": c.HubsOnline},
		"batteries": map[string]any{"total": c.Batteries, "ready": c.Ready, "charging": c.Charging, "issued": c.Issued},
		"swaps":     map[string]any{"total": c.Swaps, "today": c.SwapsToday, "today_mismatches": c.MismatchesToday},
		"finance": map[string]any{"today_revenue_kobo": c.RevenueToday,
			"today_revenue_naira": float64(c.RevenueToday) / 100.0},
		"operations": map[string]any{"active_alerts": c.Alerts, "active_vehicles": c.Vehicles,
			"slots_distribution": dist},
	})
}

// demand is DemandForecastViewSet.hubs (hub_demand_forecast).
func (h *handler) demand(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	raw, ok := r.URL.Query()["lookback_days"]
	days := 28
	if ok {
		n, err := strconv.Atoi(strings.TrimSpace(raw[0]))
		if err != nil {
			respond.Error(w, r, apperr.New("VALIDATION_ERROR", "lookback_days must be an integer."))
			return
		}
		days = n
	}
	days = max(7, min(days, 90))
	hubs, err := scope.HubsFor(ctx, h.q, reqctx.User(ctx))
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	if hubs.IDs == nil {
		hubs.IDs = []uuid.UUID{}
	}
	rows, err := h.q.DemandHubs(ctx, db.DemandHubsParams{AllRows: hubs.All, Hubs: hubs.IDs})
	ids := make([]uuid.UUID, len(rows))
	for i, x := range rows {
		ids[i] = x.ID
	}
	since := time.Now().Add(-time.Duration(days) * 24 * time.Hour)
	var totals []db.DemandTotalsRow
	var peaks []db.DemandPeakHoursRow
	if err == nil {
		totals, err = h.q.DemandTotals(ctx, db.DemandTotalsParams{Hubs: ids, Since: &since})
	}
	if err == nil {
		peaks, err = h.q.DemandPeakHours(ctx, db.DemandPeakHoursParams{Hubs: ids, Since: &since})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	total, peak := map[uuid.UUID]int{}, map[uuid.UUID]int32{}
	for _, t := range totals {
		total[t.HubID] = int(t.N)
	}
	for _, p := range peaks {
		if _, seen := peak[p.HubID]; !seen {
			peak[p.HubID] = p.Hour
		}
	}
	out := make([]map[string]any, 0, len(rows))
	for _, x := range rows {
		n := total[x.ID]
		var hour any
		if p, ok := peak[x.ID]; ok {
			hour = p
		}
		conf := "LOW"
		if n >= days {
			conf = "MEDIUM"
		}
		out = append(out, map[string]any{"hub_id": x.ID.String(), "hub_code": x.Code, "hub_name": x.Name,
			"expected_swaps_next_24h": (n + days - 1) / days, "peak_hour_utc": hour, "historical_swaps": n,
			"lookback_days": days, "method": "trailing_daily_average", "confidence": conf})
	}
	respond.OK(w, map[string]any{"results": out})
}

var isoDate = regexp.MustCompile(`^(\d{4})-(\d{1,2})-(\d{1,2})$`)

// dateParam is _date_param (parse_date; Go also 400s an impossible date,
// where Django 500s).
func dateParam(r *http.Request, name string) (*time.Time, error) {
	v := r.URL.Query().Get(name)
	if v == "" {
		return nil, nil
	}
	bad := apperr.New("VALIDATION_ERROR", name+" must be YYYY-MM-DD.").
		WithDetails(apperr.Details{name: []string{"invalid_date"}})
	m := isoDate.FindStringSubmatch(v)
	if m == nil {
		return nil, bad
	}
	y, _ := strconv.Atoi(m[1])
	mo, _ := strconv.Atoi(m[2])
	d, _ := strconv.Atoi(m[3])
	t := time.Date(y, time.Month(mo), d, 0, 0, 0, 0, lagos)
	if t.Year() != y || int(t.Month()) != mo || t.Day() != d {
		return nil, bad
	}
	return &t, nil
}
