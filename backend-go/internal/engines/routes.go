package engines

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/router"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/media"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/throttle"
)

// Module mounts /api/v1/mobility/{engines,retrofits,eboarders}/*.
type Module struct {
	h       *handler
	limiter *throttle.Limiter
}

func NewModule(pool *pgxpool.Pool, cdn media.Cloudinary, limiter *throttle.Limiter) *Module {
	return &Module{h: &handler{pool: pool, q: db.New(pool), cdn: cdn}, limiter: limiter}
}

func (m *Module) Register(mux *http.ServeMux) {
	e := router.New(mux, "/api/v1/mobility/engines", m.limiter) // HasCapabilityOrReadOwn
	e.User("GET", "/", m.h.listEngines)
	e.User("GET", "/{id}/", m.h.getEngine)
	e.AnyCap("POST", "/{id}/release-request/", []string{"engines:manage", "accounts:write_own"}, m.h.releaseRequest)
	e.Cap("POST", "/{id}/release/", "engines:release", m.h.release)

	r := router.New(mux, "/api/v1/mobility/retrofits", m.limiter)
	r.Cap("GET", "/", "engines:manage", m.h.listRetrofits)
	r.Cap("POST", "/", "engines:manage", m.h.createRetrofit)
	r.Cap("GET", "/{id}/", "engines:manage", m.h.getRetrofit)
	r.Cap("POST", "/{id}/engine-intake/", "engines:manage", m.h.engineIntake)
	r.Cap("POST", "/{id}/install/", "engines:manage", m.h.installHandler)
	r.Cap("POST", "/{id}/checklist/", "engines:manage", m.h.checklistHandler)
	r.Cap("POST", "/{id}/activate/", "engines:manage", m.h.activate)

	b := router.New(mux, "/api/v1/mobility/eboarders", m.limiter)
	b.Cap("GET", "/", "engines:manage", m.h.listEBoarders)
	b.Cap("POST", "/", "engines:manage", m.h.createEBoarder)
	b.Cap("GET", "/stats/", "engines:manage", m.h.eboarderStats)
	b.Cap("GET", "/{id}/", "engines:manage", m.h.getEBoarder)
	b.Cap("PATCH", "/{id}/", "engines:manage", m.h.patchEBoarder)
}
