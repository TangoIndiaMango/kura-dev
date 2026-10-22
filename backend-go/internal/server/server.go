// Package server assembles the HTTP application: one ServeMux, every module's
// routes, and the middleware chain. main only wires dependencies into it.
package server

import (
	"log/slog"
	"net/http"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/auth"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/middleware"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/config"
)

// Module is anything that mounts routes (health, accounts, mobility, …).
type Module interface {
	Register(mux *http.ServeMux)
}

// Deps are the shared services every module may need.
type Deps struct {
	Config config.Config
	Log    *slog.Logger
	Auth   *auth.Authenticator
	// Upstream (optional) serves routes Go hasn't ported: the Django backend.
	Upstream http.Handler
}

// New builds the root handler. Unknown paths get the JSON 404 envelope, not
// the stdlib text page.
func New(d Deps, modules ...Module) http.Handler {
	mux := http.NewServeMux()
	for _, m := range modules {
		m.Register(mux)
	}
	root := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, pattern := mux.Handler(r); pattern == "" {
			if d.Upstream != nil {
				d.Upstream.ServeHTTP(w, r)
				return
			}
			respond.Error(w, r, notFoundOrMethod(mux, r))
			return
		}
		w.Header().Set("X-Kura-Served-By", "go")
		// mux.ServeHTTP (not the looked-up handler) fills r.PathValue("id").
		mux.ServeHTTP(w, r)
	})
	return middleware.Chain(root,
		middleware.RequestID(d.Log),
		middleware.Recover,
		middleware.AccessLog,
		middleware.CORS(d.Config.CORSOrigins),
		d.Auth.Middleware,
	)
}

// notFoundOrMethod distinguishes 405 (path exists, wrong verb) from 404.
func notFoundOrMethod(mux *http.ServeMux, r *http.Request) error {
	for _, m := range []string{"GET", "POST", "PUT", "PATCH", "DELETE"} {
		if m == r.Method {
			continue
		}
		probe := r.Clone(r.Context())
		probe.Method = m
		if _, p := mux.Handler(probe); p != "" {
			return apperr.New("METHOD_NOT_ALLOWED",
				`Method "`+r.Method+`" not allowed.`).WithStatus(http.StatusMethodNotAllowed)
		}
	}
	return apperr.NotFound("Not found.")
}
