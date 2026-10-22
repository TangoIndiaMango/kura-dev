package rbac

import (
	"net/http"
	"strconv"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/export"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

// Handler serves /permissions and /roles.
type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func fail(w http.ResponseWriter, r *http.Request, err error) { respond.Error(w, r, err) }

// pathID parses {id}. A malformed id is DRF's bare 404 ("Not found."); a
// well-formed but unknown id says "No <Model> matches the given query.".
func pathID(r *http.Request, _ string) (uuid.UUID, error) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return uuid.Nil, apperr.NotFound("Not found.")
	}
	return id, nil
}

func (h *Handler) listPermissions(w http.ResponseWriter, r *http.Request) {
	page, size := paginate.Page(r), paginate.Size(r)
	module, q := listq.Exact(r, "module"), listq.Search(r)
	total, err := h.svc.q.CountPermissions(r.Context(), db.CountPermissionsParams{Module: module, Q: q})
	if err != nil {
		fail(w, r, err)
		return
	}
	rows, err := h.svc.q.ListPermissions(r.Context(), db.ListPermissionsParams{Module: module, Q: q,
		Lim: int32(size), Off: int32(paginate.Offset(page, size))})
	if err != nil {
		fail(w, r, err)
		return
	}
	out := make([]PermissionDTO, len(rows))
	for i, p := range rows {
		out[i] = toPermission(p.ID.String(), p.Code, p.Name, p.Module, p.Description)
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		fail(w, r, err)
		return
	}
	respond.OK(w, body)
}

func (h *Handler) getPermission(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r, "Permission")
	if err == nil {
		var p db.GetPermissionRow
		if p, err = h.svc.q.GetPermission(r.Context(), id); err == nil {
			respond.OK(w, toPermission(p.ID.String(), p.Code, p.Name, p.Module, p.Description))
			return
		}
		if database.IsNoRows(err) {
			err = apperr.NotFound("No Permission matches the given query.")
		}
	}
	fail(w, r, err)
}

// roleFilters reads is_system / is_active / q.
func roleFilters(r *http.Request) (*bool, *bool, *string, error) {
	qp := decode.Params(r)
	sys, act := qp.Bool("is_system"), qp.Bool("is_active")
	return sys, act, listq.Search(r), qp.Err()
}

func (h *Handler) listRoles(w http.ResponseWriter, r *http.Request) {
	sys, act, q, err := roleFilters(r)
	if err != nil {
		fail(w, r, err)
		return
	}
	page, size := paginate.Page(r), paginate.Size(r)
	total, err := h.svc.q.CountRoles(r.Context(), db.CountRolesParams{IsSystem: sys, IsActive: act, Q: q})
	if err != nil {
		fail(w, r, err)
		return
	}
	rows, err := h.svc.q.ListRoles(r.Context(), db.ListRolesParams{IsSystem: sys, IsActive: act, Q: q,
		Lim: int32(size), Off: int32(paginate.Offset(page, size))})
	if err != nil {
		fail(w, r, err)
		return
	}
	out := make([]RoleListDTO, len(rows))
	for i, row := range rows {
		out[i] = toRoleList(row)
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		fail(w, r, err)
		return
	}
	respond.OK(w, body)
}

func (h *Handler) roleStats(w http.ResponseWriter, r *http.Request) {
	t, err := h.svc.q.RoleStatsTotals(r.Context())
	if err != nil {
		fail(w, r, err)
		return
	}
	respond.OK(w, map[string]any{"totals": map[string]int32{"all": t.AllRoles, "system": t.System,
		"custom": t.Custom, "users_assigned": t.UsersAssigned}})
}

func (h *Handler) exportRoles(w http.ResponseWriter, r *http.Request) {
	sys, act, q, err := roleFilters(r)
	if err != nil {
		fail(w, r, err)
		return
	}
	rows, err := h.svc.q.ListRoles(r.Context(), db.ListRolesParams{IsSystem: sys, IsActive: act, Q: q,
		Lim: export.RowCap + 1, Off: 0})
	if err != nil {
		fail(w, r, err)
		return
	}
	t := export.Table{Stem: "roles", Title: "Kura roles",
		Headers: []string{"id", "code", "name", "description", "users", "type", "status", "created_at"}}
	for _, row := range rows {
		kind, status := "Custom", "INACTIVE"
		if row.IsSystem {
			kind = "System"
		}
		if row.IsActive {
			status = "ACTIVE"
		}
		t.Rows = append(t.Rows, []string{row.ID.String(), row.Code, row.Name, row.Description,
			strconv.Itoa(int(row.UserCount)), kind, status, jsontime.FormatISO(row.CreatedAt)})
	}
	if err := export.Write(w, r.URL.Query().Get("export"), t); err != nil {
		fail(w, r, err)
	}
}

func (h *Handler) getRole(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r, "Role")
	if err == nil {
		var out RoleDetailDTO
		if out, err = h.svc.Detail(r.Context(), h.svc.q, id); err == nil {
			respond.OK(w, out)
			return
		}
	}
	fail(w, r, err)
}
