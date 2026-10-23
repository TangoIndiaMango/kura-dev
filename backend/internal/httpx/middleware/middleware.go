// Package middleware holds the cross-cutting HTTP chain. Order (outermost
// first): RequestID → Recover → AccessLog → CORS → Authenticate → handler.
package middleware

import (
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/logging"
)

// Middleware is the standard decorator shape.
type Middleware func(http.Handler) http.Handler

// Chain applies mws so the first one listed runs first.
func Chain(h http.Handler, mws ...Middleware) http.Handler {
	for i := len(mws) - 1; i >= 0; i-- {
		h = mws[i](h)
	}
	return h
}

// RequestID adopts X-Request-ID or makes one, sets X-Kura-Server-Time (the
// clock riders' hold countdowns trust) and a request-scoped logger.
func RequestID(base *slog.Logger) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			id := strings.TrimSpace(r.Header.Get("X-Request-ID"))
			if id == "" {
				id = uuid.NewString()
			}
			ip := clientIP(r)
			ctx := reqctx.WithRequestID(r.Context(), id)
			ctx = reqctx.WithClientIP(ctx, ip)
			ctx = logging.WithLogger(ctx, base.With("request_id", id))
			w.Header().Set("X-Request-ID", id)
			w.Header().Set("X-Kura-Server-Time", time.Now().UTC().Format(time.RFC3339Nano))
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// Recover turns a panic into a logged 500 envelope instead of a dropped
// connection.
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if p := recover(); p != nil {
				if p == http.ErrAbortHandler {
					panic(p)
				}
				respond.Error(w, r, fmt.Errorf("panic: %v", p))
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// AccessLog writes one line per request without the query string (PII).
func AccessLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		actor := ""
		if p := reqctx.User(r.Context()); p != nil {
			actor = p.UserID
		}
		logging.From(r.Context()).Info("request",
			"method", r.Method, "path", r.URL.Path, "status", rec.status,
			"duration_ms", float64(time.Since(start).Microseconds())/1000,
			"actor_id", actor, "client_ip", reqctx.ClientIP(r.Context()))
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (s *statusRecorder) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

// Unwrap lets http.ResponseController reach the underlying writer.
func (s *statusRecorder) Unwrap() http.ResponseWriter { return s.ResponseWriter }

// clientIP takes the first X-Forwarded-For hop (Render/Caddy) else RemoteAddr.
func clientIP(r *http.Request) string {
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		first, _, _ := strings.Cut(fwd, ",")
		return strings.TrimSpace(first)
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
