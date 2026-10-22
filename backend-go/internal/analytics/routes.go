package analytics

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/router"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/spend"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/throttle"
)

// Module mounts /api/v1/analytics/*.
type Module struct {
	h       *handler
	limiter *throttle.Limiter
}

func NewModule(pool *pgxpool.Pool, petrol spend.Petrol, limiter *throttle.Limiter) *Module {
	return &Module{h: &handler{pool: pool, q: db.New(pool), petrol: petrol}, limiter: limiter}
}

func (m *Module) Register(mux *http.ServeMux) {
	g := router.New(mux, "/api/v1/analytics", m.limiter)
	g.User("GET", "/dashboard/", m.h.dashboard)
	g.Cap("GET", "/demand/hubs/", "hubs:read", m.h.demand)
	g.Cap("GET", "/revenue/overview/", "analytics:revenue", m.h.revenueOverview)
	g.Cap("GET", "/revenue/streams/", "analytics:revenue", m.h.revenueStreams)
	g.Cap("GET", "/impact/", "analytics:impact", m.h.impact)
	g.Cap("GET", "/cooperative/me/", "analytics:cooperative", m.h.myCooperative)
	g.Cap("GET", "/cooperative/{id}/", "analytics:cooperative", m.h.cooperative)
	g.Cap("GET", "/stories/", "analytics:impact", m.h.listStories)
	g.Cap("POST", "/stories/", "impact:manage", m.h.createStory)
	g.Cap("GET", "/stories/{id}/", "analytics:impact", m.h.getStory)
	g.Cap("PATCH", "/stories/{id}/", "impact:manage", m.h.patchStory)
	g.Cap("POST", "/stories/{id}/publish/", "impact:manage", m.h.publishStory)
}
