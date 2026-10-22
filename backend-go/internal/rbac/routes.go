package rbac

import (
	"net/http"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/router"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/throttle"
)

// Module mounts /api/v1/permissions and /api/v1/roles with the same
// capability_map as Django's PermissionViewSet / RoleViewSet.
type Module struct {
	h       *Handler
	limiter *throttle.Limiter
}

func NewModule(h *Handler, limiter *throttle.Limiter) *Module { return &Module{h: h, limiter: limiter} }

func (m *Module) Register(mux *http.ServeMux) {
	p := router.New(mux, "/api/v1/permissions", m.limiter)
	p.Cap("GET", "/", "users:read", m.h.listPermissions)
	p.Cap("GET", "/{id}/", "users:read", m.h.getPermission)

	r := router.New(mux, "/api/v1/roles", m.limiter)
	r.Cap("GET", "/", "users:read", m.h.listRoles)
	r.Cap("POST", "/", "roles:manage", m.h.createRole)
	r.Cap("GET", "/stats/", "users:read", m.h.roleStats)
	r.Cap("GET", "/export/", "users:read", m.h.exportRoles)
	r.Cap("GET", "/{id}/", "users:read", m.h.getRole)
	r.Cap("PATCH", "/{id}/", "roles:manage", m.h.patchRole)
	r.Cap("POST", "/{id}/activate/", "roles:manage", m.h.setActive(true))
	r.Cap("POST", "/{id}/deactivate/", "roles:manage", m.h.setActive(false))
}
