package mobility

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/router"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/qr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/throttle"
)

// Module mounts /api/v1/mobility/*.
type Module struct {
	hubs    *HubHandler
	btypes  *BatteryTypeHandler
	bats    *BatteryHandler
	limiter *throttle.Limiter
}

func NewModule(pool *pgxpool.Pool, signer qr.Signer, limiter *throttle.Limiter) *Module {
	return &Module{hubs: NewHubHandler(pool), btypes: NewBatteryTypeHandler(pool),
		bats: NewBatteryHandler(pool, signer), limiter: limiter}
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

	b, bh := router.New(mux, "/api/v1/mobility/batteries", m.limiter), m.bats // BatteryViewSet
	b.Cap("GET", "/", "batteries:read", bh.list)
	b.Cap("POST", "/", "batteries:manage", bh.create)
	b.Cap("GET", "/export/", "batteries:read", bh.export)
	b.Cap("POST", "/resolve/", "batteries:read", bh.resolve)
	b.Cap("GET", "/stats/", "batteries:read", bh.stats)
	b.Cap("GET", "/types/", "batteries:read", bh.types)
	b.Cap("GET", "/{id}/", "batteries:read", bh.get)
	b.Cap("PATCH", "/{id}/", "batteries:manage", bh.patch)
	b.Cap("GET", "/{id}/events/", "batteries:read", bh.events)
	b.Cap("POST", "/{id}/fault/", "batteries:manage", bh.noteAction((*BatteryHandler).faultTx))
	b.Cap("POST", "/{id}/found/", "batteries:manage", bh.noteAction((*BatteryHandler).foundTx))
	b.Cap("GET", "/{id}/label/", "batteries:manage", bh.label)
	b.Cap("POST", "/{id}/retire/", "batteries:manage", bh.noteAction((*BatteryHandler).retireTx))
	b.Cap("POST", "/{id}/rotate-qr/", "batteries:manage", bh.rotateQR)
	b.Cap("POST", "/{id}/status/", "batteries:manage", bh.status())
	b.Cap("POST", "/{id}/transfer/", "batteries:manage", bh.transfer())
}
