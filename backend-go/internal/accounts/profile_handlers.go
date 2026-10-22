package accounts

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

type consentReq struct {
	Purpose string `json:"purpose" validate:"required,oneof=SERVICE DATA_SHARING"`
	Granted *bool  `json:"granted" validate:"required"`
	Channel string `json:"channel" validate:"omitempty,oneof=WEB APP USSD HUB"`
}

type passwordChangeReq struct {
	Current string `json:"current_password" validate:"required"`
	New     string `json:"new_password" validate:"required"`
	Confirm string `json:"new_password_confirmation" validate:"required"`
}

type setupContextReq struct {
	Token string `json:"token" validate:"required"`
}

type setupReq struct {
	Token    string `json:"token" validate:"required"`
	Password string `json:"password" validate:"required"`
	Confirm  string `json:"password_confirmation" validate:"required"`
}

type heartbeatReq struct {
	DeviceID string `json:"device_id"`
	Label    string `json:"label"`
}

// accountForUser is account_for_user: driver's account, else first owned.
func accountForUser(ctx context.Context, q *db.Queries, userID uuid.UUID) (db.AccountsAccount, error) {
	if d, err := q.DriverForUser(ctx, userID); err == nil {
		return q.AccountByID(ctx, d.AccountID)
	} else if !database.IsNoRows(err) {
		return db.AccountsAccount{}, err
	}
	a, err := q.FirstOwnedAccount(ctx, userID)
	if database.IsNoRows(err) {
		return a, apperr.New("ACCOUNT_REQUIRED", "Complete profile before continuing.")
	}
	return a, err
}

func (h *AuthHandler) updateProfile(w http.ResponseWriter, r *http.Request, b ProfilePatch) error {
	if err := h.svc.UpdateProfile(r.Context(), currentUserID(r), b); err != nil {
		return err
	}
	h.getMe(w, r)
	return nil
}

func (h *AuthHandler) updateConsent(w http.ResponseWriter, r *http.Request, b consentReq) error {
	uid := currentUserID(r)
	acct, err := accountForUser(r.Context(), h.q, uid)
	if err != nil {
		return err
	}
	user, err := h.q.GetUserByIDForUpdate(r.Context(), uid)
	if err != nil {
		return err
	}
	if err := h.svc.SetConsent(r.Context(), user, acct, b.Purpose, *b.Granted, defStr(b.Channel, "WEB")); err != nil {
		return err
	}
	state, err := consentState(r.Context(), h.q, acct.ID, acct.KycStatus, h.svc.cfg.ConsentPolicyVersion)
	if err != nil {
		return err
	}
	respond.OK(w, state)
	return nil
}

func (h *AuthHandler) changePassword(w http.ResponseWriter, r *http.Request, b passwordChangeReq) error {
	if err := h.svc.ChangePassword(r.Context(), currentUserID(r), b.Current, b.New, b.Confirm); err != nil {
		return err
	}
	respond.OK(w, map[string]string{"status": "ok"})
	return nil
}

func (h *AuthHandler) setupContext(w http.ResponseWriter, r *http.Request, b setupContextReq) error {
	out, err := h.svc.PeekSetupToken(r.Context(), b.Token)
	if err != nil {
		return err
	}
	respond.OK(w, out)
	return nil
}

// passwordSetup consumes the invite, audits user.password_set, then signs in.
func (h *AuthHandler) passwordSetup(w http.ResponseWriter, r *http.Request, b setupReq) error {
	ctx := r.Context()
	uid, err := h.svc.ConsumeSetupToken(ctx, b.Token, b.Password, b.Confirm)
	if err != nil {
		return err
	}
	user, err := h.q.GetUserByIDForUpdate(ctx, uid)
	if err != nil {
		return err
	}
	err = database.InTx(ctx, h.svc.pool, func(tx pgx.Tx) error {
		return events.Emit(ctx, db.New(tx), events.Event{Action: "user.password_set",
			SubjectType: "user", SubjectID: uid.String(),
			SubjectLabel: firstNonEmpty(str(user.PublicID), str(user.Email)), Actor: actorOf(user)})
	})
	if err != nil {
		return err
	}
	res, err := h.svc.StaffLogin(ctx, str(user.Email), b.Password)
	if err != nil {
		return err
	}
	dto, err := loadUserDTO(ctx, h.q, uid)
	if err != nil {
		return err
	}
	respond.OK(w, map[string]any{"access": res.Pair.Access, "refresh": res.Pair.Refresh, "user": dto})
	return nil
}

func (h *AuthHandler) devicesHeartbeat(w http.ResponseWriter, r *http.Request, b heartbeatReq) error {
	deviceID := strings.TrimSpace(firstNonEmpty(b.DeviceID, r.Header.Get("X-Kura-Device-Id")))
	acct, err := accountForUser(r.Context(), h.q, currentUserID(r))
	if err != nil {
		return err
	}
	row, err := h.svc.Heartbeat(r.Context(), acct, deviceID, r.UserAgent(), b.Label)
	if err != nil {
		return err
	}
	now := time.Now()
	days := int(dateOnly(now).Sub(dateOnly(row.FirstSeenAt)).Hours() / 24)
	respond.OK(w, map[string]any{"id": row.ID.String(), "status": row.Status,
		"trusted_days": max(days, 0), "first_seen_at": jsontime.FormatISO(row.FirstSeenAt),
		"last_seen_at": jsontime.FormatISO(row.LastSeenAt)})
	return nil
}

// dateOnly is the UTC calendar date (Django timezone.now().date()).
func dateOnly(t time.Time) time.Time {
	y, m, d := t.UTC().Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}
