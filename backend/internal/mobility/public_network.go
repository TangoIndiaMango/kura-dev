package mobility

import (
	"net/http"
	"time"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/spend"
)

// The public site (landing page) shows the live network: hubs and how many
// packs are ready, plans, and the pay-per-swap price. Read-only, no rider or
// staff data, cached briefly.

type publicHub struct {
	Name       string  `json:"name"`
	Address    string  `json:"address"`
	Status     string  `json:"status"` // ready | low | offline
	ReadyCount int32   `json:"ready_count"`
	HoursLabel string  `json:"hours_label"`
	Lat        float64 `json:"lat"`
	Lng        float64 `json:"lng"`
}

type publicPlan struct {
	VehicleType   string `json:"vehicle_type"`
	Name          string `json:"name"`
	Period        string `json:"period"` // swap | day | week | month
	PriceKobo     int64  `json:"price_kobo"`
	SwapAllowance *int32 `json:"swap_allowance"` // nil = unlimited (or per swap)
	DurationDays  *int32 `json:"duration_days"`
}

type publicNetwork struct {
	Hubs       []publicHub      `json:"hubs"`
	Plans      []publicPlan     `json:"plans"`
	PayPerSwap map[string]int64 `json:"pay_per_swap_kobo"` // by vehicle type
}

var publicVehicleTypes = []string{"MOTORCYCLE", "TRICYCLE", "BOAT"}

func (h *HubHandler) publicNetwork(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	hubs, err := h.q.DiscoverHubs(ctx, db.DiscoverHubsParams{Lim: 200})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := publicNetwork{Hubs: []publicHub{}, Plans: []publicPlan{}, PayPerSwap: map[string]int64{}}
	for _, hub := range hubs {
		status := "offline"
		switch {
		case hub.Status == "ONLINE" && hub.ReadyCount >= 8:
			status = "ready"
		case hub.Status == "ONLINE" && hub.ReadyCount > 0, hub.Status == "MAINTENANCE":
			status = "low"
		}
		out.Hubs = append(out.Hubs, publicHub{Name: hub.Name, Address: hub.Address, Status: status,
			ReadyCount: hub.ReadyCount, HoursLabel: hoursLabel(hub.OperatingHours), Lat: hub.Lat, Lng: hub.Lng})
	}
	active, status := true, "ACTIVE"
	plans, err := h.q.ListPlans(ctx, db.ListPlansParams{Active: &active, Status: &status, Ord: "price_kobo", Lim: 100})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	for _, p := range plans {
		out.Plans = append(out.Plans, publicPlan{VehicleType: p.VehicleType, Name: p.Name, Period: p.Period,
			PriceKobo: p.PriceKobo, SwapAllowance: p.SwapAllowance, DurationDays: p.DurationDays})
	}
	today := dateOf(spend.LagosToday(time.Now()))
	for _, vt := range publicVehicleTypes {
		m, err := h.q.ActiveMatrixAsOf(ctx, db.ActiveMatrixAsOfParams{VehicleType: vt, Today: today})
		if database.IsNoRows(err) {
			continue // not priced yet: the site leaves that vehicle out
		}
		if err != nil {
			respond.Error(w, r, err)
			return
		}
		out.PayPerSwap[vt] = m.PayPerSwapKobo
	}
	w.Header().Set("Cache-Control", "public, max-age=60")
	respond.OK(w, out)
}
