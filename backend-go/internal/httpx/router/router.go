// Package router registers Django-style routes on a stdlib ServeMux.
//
// Django paths end in "/" and match exactly. In ServeMux a trailing "/" means
// "this whole subtree", so every pattern registered here gets "{$}" appended
// to keep exact matching. Modules always register through Group.
package router

import (
	"net/http"
	"strings"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/auth"
)

// Group mounts routes under a common prefix (e.g. "/api/v1/hubs").
type Group struct {
	mux    *http.ServeMux
	prefix string
}

// New starts a group at prefix on mux.
func New(mux *http.ServeMux, prefix string) *Group {
	return &Group{mux: mux, prefix: strings.TrimRight(prefix, "/")}
}

// Group nests a sub-prefix.
func (g *Group) Group(sub string) *Group {
	return &Group{mux: g.mux, prefix: g.prefix + "/" + strings.Trim(sub, "/")}
}

// Public mounts a handler open to anonymous callers (DRF AllowAny).
func (g *Group) Public(method, path string, h http.HandlerFunc) {
	g.mux.HandleFunc(method+" "+g.pattern(path), h)
}

// User mounts a handler for any signed-in caller (IsAuthenticated).
func (g *Group) User(method, path string, h http.HandlerFunc) {
	g.Public(method, path, auth.RequireUser(h))
}

// Cap mounts a handler gated by a capability code (HasCapability).
func (g *Group) Cap(method, path, capability string, h http.HandlerFunc) {
	g.Public(method, path, auth.RequireCap(capability, h))
}

// pattern joins prefix + path and pins exact matching for "/"-terminated
// paths. "{id}" segments work as stdlib wildcards (r.PathValue("id")).
func (g *Group) pattern(path string) string {
	p := g.prefix + "/" + strings.TrimLeft(path, "/")
	if p == "" {
		p = "/"
	}
	if strings.HasSuffix(p, "/") {
		p += "{$}"
	}
	return p
}
