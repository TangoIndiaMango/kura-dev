package mobility

import (
	"encoding/json"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
)

type discoverRow struct {
	ID            string   `json:"id"`
	Code          string   `json:"code"`
	Name          string   `json:"name"`
	Address       string   `json:"address"`
	Status        string   `json:"status"`
	UIStatus      string   `json:"ui_status"`
	Lat           float64  `json:"lat"`
	Lng           float64  `json:"lng"`
	ReadyCount    int32    `json:"ready_count"`
	HoursLabel    string   `json:"hours_label"`
	DistanceKm    *float64 `json:"distance_km"`
	DurationS     *int64   `json:"duration_s"`
	BatteryTypeID *string  `json:"battery_type_id"`
}

// haversineKm is the straight-line GeoPort (integrations.providers.haversine).
func haversineKm(lat1, lng1, lat2, lng2 float64) float64 {
	rad := math.Pi / 180
	p1, p2 := lat1*rad, lat2*rad
	dphi, dlmb := (lat2-lat1)*rad, (lng2-lng1)*rad
	a := math.Pow(math.Sin(dphi/2), 2) + math.Cos(p1)*math.Cos(p2)*math.Pow(math.Sin(dlmb/2), 2)
	return 2 * 6371.0 * math.Asin(math.Sqrt(a))
}

// hoursLabel is _hours_label: the first Monday window, if any.
func hoursLabel(raw []byte) string {
	var hours map[string]any
	if json.Unmarshal(raw, &hours) != nil || len(hours) == 0 {
		return "Hours on request"
	}
	for _, key := range []string{"mon", "monday", "Mon"} {
		windows, _ := hours[key].([]any)
		if len(windows) == 0 {
			continue
		}
		if first, ok := windows[0].([]any); ok && len(first) >= 2 {
			return pyStr(first[0]) + "–" + pyStr(first[1])
		}
	}
	return "See schedule"
}

func pyStr(v any) string {
	switch x := v.(type) {
	case string:
		return x
	case float64:
		return strconv.FormatFloat(x, 'f', -1, 64)
	}
	b, _ := json.Marshal(v)
	return string(b)
}

// optFloat reads a query float; Django's float() raises on junk (a 500),
// here it is a 400 for that parameter.
func optFloat(r *http.Request, name string) (*float64, error) {
	raw := r.URL.Query().Get(name)
	if raw == "" {
		return nil, nil
	}
	f, err := strconv.ParseFloat(strings.TrimSpace(raw), 64)
	if err != nil {
		return nil, apperr.Field(name, "A valid number is required.")
	}
	return &f, nil
}

// discover is discover_hubs: hubs with ready packs (of the rider's type),
// with straight-line distance when lat/lng are given.
func (h *HubHandler) discover(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	qv := r.URL.Query()
	lat, err := optFloat(r, "lat")
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	lng, err := optFloat(r, "lng")
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	radius, err := optFloat(r, "radius_km")
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	openNow := map[string]bool{"1": true, "true": true, "yes": true}[strings.ToLower(qv.Get("open_now"))]
	typeID, err := h.discoverType(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	hubs, err := h.q.DiscoverHubs(ctx, db.DiscoverHubsParams{OpenNow: openNow, TypeID: typeID, Lim: 50})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	origin := lat != nil && lng != nil
	rows := []discoverRow{}
	for _, hub := range hubs {
		ready := hub.ReadyCount
		if typeID != nil {
			ready = hub.TypeReadyCount
		}
		ui := "offline"
		switch {
		case hub.Status == "ONLINE" && ready >= 8:
			ui = "ready"
		case hub.Status == "ONLINE" && ready > 0, hub.Status == "MAINTENANCE":
			ui = "low"
		}
		row := discoverRow{ID: hub.ID.String(), Code: hub.Code, Name: hub.Name, Address: hub.Address,
			Status: hub.Status, UIStatus: ui, Lat: hub.Lat, Lng: hub.Lng, ReadyCount: ready,
			HoursLabel: hoursLabel(hub.OperatingHours)}
		if typeID != nil {
			s := typeID.String()
			row.BatteryTypeID = &s
		}
		if origin {
			km := haversineKm(*lat, *lng, hub.Lat, hub.Lng)
			d := pyRound(km, 3)
			dur := int64(math.Max(60, math.RoundToEven(km*4*60)))
			if radius != nil && d > *radius {
				continue
			}
			row.DistanceKm, row.DurationS = &d, &dur
		}
		rows = append(rows, row)
	}
	if origin {
		sort.SliceStable(rows, func(i, j int) bool { return *rows[i].DistanceKm < *rows[j].DistanceKm })
	}
	respond.OK(w, rows)
}

// discoverType is _resolve_battery_type_id: an explicit pack type, else the
// vehicle's model type. Unknown vehicles mean "any type".
func (h *HubHandler) discoverType(r *http.Request) (*uuid.UUID, error) {
	qv := r.URL.Query()
	raw := firstOf(qv.Get("battery_type"), qv.Get("battery_type_id"))
	if raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			return nil, apperr.Field("battery_type", "Must be a valid UUID.")
		}
		return &id, nil
	}
	vehicle := firstOf(qv.Get("vehicle"), qv.Get("vehicle_id"))
	if vehicle == "" {
		return nil, nil
	}
	vid, err := uuid.Parse(vehicle)
	if err != nil {
		return nil, apperr.Field("vehicle", "Must be a valid UUID.")
	}
	t, err := h.q.VehicleBatteryType(r.Context(), vid)
	if database.IsNoRows(err) {
		return nil, nil
	}
	return &t, err
}

func firstOf(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}
