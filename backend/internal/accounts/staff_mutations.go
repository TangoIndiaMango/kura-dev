package accounts

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
)

type inviteReq struct {
	Email         string      `json:"email" validate:"required,email"`
	Role          string      `json:"role" validate:"required,max=50"`
	FirstName     string      `json:"first_name" validate:"max=150"`
	LastName      string      `json:"last_name" validate:"max=150"`
	Phone         string      `json:"phone" validate:"max=30"`
	Password      string      `json:"password"`
	CooperativeID *uuid.UUID  `json:"cooperative_id"`
	HubIDs        []uuid.UUID `json:"hub_ids"`
}

func (h *StaffHandler) get(w http.ResponseWriter, r *http.Request) {
	id, err := h.staffID(r)
	if err == nil {
		var u UserDTO
		if u, err = loadUserDTO(r.Context(), h.svc.q, id); err == nil {
			respond.OK(w, u)
			return
		}
	}
	respond.Error(w, r, err)
}

func (h *StaffHandler) create(w http.ResponseWriter, r *http.Request) {
	var b inviteReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	who, err := actor.FromRequest(r.Context(), h.svc.q)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	id, meta, err := h.svc.Invite(r.Context(), who, InviteInput{Email: b.Email, Role: b.Role,
		FirstName: b.FirstName, LastName: b.LastName, Phone: b.Phone, CooperativeID: b.CooperativeID,
		HubIDs: b.HubIDs, BaseURL: frontendURL(r)})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	u, err := loadUserDTO(r.Context(), h.svc.q, id)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	// UserSerializer data merged with the invite meta, like the Django view.
	body := map[string]any{}
	raw, _ := jsonRoundTrip(u)
	for k, v := range raw {
		body[k] = v
	}
	for k, v := range meta {
		body[k] = v
	}
	respond.Created(w, body)
}

func (h *StaffHandler) patch(w http.ResponseWriter, r *http.Request) {
	id, err := h.staffID(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	var b StaffPatch
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	who, err := actor.FromRequest(r.Context(), h.svc.q)
	if err == nil {
		err = h.svc.Update(r.Context(), who, id, b)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.get(w, r)
}

func (h *StaffHandler) setActive(active bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := h.staffID(r)
		if err != nil {
			respond.Error(w, r, err)
			return
		}
		who, err := actor.FromRequest(r.Context(), h.svc.q)
		if err == nil {
			err = h.svc.SetActive(r.Context(), who, id, active)
		}
		if err != nil {
			respond.Error(w, r, err)
			return
		}
		h.get(w, r)
	}
}

func (h *StaffHandler) resendInvite(w http.ResponseWriter, r *http.Request) {
	id, err := h.staffID(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	who, err := actor.FromRequest(r.Context(), h.svc.q)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	meta, err := h.svc.ResendInvite(r.Context(), who, id, frontendURL(r))
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, meta)
}
