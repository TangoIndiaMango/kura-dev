package server

import (
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
)

// Upstream forwards requests Go has not ported yet to the Django backend
// (strangler-fig migration): the apps talk only to Go, nothing is missing,
// and endpoints move over one module at a time. Disabled when url is empty.
func Upstream(rawURL string, log *slog.Logger) (http.Handler, error) {
	if rawURL == "" {
		return nil, nil
	}
	target, err := url.Parse(rawURL)
	if err != nil {
		return nil, err
	}
	proxy := httputil.NewSingleHostReverseProxy(target)
	base := proxy.Director
	proxy.Director = func(r *http.Request) {
		base(r)
		r.Host = target.Host
		// One request id across both backends' logs and error envelopes.
		if id := reqctx.RequestID(r.Context()); id != "" {
			r.Header.Set("X-Request-ID", id)
		}
	}
	proxy.ModifyResponse = func(resp *http.Response) error {
		// CORS, request id and server time are already set by Go's middleware.
		for _, h := range []string{"Access-Control-Allow-Origin", "Access-Control-Allow-Credentials",
			"Access-Control-Expose-Headers", "Vary", "X-Request-ID", "X-Kura-Server-Time"} {
			resp.Header.Del(h)
		}
		resp.Header.Set("X-Kura-Served-By", "django")
		return nil
	}
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		log.Error("upstream django unreachable", "err", err, "path", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadGateway)
		_, _ = w.Write([]byte(`{"error":{"code":"UPSTREAM_UNAVAILABLE","message":"Service temporarily unavailable.","details":{},"request_id":""}}`))
	}
	return proxy, nil
}
