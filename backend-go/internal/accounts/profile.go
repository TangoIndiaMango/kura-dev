package accounts

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"unicode"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/auth"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
)

// ProfilePatch is PATCH /auth/me/profile (nil = field not sent).
// avatar_asset_id stays raw JSON so absent, null (clear) and an id differ.
type ProfilePatch struct {
	FirstName         *string         `json:"first_name" validate:"omitempty,max=150"`
	LastName          *string         `json:"last_name" validate:"omitempty,max=150"`
	Phone             *string         `json:"phone" validate:"omitempty,max=30"`
	Email             *string         `json:"email" validate:"omitempty,email"`
	AvatarAssetID     json.RawMessage `json:"avatar_asset_id"`
	NotificationPrefs map[string]any  `json:"notification_prefs"`
}

// avatar returns (set?, id-or-nil, error) for avatar_asset_id.
func (p ProfilePatch) avatar() (bool, *uuid.UUID, error) {
	raw := strings.TrimSpace(string(p.AvatarAssetID))
	if raw == "" {
		return false, nil, nil
	}
	if raw == "null" {
		return true, nil, nil
	}
	var id uuid.UUID
	if err := json.Unmarshal(p.AvatarAssetID, &id); err != nil {
		return false, nil, apperr.Field("avatar_asset_id", "Must be a valid UUID.")
	}
	return true, &id, nil
}

// UpdateProfile mirrors update_own_profile (audit before/after snapshot).
func (s *AuthService) UpdateProfile(ctx context.Context, userID uuid.UUID, p ProfilePatch) error {
	return database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		u, err := q.GetUserByIDForUpdate(ctx, userID)
		if err != nil {
			return err
		}
		before := profileSnapshot(u)
		changed := false
		if p.FirstName != nil {
			u.FirstName, changed = strings.TrimSpace(*p.FirstName), true
		}
		if p.LastName != nil {
			u.LastName, changed = strings.TrimSpace(*p.LastName), true
		}
		if p.Phone != nil {
			u.Phone, changed = nilIfBlank(*p.Phone), true
		}
		if p.Email != nil {
			u.Email, changed = nilIfBlank(*p.Email), true
		}
		if set, id, err := p.avatar(); err != nil {
			return err
		} else if set {
			if u.AvatarID, err = ownedAsset(ctx, q, userID, id); err != nil {
				return err
			}
			changed = true
		}
		if p.NotificationPrefs != nil {
			merged := map[string]any{}
			for k, v := range NormalizePrefs(u.NotificationPrefs) {
				merged[k] = v
			}
			for k, v := range p.NotificationPrefs {
				merged[k] = v
			}
			raw, _ := json.Marshal(merged)
			u.NotificationPrefs, _ = json.Marshal(NormalizePrefs(raw))
			changed = true
		}
		if !changed {
			return nil
		}
		if err := q.UpdateUserProfile(ctx, db.UpdateUserProfileParams{ID: u.ID,
			FirstName: u.FirstName, LastName: u.LastName, Phone: u.Phone, Email: u.Email,
			AvatarID: u.AvatarID, NotificationPrefs: u.NotificationPrefs}); err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "user.profile_updated",
			SubjectType: "user", SubjectID: u.ID.String(),
			SubjectLabel: firstNonEmpty(str(u.PublicID), str(u.Email), str(u.Phone)),
			Actor:        actorOf(u), Before: before, After: profileSnapshot(u)})
	})
}

func profileSnapshot(u db.AccountsUser) events.Map {
	var avatar any
	if u.AvatarID != nil {
		avatar = u.AvatarID.String()
	}
	return events.Map{"first_name": u.FirstName, "last_name": u.LastName,
		"phone": optStr(u.Phone), "email": optStr(u.Email), "avatar_id": avatar,
		"notification_prefs": NormalizePrefs(u.NotificationPrefs)}
}

// ownedAsset is resolve_owned_asset: known asset, uploaded by this user.
func ownedAsset(ctx context.Context, q *db.Queries, userID uuid.UUID, id *uuid.UUID) (*uuid.UUID, error) {
	if id == nil {
		return nil, nil
	}
	a, err := q.MediaAssetOwner(ctx, *id)
	if database.IsNoRows(err) {
		return nil, apperr.New("VALIDATION_ERROR", "Unknown media asset.").
			WithDetails(apperr.Details{"asset_id": []string{"invalid"}})
	}
	if err != nil {
		return nil, err
	}
	if a.UploadedByID != nil && *a.UploadedByID != userID {
		return nil, apperr.New("FORBIDDEN", "You cannot attach media you did not upload.").
			WithStatus(http.StatusForbidden)
	}
	return &a.ID, nil
}

// ChangePassword mirrors change_own_password.
func (s *AuthService) ChangePassword(ctx context.Context, userID uuid.UUID, current, next, confirm string) error {
	return database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		u, err := q.GetUserByIDForUpdate(ctx, userID)
		if err != nil {
			return err
		}
		if !auth.CheckPassword(current, u.Password) {
			return apperr.New("AUTH_INVALID", "Current password is incorrect.").
				WithDetails(apperr.Details{"current_password": []string{"incorrect"}})
		}
		if next != confirm {
			return apperr.New("VALIDATION_ERROR", "Password confirmation does not match.").
				WithDetails(apperr.Details{"new_password_confirmation": []string{"Must match new password."}})
		}
		if auth.CheckPassword(next, u.Password) {
			return apperr.New("VALIDATION_ERROR", "New password must be different from the current password.").
				WithDetails(apperr.Details{"new_password": []string{"reuse"}})
		}
		if err := ValidatePasswordStrength(next); err != nil {
			return err
		}
		hash, err := auth.MakePassword(next)
		if err != nil {
			return err
		}
		if err := q.SetUserPassword(ctx, db.SetUserPasswordParams{ID: u.ID, Password: hash}); err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "user.password_changed",
			SubjectType: "user", SubjectID: u.ID.String(),
			SubjectLabel: firstNonEmpty(str(u.PublicID), str(u.Email), str(u.Phone)),
			Actor:        actorOf(u), Metadata: events.Map{"self_serve": true}})
	})
}

// ValidatePasswordStrength mirrors validate_password_strength.
func ValidatePasswordStrength(pwd string) error {
	var errs []string
	if len([]rune(pwd)) < 8 {
		errs = append(errs, "At least 8 characters.")
	}
	checks := []struct {
		ok  func(rune) bool
		msg string
	}{
		{unicode.IsUpper, "One uppercase letter."},
		{unicode.IsLower, "One lowercase letter."},
		{unicode.IsDigit, "One number."},
		{func(r rune) bool { return !unicode.IsLetter(r) && !unicode.IsDigit(r) }, "One special character."},
	}
	for _, c := range checks {
		if !strings.ContainsFunc(pwd, c.ok) {
			errs = append(errs, c.msg)
		}
	}
	if len(errs) > 0 {
		return apperr.New("VALIDATION_ERROR", "Password does not meet security rules.").
			WithDetails(apperr.Details{"password": errs})
	}
	return nil
}

func nilIfBlank(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}

func optStr(p *string) any {
	if p == nil {
		return nil
	}
	return *p
}
