package accounts

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
)

// identitySubmitReq is IdentitySubmitSerializer.
type identitySubmitReq struct {
	DisplayName        string    `json:"display_name" validate:"required,max=200"`
	IDType             *string   `json:"id_type" validate:"required,oneof=NIN BVN VOTER DRIVERS_LICENCE PASSPORT"`
	IDNumber           string    `json:"id_number" validate:"max=80"`
	Face               uuid.UUID `json:"face_asset_id" validate:"required"`
	Front              uuid.UUID `json:"id_front_asset_id" validate:"required"`
	Back               uuid.UUID `json:"id_back_asset_id" validate:"required"`
	ConsentService     bool      `json:"consent_service"`
	ConsentDataSharing bool      `json:"consent_data_sharing"`
	Channel            *string   `json:"channel" validate:"omitempty,oneof=WEB APP USSD HUB"`
}

func (b identitySubmitReq) input() SubmitInput {
	ch := "WEB"
	if b.Channel != nil {
		ch = *b.Channel
	}
	return SubmitInput{DisplayName: b.DisplayName, IDType: *b.IDType, IDNumber: b.IDNumber, Channel: ch,
		Face: b.Face, Front: b.Front, Back: b.Back, ConsentService: b.ConsentService,
		ConsentDataSharing: b.ConsentDataSharing}
}

// IdentityAdjustPhotosSerializer.
type adjustPhotosReq struct {
	Front uuid.UUID  `json:"id_front_asset_id" validate:"required"`
	Back  uuid.UUID  `json:"id_back_asset_id" validate:"required"`
	Face  *uuid.UUID `json:"face_asset_id"`
}

// IdentityVerifySerializer / IdentityRejectSerializer / IdentityRequestPhotosSerializer.
type verifyReq struct {
	Via  *string `json:"via" validate:"omitempty,oneof=PSP PROVIDER MANUAL"`
	Note string  `json:"note"`
}

type reasonReq struct {
	Reason string `json:"reason" validate:"required,max=255"`
}

type noteReq struct {
	Note string `json:"note" validate:"required,max=255"`
}

// caller loads the signed-in user's row.
func (h *AccountHandler) caller(r *http.Request) (db.AccountsUser, error) {
	uid, _ := uuid.Parse(reqctx.User(r.Context()).UserID)
	return h.q.UserRow(r.Context(), uid)
}

// identity is POST /accounts/identity/: the rider submits their ID pack.
func (h *AccountHandler) identity(w http.ResponseWriter, r *http.Request) {
	var b identitySubmitReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	user, err := h.caller(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	k, err := h.ids.Submit(r.Context(), user, b.input(), nil, nil)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.Created(w, k)
}

func (h *AccountHandler) identityWithdraw(w http.ResponseWriter, r *http.Request) {
	user, err := h.caller(r)
	if err == nil {
		var k KYC
		if k, err = h.ids.Withdraw(r.Context(), user); err == nil {
			respond.OK(w, k)
			return
		}
	}
	respond.Error(w, r, err)
}

func (h *AccountHandler) identityPhotos(w http.ResponseWriter, r *http.Request) {
	var b adjustPhotosReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	user, err := h.caller(r)
	if err == nil {
		var k KYC
		if k, err = h.ids.AdjustPhotos(r.Context(), user, b.Front, b.Back, b.Face); err == nil {
			respond.OK(w, k)
			return
		}
	}
	respond.Error(w, r, err)
}

// submitKYC is POST /accounts/{id}/kyc/submit/: staff submit for the owner,
// with photos they uploaded and consent they captured.
func (h *AccountHandler) submitKYC(w http.ResponseWriter, r *http.Request) {
	row, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	var b identitySubmitReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	staff, err := h.caller(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	owner, err := h.q.UserRow(r.Context(), row.OwnerUserID)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	k, err := h.ids.Submit(r.Context(), owner, b.input(), &row.ID, &staff)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.Created(w, k)
}

// reviewAction wires the staff review endpoints: object scope, body, then
// the review itself.
func reviewAction[T any](h *AccountHandler, run func(r *http.Request, staff db.AccountsUser, id uuid.UUID, b T) (KYC, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		row, err := h.object(r)
		if err != nil {
			respond.Error(w, r, err)
			return
		}
		var b T
		if err := decode.JSON(r, &b); err != nil {
			respond.Error(w, r, err)
			return
		}
		staff, err := h.caller(r)
		if err != nil {
			respond.Error(w, r, err)
			return
		}
		k, err := run(r, staff, row.ID, b)
		if err != nil {
			respond.Error(w, r, err)
			return
		}
		respond.OK(w, k)
	}
}

func (h *AccountHandler) verifyKYC() http.HandlerFunc {
	return reviewAction(h, func(r *http.Request, staff db.AccountsUser, id uuid.UUID, b verifyReq) (KYC, error) {
		via := "MANUAL"
		if b.Via != nil {
			via = *b.Via
		}
		return h.ids.Verify(r.Context(), staff, id, via, b.Note)
	})
}

func (h *AccountHandler) rejectKYC() http.HandlerFunc {
	return reviewAction(h, func(r *http.Request, staff db.AccountsUser, id uuid.UUID, b reasonReq) (KYC, error) {
		return h.ids.Reject(r.Context(), staff, id, b.Reason)
	})
}

func (h *AccountHandler) requestKYCPhotos() http.HandlerFunc {
	return reviewAction(h, func(r *http.Request, staff db.AccountsUser, id uuid.UUID, b noteReq) (KYC, error) {
		return h.ids.RequestPhotos(r.Context(), staff, id, b.Note)
	})
}
