package middleware

import (
	"net/http"
	"strings"
)

// Same lists as Django's CORS_ALLOW_HEADERS / CORS_EXPOSE_HEADERS.
const (
	allowHeaders  = "accept, authorization, content-type, user-agent, x-csrftoken, x-requested-with, idempotency-key, x-kura-device-id, x-request-id"
	exposeHeaders = "x-kura-server-time, x-request-id, retry-after, x-kura-served-by"
	allowMethods  = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
)

// CORS allows the listed origins (credentials on). An empty list allows any
// origin, matching Django's CORS_ALLOW_ALL_ORIGINS fallback.
func CORS(origins []string) Middleware {
	allowed := map[string]bool{}
	for _, o := range origins {
		if o = strings.TrimRight(strings.TrimSpace(o), "/"); o != "" {
			allowed[o] = true
		}
	}
	allowAll := len(allowed) == 0
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" && (allowAll || allowed[origin]) {
				h := w.Header()
				h.Set("Access-Control-Allow-Origin", origin)
				h.Set("Access-Control-Allow-Credentials", "true")
				h.Set("Access-Control-Expose-Headers", exposeHeaders)
				h.Add("Vary", "Origin")
				if r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != "" {
					h.Set("Access-Control-Allow-Methods", allowMethods)
					h.Set("Access-Control-Allow-Headers", allowHeaders)
					h.Set("Access-Control-Max-Age", "86400")
					w.WriteHeader(http.StatusOK)
					return
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}
