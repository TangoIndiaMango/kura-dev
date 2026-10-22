package accounts

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/auth"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/risk"
)

func inviteInvalid(msg string) *apperr.Error {
	return apperr.New("AUTH_INVALID", msg).WithStatus(http.StatusUnauthorized)
}

func (s *AuthService) hashSetupToken(raw string) string {
	m := hmac.New(sha256.New, s.cfg.Pepper())
	m.Write([]byte(raw))
	return hex.EncodeToString(m.Sum(nil))
}

// PeekSetupToken is peek_setup_token (create-password page context).
func (s *AuthService) PeekSetupToken(ctx context.Context, raw string) (map[string]any, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, inviteInvalid("Invite token is required.")
	}
	t, err := s.q.SetupTokenByHash(ctx, s.hashSetupToken(raw))
	if database.IsNoRows(err) || (err == nil && t.ConsumedAt != nil) {
		return nil, inviteInvalid("Invalid or expired invite link.")
	}
	if err != nil {
		return nil, err
	}
	if t.ExpiresAt.Before(s.now()) {
		return nil, inviteInvalid("This invite link has expired.")
	}
	if !t.IsActive {
		return nil, inviteInvalid("This account is inactive.")
	}
	return map[string]any{"email": t.Email, "first_name": t.FirstName,
		"expires_at": jsontime.FormatISO(t.ExpiresAt), "purpose": t.Purpose}, nil
}

// ConsumeSetupToken is consume_password_setup; returns the user id.
func (s *AuthService) ConsumeSetupToken(ctx context.Context, raw, password, confirm string) (uuid.UUID, error) {
	if password != confirm {
		return uuid.Nil, apperr.New("VALIDATION_ERROR", "Passwords do not match.").
			WithDetails(apperr.Details{"password_confirmation": []string{"Must match password."}})
	}
	if err := ValidatePasswordStrength(password); err != nil {
		return uuid.Nil, err
	}
	hash, err := auth.MakePassword(password)
	if err != nil {
		return uuid.Nil, err
	}
	var userID uuid.UUID
	err = database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		t, err := q.SetupTokenByHashForUpdate(ctx, s.hashSetupToken(raw))
		switch {
		case database.IsNoRows(err):
			return inviteInvalid("Invalid or expired invite link.")
		case err != nil:
			return err
		case t.ConsumedAt != nil:
			return inviteInvalid("This invite link was already used.")
		case t.ExpiresAt.Before(s.now()):
			return inviteInvalid("This invite link has expired.")
		case !t.IsActive:
			return inviteInvalid("This account is inactive.")
		}
		userID = t.UserID
		if err := q.SetUserPassword(ctx, db.SetUserPasswordParams{ID: t.UserID, Password: hash}); err != nil {
			return err
		}
		return q.ConsumeSetupTokens(ctx, db.ConsumeSetupTokensParams{UserID: t.UserID, Purpose: t.Purpose})
	})
	return userID, err
}

// SetConsent grants (idempotent per policy version) or withdraws a purpose.
func (s *AuthService) SetConsent(ctx context.Context, actor db.AccountsUser, acct db.AccountsAccount,
	purpose string, granted bool, channel string) error {
	return database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		now, policy := s.now(), s.cfg.ConsentPolicyVersion
		if granted {
			return grantConsent(ctx, q, actorOf(actor), acct.ID, acct.KuraID, purpose, channel, policy, now)
		}
		if purpose == "SERVICE" {
			return apperr.New("CONSENT_NOT_WITHDRAWABLE",
				"Service consent can only end by closing your account.").
				WithDetails(apperr.Details{"purpose": []string{"not_withdrawable"}})
		}
		row, err := q.ActiveConsentForUpdate(ctx, db.ActiveConsentForUpdateParams{AccountID: acct.ID, Purpose: purpose})
		if database.IsNoRows(err) {
			return nil
		}
		if err != nil {
			return err
		}
		if err := q.WithdrawConsent(ctx, db.WithdrawConsentParams{ID: row.ID, WithdrawnAt: &now}); err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "consent.withdrawn", SubjectType: "account",
			SubjectID: acct.ID.String(), SubjectLabel: acct.KuraID, Actor: actorOf(actor),
			Before: consentPayload(row.GrantedAt, row.WithdrawnAt, row.Channel, row.PolicyVersion),
			After:  withPurpose(purpose, consentPayload(row.GrantedAt, &now, row.Channel, row.PolicyVersion))})
	})
}

// consentPayload is _row_payload for an existing row (audit before/after).
func consentPayload(granted time.Time, withdrawn *time.Time, channel, version string) events.Map {
	var w any
	if withdrawn != nil {
		w = jsontime.FormatISO(*withdrawn)
	}
	return events.Map{"granted": withdrawn == nil, "granted_at": jsontime.FormatISO(granted),
		"withdrawn_at": w, "channel": channel, "policy_version": version}
}

func withPurpose(purpose string, m events.Map) events.Map {
	out := events.Map{"purpose": purpose}
	for k, v := range m {
		out[k] = v
	}
	return out
}

var deviceRE = regexp.MustCompile(`(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)

// Heartbeat is DeviceTrustService.heartbeat; a first sighting emits NEW_DEVICE.
func (s *AuthService) Heartbeat(ctx context.Context, acct db.AccountsAccount, deviceID, userAgent, label string) (db.AccountsTrusteddevice, error) {
	raw := strings.TrimSpace(deviceID)
	if !deviceRE.MatchString(raw) {
		return db.AccountsTrusteddevice{}, apperr.New("VALIDATION_ERROR", "device_id must be a UUID.").
			WithDetails(apperr.Details{"device_id": []string{"invalid"}})
	}
	sum := sha256.Sum256([]byte(raw))
	key := hex.EncodeToString(sum[:])
	ua := truncate(userAgent, 255)
	var out db.AccountsTrusteddevice
	err := database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		row, err := q.TrustedDeviceForUpdate(ctx, db.TrustedDeviceForUpdateParams{AccountID: acct.ID, DeviceKey: key})
		if err == nil {
			if row.Status == "REVOKED" {
				return apperr.New("DEVICE_REVOKED",
					"This browser was revoked. Clear site data or use another browser.").WithStatus(http.StatusForbidden)
			}
			if ua == "" {
				ua = row.UserAgent
			}
			out, err = q.TouchTrustedDevice(ctx, db.TouchTrustedDeviceParams{ID: row.ID, UserAgent: ua})
			return err
		}
		if !database.IsNoRows(err) {
			return err
		}
		if out, err = q.InsertTrustedDevice(ctx, db.InsertTrustedDeviceParams{ID: ids.New(),
			DeviceKey: key, Label: truncate(label, 80), UserAgent: ua, AccountID: acct.ID}); err != nil {
			return err
		}
		if err := events.Emit(ctx, q, events.Event{Action: "device.registered",
			SubjectType: "trusted_device", SubjectID: out.ID.String(),
			After: events.Map{"account_id": acct.ID.String()}}); err != nil {
			return err
		}
		// Django ignores a failed risk emit; a savepoint keeps that failure from
		// aborting the device registration.
		sp, err := tx.Begin(ctx)
		if err != nil {
			return err
		}
		if _, err := risk.Emit(ctx, db.New(sp), risk.Event{RuleCode: "NEW_DEVICE",
			SubjectType: "trusted_device", SubjectID: out.ID.String(), AccountID: &acct.ID,
			Context: map[string]any{"source": "pwa_heartbeat"}, ActionTaken: "STEP_UP"}); err != nil {
			return sp.Rollback(ctx)
		}
		return sp.Commit(ctx)
	})
	return out, err
}

func truncate(s string, n int) string {
	r := []rune(s)
	if len(r) > n {
		return string(r[:n])
	}
	return s
}
