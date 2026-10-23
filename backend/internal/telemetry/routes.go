package telemetry

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/router"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/throttle"
)

// hashKey is hash_iot_api_key.
func hashKey(raw string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(raw)))
	return hex.EncodeToString(sum[:])
}

// Module mounts /api/v1/mobility/telemetry/* and /api/v1/telemetry/ingest.
type Module struct {
	h       handler
	limiter *throttle.Limiter
}

func NewModule(pool *pgxpool.Pool, limiter *throttle.Limiter) *Module {
	return &Module{h: handler{pool: pool, q: db.New(pool)}, limiter: limiter}
}

func (m *Module) Register(mux *http.ServeMux) {
	g := router.New(mux, "/api/v1/mobility/telemetry", m.limiter)
	g.Cap("GET", "/fleet/", "telemetry:read", m.h.fleet)
	g.Cap("GET", "/events/", "telemetry:read", m.h.list)
	g.Cap("POST", "/events/ingest/", "telemetry:ingest", m.h.ingest)
	g.Cap("GET", "/events/{id}/", "telemetry:read", m.h.get)
	d := router.New(mux, "/api/v1/telemetry", m.limiter)
	d.Public("POST", "/ingest", m.h.deviceIngest)
	d.Public("POST", "/ingest/", m.h.deviceIngest)
}
