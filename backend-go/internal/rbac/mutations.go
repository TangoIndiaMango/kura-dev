package rbac

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
)

type createReq struct {
	Code          string      `json:"code" validate:"required,max=50"`
	Name          string      `json:"name" validate:"required,max=150"`
	Description   string      `json:"description"`
	PermissionIDs []uuid.UUID `json:"permission_ids"`
}

type patchReq struct {
	Name          *string      `json:"name" validate:"omitempty,max=150"`
	Description   *string      `json:"description"`
	IsActive      *bool        `json:"is_active"`
	PermissionIDs *[]uuid.UUID `json:"permission_ids"`
}

func (h *Handler) createRole(w http.ResponseWriter, r *http.Request) {
	var b createReq
	if err := decode.JSON(r, &b); err != nil {
		fail(w, r, err)
		return
	}
	// DRF's UniqueValidator runs first on the exact (case-sensitive) code.
	if taken, err := h.svc.q.RoleCodeExists(r.Context(), b.Code); err != nil {
		fail(w, r, err)
		return
	} else if taken {
		fail(w, r, apperr.Field("code", "role with this code already exists."))
		return
	}
	who, err := actor.FromRequest(r.Context(), h.svc.q)
	if err != nil {
		fail(w, r, err)
		return
	}
	out, err := h.svc.Create(r.Context(), who, b.Code, b.Name, b.Description, b.PermissionIDs)
	if err != nil {
		fail(w, r, err)
		return
	}
	respond.Created(w, out)
}

func (h *Handler) patchRole(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r, "Role")
	if err != nil {
		fail(w, r, err)
		return
	}
	if _, err := h.svc.Detail(r.Context(), h.svc.q, id); err != nil {
		fail(w, r, err) // 404 before body validation, like get_object
		return
	}
	var b patchReq
	if err := decode.JSON(r, &b); err != nil {
		fail(w, r, err)
		return
	}
	if b.Name != nil && *b.Name == "" {
		fail(w, r, apperr.Field("name", "This field may not be blank."))
		return
	}
	who, err := actor.FromRequest(r.Context(), h.svc.q)
	if err != nil {
		fail(w, r, err)
		return
	}
	out, err := h.svc.Update(r.Context(), who, id, Patch{Name: b.Name, Description: b.Description,
		IsActive: b.IsActive, PermissionIDs: b.PermissionIDs})
	if err != nil {
		fail(w, r, err)
		return
	}
	respond.OK(w, out)
}

func (h *Handler) setActive(active bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := pathID(r, "Role")
		if err != nil {
			fail(w, r, err)
			return
		}
		who, err := actor.FromRequest(r.Context(), h.svc.q)
		if err != nil {
			fail(w, r, err)
			return
		}
		out, err := h.svc.SetActive(r.Context(), who, id, active)
		if err != nil {
			fail(w, r, err)
			return
		}
		respond.OK(w, out)
	}
}
