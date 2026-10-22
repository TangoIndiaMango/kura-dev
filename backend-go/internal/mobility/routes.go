package mobility

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/router"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/throttle"
)

// Module mounts /api/v1/mobility/*.
type Module struct {
	hubs    *HubHandler
	btypes  *BatteryTypeHandler
	limiter *throttle.Limiter
}

func NewModule(pool *pgxpool.Pool, limiter *throttle.Limiter) *Module {
	return &Module{hubs: NewHubHandler(pool), btypes: NewBatteryTypeHandler(pool), limiter: limiter}
}

// Register mounts the ported routes. Not-yet-ported ones (e.g. hub status,
// which cancels reservations) fall through to Django via the proxy.
func (m *Module) Register(mux *http.ServeMux) {
	h := router.New(mux, "/api/v1/mobility/hubs", m.limiter) // HubViewSet capability_map
	h.Cap("GET", "/", "hubs:read", m.hubs.list)
	h.Cap("POST", "/", "hubs:manage", m.hubs.create)
	h.User("GET", "/discover/", m.hubs.discover)
	h.Cap("GET", "/export/", "hubs:read", m.hubs.export)
	h.Cap("GET", "/stats/", "hubs:read", m.hubs.stats)
	h.Cap("GET", "/{id}/", "hubs:read", m.hubs.get)
	h.Cap("PATCH", "/{id}/", "hubs:manage", m.hubs.patch)
	h.Cap("GET", "/{id}/slots/", "hubs:read", m.hubs.slots)
	h.Cap("GET", "/{id}/stats/", "hubs:read", m.hubs.detailStats)

	bt := router.New(mux, "/api/v1/mobility/battery-types", m.limiter)
	bt.Cap("GET", "/", "batteries:read", m.btypes.list)
	bt.Cap("POST", "/", "batteries:manage", m.btypes.create)
	bt.Cap("GET", "/{id}/", "batteries:read", m.btypes.get)
	bt.Cap("POST", "/{id}/activate/", "battery-types:approve", m.btypes.activate)
}
