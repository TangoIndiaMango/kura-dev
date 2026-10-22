// Package health serves /healthz (liveness) and /readyz (readiness) with the
// same bodies as Django's config/urls.py.
package health

import (
	"context"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
)

const version = "1.0.0"

type Handler struct{ pool *pgxpool.Pool }

func New(pool *pgxpool.Pool) *Handler { return &Handler{pool: pool} }

// Register mounts both probes.
func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /healthz", h.live)
	mux.HandleFunc("GET /readyz", h.ready)
}

func (h *Handler) live(w http.ResponseWriter, r *http.Request) {
	respond.OK(w, map[string]any{
		"status":  "ok",
		"service": "kura-api",
		"version": version,
		"checks":  h.checks(r.Context()),
	})
}

func (h *Handler) ready(w http.ResponseWriter, r *http.Request) {
	checks := h.checks(r.Context())
	ready := checks["database"] == "ok" && checks["cache"] == "ok"
	status, code := "ready", http.StatusOK
	if !ready {
		status, code = "not_ready", http.StatusServiceUnavailable
	}
	respond.JSON(w, code, map[string]any{"status": status, "checks": checks})
}

func (h *Handler) checks(ctx context.Context) map[string]string {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	db := "ok"
	if err := h.pool.Ping(ctx); err != nil {
		db = "fail"
	}
	// No shared cache yet: the in-process cache is always available.
	return map[string]string{"database": db, "cache": "ok"}
}
