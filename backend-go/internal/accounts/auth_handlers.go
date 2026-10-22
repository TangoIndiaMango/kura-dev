package accounts

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
)

// AuthHandler is the HTTP layer for /api/v1/auth/* (Django AuthViewSet).
type AuthHandler struct {
	svc *AuthService
	q   *db.Queries
}

func NewAuthHandler(svc *AuthService) *AuthHandler { return &AuthHandler{svc: svc, q: svc.q} }

// handle decodes body into T, then runs fn; any error becomes the envelope.
func handle[T any](fn func(w http.ResponseWriter, r *http.Request, body T) error) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var body T
		if err := decode.JSON(r, &body); err != nil {
			respond.Error(w, r, err)
			return
		}
		if err := fn(w, r, body); err != nil {
			respond.Error(w, r, err)
		}
	}
}

func (h *AuthHandler) login(w http.ResponseWriter, r *http.Request, b loginReq) error {
	res, err := h.svc.StaffLogin(r.Context(), b.Identifier, b.Password)
	if err != nil {
		return err
	}
	user, err := loadUserDTO(r.Context(), h.q, res.User.ID)
	if err != nil {
		return err
	}
	respond.OK(w, map[string]any{"access": res.Pair.Access, "refresh": res.Pair.Refresh, "user": user})
	return nil
}

func (h *AuthHandler) loginBegin(w http.ResponseWriter, r *http.Request, b beginReq) error {
	out, err := h.svc.BeginLogin(r.Context(), b.Phone, defStr(b.Channel, "WEB"))
	if err != nil {
		return err
	}
	respond.Accepted(w, out)
	return nil
}

func (h *AuthHandler) otpRequest(w http.ResponseWriter, r *http.Request, b otpRequestReq) error {
	out, err := h.svc.RequestOTP(r.Context(), b.Phone, defStr(b.Purpose, "LOGIN"),
		defStr(b.Channel, "WEB"), b.DeviceID, b.ForceOTP)
	if err != nil {
		return err
	}
	respond.Accepted(w, out)
	return nil
}

func (h *AuthHandler) otpVerify(w http.ResponseWriter, r *http.Request, b otpVerifyReq) error {
	res, err := h.svc.VerifyOTP(r.Context(), b.Phone, b.Code, defStr(b.Purpose, "LOGIN"), defStr(b.Channel, "WEB"))
	if err != nil {
		return err
	}
	user, err := loadUserDTO(r.Context(), h.q, res.User.ID)
	if err != nil {
		return err
	}
	respond.OK(w, map[string]any{"access": res.Pair.Access, "refresh": res.Pair.Refresh,
		"is_new_user": res.IsNewUser, "is_new_device": b.DeviceID != "",
		"onboarding_step": res.User.OnboardingStep, "channel": res.Channel, "user": user})
	return nil
}

func (h *AuthHandler) pinLogin(w http.ResponseWriter, r *http.Request, b pinLoginReq) error {
	channel := defStr(b.Channel, "WEB")
	res, err := h.svc.PinLogin(r.Context(), b.Phone, b.Pin, channel)
	if err != nil {
		return err
	}
	user, err := loadUserDTO(r.Context(), h.q, res.User.ID)
	if err != nil {
		return err
	}
	var display any
	if res.DisplayName != "" {
		display = res.DisplayName
	}
	respond.OK(w, map[string]any{"access": res.Pair.Access, "refresh": res.Pair.Refresh,
		"is_new_user": false, "is_new_device": false, "onboarding_step": res.User.OnboardingStep,
		"channel": channel, "has_pin": true, "display_name": display, "user": user})
	return nil
}

func (h *AuthHandler) pinSet(w http.ResponseWriter, r *http.Request, b pinSetReq) error {
	reset, pair, err := h.svc.SetPin(r.Context(), currentUserID(r), b.Pin, b.PinConfirm)
	if err != nil {
		return err
	}
	respond.OK(w, map[string]any{"status": "success", "message": "PIN successfully updated.",
		"was_reset": reset, "access": pair.Access, "refresh": pair.Refresh})
	return nil
}

func (h *AuthHandler) pinVerify(w http.ResponseWriter, r *http.Request, b pinVerifyReq) error {
	p := reqctx.User(r.Context())
	user, err := h.q.GetUserByIDForUpdate(r.Context(), currentUserID(r))
	if err != nil {
		return err
	}
	grant, err := h.svc.VerifyPin(r.Context(), user, b.Pin, p.AccessJTI)
	if err != nil {
		return err
	}
	respond.OK(w, map[string]any{"status": "verified", "pin_grant": grant.Token,
		"expires_at": grant.ExpiresAt})
	return nil
}

func (h *AuthHandler) refresh(w http.ResponseWriter, r *http.Request, b refreshReq) error {
	out, err := h.svc.Refresh(r.Context(), b.Refresh)
	if err != nil {
		return err
	}
	respond.OK(w, out)
	return nil
}

func (h *AuthHandler) logout(w http.ResponseWriter, r *http.Request, b refreshReq) error {
	user, err := h.q.GetUserByIDForUpdate(r.Context(), currentUserID(r))
	if err != nil {
		return err
	}
	label := firstNonEmpty(str(user.PublicID), user.ID.String())
	if err := h.svc.Logout(r.Context(), actorOf(user), label, b.Refresh); err != nil {
		return err
	}
	respond.OK(w, map[string]string{"status": "logged_out"})
	return nil
}

func (h *AuthHandler) completeOnboarding(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.CompleteOnboarding(r.Context(), currentUserID(r)); err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, map[string]string{"status": "complete", "onboarding_step": "home"})
}

func currentUserID(r *http.Request) uuid.UUID {
	id, _ := uuid.Parse(reqctx.User(r.Context()).UserID)
	return id
}
