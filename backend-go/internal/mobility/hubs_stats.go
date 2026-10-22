package mobility

import (
	"math"
	"net/http"
	"time"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/spend"
)

// stats is hub_stats: status totals, ready/charging inventory and the first
// 20 hubs' ready counts, all within the caller's hub scope.
func (h *HubHandler) stats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	all, ids, err := h.hubScope(ctx)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	counts, err := h.q.HubStatusCounts(ctx, db.HubStatusCountsParams{AllRows: all, ScopeIds: ids})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	status, total := map[string]int32{}, int32(0)
	for _, c := range counts {
		status[c.Status], total = c.N, total+c.N
	}
	inv, err := h.q.HubInventory(ctx, db.HubInventoryParams{AllRows: all, ScopeIds: ids})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	first, err := h.q.ListHubIDs(ctx, db.ListHubIDsParams{AllRows: all, ScopeIds: ids, Ord: "code", Lim: 20})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows, err := h.rows(ctx, first)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	type ready struct {
		Code  string `json:"code"`
		Ready int32  `json:"ready"`
	}
	byHub := make([]ready, len(rows))
	for i, row := range rows {
		byHub[i] = ready{row.Code, row.ReadyCount}
	}
	respond.OK(w, map[string]any{
		"totals": map[string]int32{"all": total, "online": status["ONLINE"], "offline": status["OFFLINE"],
			"maintenance": status["MAINTENANCE"], "closed": status["CLOSED"]},
		"inventory":    map[string]int32{"ready": inv.Ready, "charging": inv.Charging},
		"by_hub_ready": byHub,
	})
}

type hubDay struct {
	Date         string  `json:"date"`
	Label        string  `json:"label"`
	Swaps        int32   `json:"swaps"`
	EnergyKWh    float64 `json:"energy_kwh"`
	RevenueKobo  int64   `json:"revenue_kobo"`
	RevenueNaira float64 `json:"revenue_naira"`
}

// detailStats is hub_detail_stats: swaps, energy and revenue per Lagos day
// over a clamped window (default 14 days ending today's UTC date), plus a
// trailing 28-day forecast and live slot states.
func (h *HubHandler) detailStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	hub, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	now := time.Now()
	qv := r.URL.Query()
	start, end := spend.Window(qv.Get("start_date"), qv.Get("end_date"), spend.DateOf(now.UTC()))
	from, to := start.Start(), end.AddDays(1).Start()
	tot, err := h.q.HubSwapTotals(ctx, db.HubSwapTotalsParams{HubID: hub.ID, FromAt: from, ToAt: to})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	daily, err := h.q.HubSwapDaily(ctx, db.HubSwapDailyParams{HubID: hub.ID, FromAt: from, ToAt: to})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	metrics, energy := []hubDay{}, 0.0
	for _, d := range spend.Days(start, end) {
		m := hubDay{Date: d.ISO(), Label: d.Label()}
		for _, x := range daily {
			if d.Equal(x.Day.Time) {
				m.Swaps, m.EnergyKWh, m.RevenueKobo = x.Swaps, pyRound(x.Energy, 1), x.Revenue
				m.RevenueNaira = pyRound(float64(x.Revenue)/100, 2)
			}
		}
		energy += m.EnergyKWh
		metrics = append(metrics, m)
	}
	days := start.DaysUntil(end) + 1
	perDay := pyRound(float64(tot.Swaps)/float64(days), 1)
	// Django builds the forecast with user=None, whose hub scope is empty, so
	// the hub is never found and this fallback is what it returns.
	var expected, estimate any
	if perDay > 0 {
		e := math.RoundToEven(perDay)
		expected = int64(e)
		if tot.Swaps > 0 {
			avgFee := math.RoundToEven(float64(tot.Revenue) / float64(tot.Swaps))
			estimate = pyRound(e*avgFee/100, 2)
		}
	}
	slots, err := h.q.HubSlotStateCounts(ctx, hub.ID)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	totalSlots := hub.SlotCount
	if totalSlots == 0 {
		if totalSlots = slots.Ready + slots.Charging + slots.Empty + slots.Fault; totalSlots == 0 {
			totalSlots = 24
		}
	}
	solar, _ := parseFloat(hub.SolarCapacityKw)
	respond.OK(w, map[string]any{
		"hub_id": hub.ID.String(), "code": hub.Code, "name": hub.Name, "status": hub.Status,
		"solar_capacity_kw": solar, "solar_output_kw": nil, "total_slots": totalSlots,
		"ready_count": slots.Ready, "charging_count": slots.Charging, "empty_count": slots.Empty,
		"fault_count": slots.Fault, "swaps_count": tot.Swaps, "swaps_per_day": perDay,
		"energy_kwh_total": pyRound(energy, 1), "revenue_kobo_total": tot.Revenue,
		"revenue_naira_total":     pyRound(float64(tot.Revenue)/100, 2),
		"daily_revenue_naira_avg": pyRound(float64(tot.Revenue)/float64(days)/100, 2),
		"expected_swaps_today":    expected, "estimated_revenue_today_naira": estimate,
		"daily_metrics": metrics, "start_date": start.ISO(), "end_date": end.ISO(),
	})
}
