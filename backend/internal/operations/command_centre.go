package operations

import (
	"context"
	"net/http"
	"sort"
	"strconv"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/auth"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/router"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/mail"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/throttle"
)

// centreCache is the 30 s cache.get_or_set("ops:command_centre:v3").
var centreCache struct {
	sync.Mutex
	at   time.Time
	body map[string]any
}

func hourly(ctx context.Context, q *db.Queries, start, end time.Time) ([]int32, error) {
	counts := make([]int32, 24)
	rows, err := q.HourlyCompletedSwaps(ctx, db.HourlyCompletedSwapsParams{DayStart: &start, DayEnd: &end})
	for _, r := range rows {
		counts[r.H] = r.N
	}
	return counts, err
}

// buildCommandCentre is build_command_centre (Lagos business day).
func buildCommandCentre(ctx context.Context, q *db.Queries) (map[string]any, error) {
	now := time.Now().In(lagos)
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, lagos)
	tomorrow, yesterday := today.AddDate(0, 0, 1), today.AddDate(0, 0, -1)
	rows, err := q.CommandCentreHubs(ctx)
	if err != nil {
		return nil, err
	}
	hubs, online := make([]map[string]any, len(rows)), 0
	for i, h := range rows {
		var sync any
		if h.LastSyncAt != nil {
			sync = jsontime.FormatISO(*h.LastSyncAt)
		}
		if h.Status == "ONLINE" {
			online++
		}
		hubs[i] = map[string]any{"id": h.ID.String(), "code": h.Code, "name": h.Name, "status": h.Status,
			"ready": h.Ready, "charging": h.Charging, "issued": h.Issued, "open_alerts": h.OpenAlerts,
			"last_sync_at": sync, "solar_capacity_kw": h.SolarCapacityKw, "solar_fault": h.SolarFault}
	}
	k, err := q.CommandCentreKPIs(ctx, db.CommandCentreKPIsParams{DayStart: &today, DayEnd: &tomorrow})
	if err != nil {
		return nil, err
	}
	td, err := hourly(ctx, q, today, tomorrow)
	if err != nil {
		return nil, err
	}
	yd, err := hourly(ctx, q, yesterday, today)
	if err != nil {
		return nil, err
	}
	return map[string]any{"hubs": hubs,
		"kpis": map[string]any{"today_swaps": k.TodaySwaps, "today_revenue_kobo": k.TodayRevenueKobo,
			"active_alerts": k.ActiveAlerts, "today_cash_kobo": k.TodayCashKobo, "online_hubs": online,
			"total_hubs": len(hubs)},
		"hourly_swaps": map[string]any{"today": td, "yesterday": yd},
		"generated_at": jsontime.FormatISO(time.Now())}, nil
}

func (h *Handler) commandCentre(w http.ResponseWriter, r *http.Request) {
	centreCache.Lock()
	defer centreCache.Unlock()
	if centreCache.body == nil || time.Since(centreCache.at) > 30*time.Second {
		body, err := buildCommandCentre(r.Context(), h.q)
		if err != nil {
			respond.Error(w, r, err)
			return
		}
		centreCache.body, centreCache.at = body, time.Now()
	}
	respond.OK(w, centreCache.body)
}

// activity is build_activity: latest swaps + open alerts, newest first.
// A bad ?limit is a 400 here (Django's int() raised a 500).
func (h *Handler) activity(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	limit := 25
	if raw := r.URL.Query().Get("limit"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 0 {
			respond.Error(w, r, apperr.Field("limit", "A valid integer is required."))
			return
		}
		limit = min(n, 100)
	}
	swaps, err := h.q.ActivitySwaps(ctx, int32(limit))
	var alerts []db.ActivityAlertsRow
	if err == nil {
		alerts, err = h.q.ActivityAlerts(ctx, int32(limit))
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	type row struct {
		at   time.Time
		body map[string]any
	}
	rows := make([]row, 0, len(swaps)+len(alerts))
	for _, s := range swaps {
		rows = append(rows, row{s.CreatedAt, map[string]any{"id": s.ID.String(), "kind": "swap",
			"title": "Swap at " + s.HubCode, "subtitle": s.RegistrationPlate, "hub_code": s.HubCode,
			"created_at": jsontime.FormatISO(s.CreatedAt), "link_path": "/swaps/" + s.ID.String()}})
	}
	for _, a := range alerts {
		var hub any
		if a.HubCode != nil {
			hub = *a.HubCode
		}
		rows = append(rows, row{a.CreatedAt, map[string]any{"id": a.ID.String(), "kind": "alert", "title": a.Kind,
			"subtitle": truncate(a.Message, 120), "hub_code": hub, "created_at": jsontime.FormatISO(a.CreatedAt),
			"link_path": "/alerts/" + a.ID.String()}})
	}
	// Python sorts the isoformat strings (stable, reverse).
	sort.SliceStable(rows, func(i, j int) bool {
		return rows[i].body["created_at"].(string) > rows[j].body["created_at"].(string)
	})
	out := make([]map[string]any, 0, limit)
	for i := 0; i < len(rows) && i < limit; i++ {
		out = append(out, rows[i].body)
	}
	respond.OK(w, map[string]any{"results": out})
}

// Module mounts /api/v1/operations/*.
type Module struct {
	h       *Handler
	limiter *throttle.Limiter
}

func NewModule(pool *pgxpool.Pool, mailer *mail.Mailer, tokens *auth.Tokens, receiptKey, clientURL string,
	floatLimit int64, limiter *throttle.Limiter) *Module {
	return &Module{h: NewHandler(pool, NewService(pool, mailer, tokens, receiptKey, clientURL, floatLimit)), limiter: limiter}
}

// Service exposes the cash / override flows to the swap settlement.
func (m *Module) Service() *Service { return m.h.svc }

func (m *Module) Register(mux *http.ServeMux) {
	h := m.h
	g := router.New(mux, "/api/v1/operations", m.limiter)
	g.Cap("GET", "/command-centre/", "hubs:manage", h.commandCentre)
	g.Cap("GET", "/activity/", "hubs:manage", h.activity)

	g.Cap("GET", "/shifts/", "shifts:manage", h.shifts)
	g.Cap("POST", "/shifts/", "shifts:manage", h.openShift)
	g.Cap("POST", "/shifts/open/", "shifts:manage", h.openShift)
	g.Cap("GET", "/shifts/{id}/", "shifts:manage", h.getShift)
	g.Cap("POST", "/shifts/{id}/close/", "shifts:manage", h.closeShift)
	g.Cap("POST", "/shifts/{id}/lodge/", "shifts:manage", h.lodge)

	g.Cap("GET", "/cash-deposits/", "finance:read", h.deposits)
	g.Cap("POST", "/cash-deposits/", "shifts:manage", h.createDeposit)
	g.Cap("GET", "/cash-deposits/{id}/", "finance:read", h.getDeposit)
	g.User("GET", "/cash-deposits/{id}/receipt/", h.receipt)
	g.User("POST", "/cash-deposits/{id}/flag/", h.flag)

	g.Cap("GET", "/overrides/", "shifts:manage", h.overrides)
	g.Cap("POST", "/overrides/", "swaps:complete", h.createOverride)
	g.Cap("GET", "/overrides/{id}/", "shifts:manage", h.getOverride)
	g.Cap("PATCH", "/overrides/{id}/", "shifts:manage", h.patchOverride)

	g.Cap("GET", "/alerts/", "alerts:read", h.alerts)
	g.Cap("GET", "/alerts/export/", "alerts:read", h.alertExport)
	g.Cap("GET", "/alerts/stats/", "alerts:read", h.alertStats)
	g.Cap("GET", "/alerts/{id}/", "alerts:read", h.getAlert)
	g.Cap("POST", "/alerts/{id}/ack/", "alerts:manage", h.transition(ack))
	g.Cap("POST", "/alerts/{id}/resolve/", "alerts:manage", h.transition(resolve))
	g.Cap("POST", "/alerts/{id}/escalate/", "alerts:manage", h.transition(escalate))

	g.Cap("GET", "/alert-rules/", "alerts:read", h.rules)
	g.Cap("POST", "/alert-rules/", "alerts:manage", h.createRule)
	g.Cap("GET", "/alert-rules/{id}/", "alerts:read", h.getRule)
	g.Cap("PATCH", "/alert-rules/{id}/", "alerts:manage", h.patchRule)

	g.Cap("GET", "/inventory-counts/", "hubs:read", h.counts)
	g.Cap("POST", "/inventory-counts/", "shifts:manage", h.createCount)
}
