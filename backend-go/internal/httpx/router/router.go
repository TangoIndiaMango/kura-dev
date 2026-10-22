// Package router registers Django-style routes on a stdlib ServeMux.
//
// Django paths end in "/" and match exactly. In ServeMux a trailing "/" means
// "this whole subtree", so every pattern registered here gets "{$}" appended
// to keep exact matching. Modules always register through Group.
//
// Each route runs DRF's order: authentication (global middleware) →
// permission (Public/User/Cap) → throttles (defaults unless overridden).
package router

import (
	"net/http"
	"strings"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/auth"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/throttle"
)

// Group mounts routes under a common prefix (e.g. "/api/v1/hubs").
type Group struct {
	mux     *http.ServeMux
	prefix  string
	limiter *throttle.Limiter
	rules   []throttle.Rule
}

// New starts a group at prefix on mux with the default throttles.
func New(mux *http.ServeMux, prefix string, limiter *throttle.Limiter) *Group {
	return &Group{mux: mux, prefix: strings.TrimRight(prefix, "/"), limiter: limiter,
		rules: throttle.Defaults}
}

// Group nests a sub-prefix (same throttles).
func (g *Group) Group(sub string) *Group {
	c := *g
	c.prefix = g.prefix + "/" + strings.Trim(sub, "/")
	return &c
}

// Throttle returns a copy whose routes use rules instead of the defaults
// (DRF get_throttles override). No rules = unthrottled.
func (g *Group) Throttle(rules ...throttle.Rule) *Group {
	c := *g
	c.rules = rules
	return &c
}

// Public mounts a handler open to anonymous callers (DRF AllowAny).
func (g *Group) Public(method, path string, h http.HandlerFunc) {
	g.mux.HandleFunc(method+" "+g.pattern(path), g.throttled(h))
}

// User mounts a handler for any signed-in caller (IsAuthenticated).
func (g *Group) User(method, path string, h http.HandlerFunc) {
	g.mux.HandleFunc(method+" "+g.pattern(path), auth.RequireUser(g.throttled(h)))
}

// Cap mounts a handler gated by a capability code (HasCapability).
func (g *Group) Cap(method, path, capability string, h http.HandlerFunc) {
	g.mux.HandleFunc(method+" "+g.pattern(path), auth.RequireCap(capability, g.throttled(h)))
}

// AnyCap mounts a handler allowed for any of several capabilities
// (capability_map entries given as a list).
func (g *Group) AnyCap(method, path string, caps []string, h http.HandlerFunc) {
	g.mux.HandleFunc(method+" "+g.pattern(path), auth.RequireAnyCap(caps, g.throttled(h)))
}

func (g *Group) throttled(h http.HandlerFunc) http.HandlerFunc {
	if g.limiter == nil || len(g.rules) == 0 {
		return h
	}
	rules := g.rules
	return func(w http.ResponseWriter, r *http.Request) {
		if err := g.limiter.Check(r, rules); err != nil {
			respond.Error(w, r, err)
			return
		}
		h(w, r)
	}
}

// pattern joins prefix + path and pins exact matching for "/"-terminated
// paths. "{id}" segments work as stdlib wildcards (r.PathValue("id")).
func (g *Group) pattern(path string) string {
	p := g.prefix + "/" + strings.TrimLeft(path, "/")
	if strings.HasSuffix(p, "/") {
		p += "{$}"
	}
	return p
}
