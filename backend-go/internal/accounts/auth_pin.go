package accounts

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/auth"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
)

func pinIncorrect() *apperr.Error {
	return apperr.New("PIN_INVALID", "The security PIN entered is incorrect.").WithStatus(http.StatusUnauthorized)
}

// PinGrant is the short-lived wallet-debit confirmation.
type PinGrant struct {
	Token     string
	ExpiresAt time.Time
}

// VerifyPin checks the PIN with lockout (3 misses → 30 s) and returns a pin
// grant (AuthService.verify_pin).
func (s *AuthService) VerifyPin(ctx context.Context, user db.AccountsUser, pin, accessJTI string) (PinGrant, error) {
	if user.PinLockedUntil != nil && user.PinLockedUntil.After(s.now()) {
		return PinGrant{}, apperr.New("PIN_LOCKED", "PIN temporarily locked. Try again shortly.").
			WithStatus(http.StatusTooManyRequests)
	}
	if user.PinHash == "" {
		return PinGrant{}, apperr.New("PIN_INVALID", "Security PIN has not been set yet.")
	}
	if !auth.CheckPassword(pin, user.PinHash) {
		attempts := user.PinFailedAttempts + 1
		var lockedUntil *time.Time
		if attempts >= pinLockAfter {
			t := s.now().Add(pinLockFor)
			lockedUntil, attempts = &t, 0
		}
		if err := s.q.SetPinFailure(ctx, db.SetPinFailureParams{
			ID: user.ID, PinFailedAttempts: attempts, PinLockedUntil: lockedUntil}); err != nil {
			return PinGrant{}, err
		}
		return PinGrant{}, pinIncorrect()
	}
	if err := s.q.ClearPinFailures(ctx, user.ID); err != nil {
		return PinGrant{}, err
	}
	tok, exp, err := s.tokens.IssuePinGrant(user.ID.String(), accessJTI)
	return PinGrant{Token: tok, ExpiresAt: exp}, err
}

// PinLogin is phone + PIN → session for returning operators (no OTP).
func (s *AuthService) PinLogin(ctx context.Context, phone, pin, channel string) (LoginResult, error) {
	e164, err := NormalizeNGPhone(phone)
	if err != nil {
		return LoginResult{}, err
	}
	user, err := s.q.GetUserByPhone(ctx, &e164)
	if database.IsNoRows(err) || (err == nil && !user.IsActive) {
		return LoginResult{}, pinIncorrect()
	}
	if err != nil {
		return LoginResult{}, err
	}
	if user.PinHash == "" {
		return LoginResult{}, apperr.New("PIN_INVALID",
			"Security PIN has not been set yet. Request a login code instead.").WithStatus(http.StatusUnauthorized)
	}
	if _, err := s.VerifyPin(ctx, user, pin, ""); err != nil {
		return LoginResult{}, err
	}
	var out LoginResult
	err = database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		when, err := q.TouchLastLogin(ctx, user.ID)
		if err != nil {
			return err
		}
		name := strings.TrimSpace(user.FirstName + " " + user.LastName)
		if name == "" {
			name, _ = q.FirstAccountDisplayName(ctx, user.ID)
		}
		out.DisplayName = name
		label := firstNonEmpty(str(user.PublicID), str(user.Phone), user.ID.String())
		display := firstNonEmpty(name, label)
		if err := events.Emit(ctx, q, events.Event{
			Action: "auth.operator_login", SubjectType: "user", SubjectID: user.ID.String(),
			SubjectLabel: label, Actor: actorOf(user),
			Metadata: events.Map{"channel": channel, "phone": str(user.Phone)},
			Notify: []events.NotifySpec{{UserID: user.ID, Title: "Operator sign-in",
				Body:   display + " (" + label + ") signed in on " + channel + " at " + wat(*when) + " WAT.",
				Source: "System", Severity: events.Info, Channels: []string{events.InApp},
				LinkPath: "/account", TemplateCode: "auth.operator_login",
				Params: events.Map{"user_id": user.ID.String(), "public_id": str(user.PublicID),
					"phone": str(user.Phone), "channel": channel, "at": when.Format(time.RFC3339Nano)}}},
		}); err != nil {
			return err
		}
		out.Pair, err = s.issueTokens(ctx, q, user.ID, int(user.SessionVersion))
		return err
	})
	out.User = user
	return out, err
}

// SetPin sets or resets the PIN. A reset bumps session_version, which signs
// out every other session (AuthService.set_pin). Returns whether it was a reset.
func (s *AuthService) SetPin(ctx context.Context, userID uuid.UUID, pin string, confirm *string) (bool, auth.Pair, error) {
	pin = strings.TrimSpace(pin)
	if len(pin) != 4 || strings.Trim(pin, "0123456789") != "" {
		return false, auth.Pair{}, apperr.New("VALIDATION_ERROR", "PIN must be exactly 4 digits.").
			WithDetails(apperr.Details{"pin": []string{"invalid"}})
	}
	if confirm != nil && *confirm != pin {
		return false, auth.Pair{}, apperr.New("VALIDATION_ERROR", "PIN confirmation does not match.").
			WithDetails(apperr.Details{"pin_confirm": []string{"mismatch"}})
	}
	hash, err := auth.MakePassword(pin)
	if err != nil {
		return false, auth.Pair{}, err
	}
	var reset bool
	var pair auth.Pair
	err = database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		u, err := q.GetUserByIDForUpdate(ctx, userID)
		if err != nil {
			return err
		}
		reset = u.PinHash != ""
		step, version := u.OnboardingStep, u.SessionVersion
		if step == "pin" {
			step = "profile"
		}
		if reset {
			version++
		}
		if err := q.SetPin(ctx, db.SetPinParams{ID: u.ID, PinHash: hash,
			OnboardingStep: step, SessionVersion: version}); err != nil {
			return err
		}
		ev := events.Event{Action: "auth.pin_set", SubjectType: "user", SubjectID: u.ID.String(),
			Actor: actorOf(u), Metadata: events.Map{"onboarding_step": step}}
		if reset {
			ev.Action = "auth.pin_reset"
			ev.Notify = []events.NotifySpec{{UserID: u.ID, Title: "Security PIN changed",
				Body:   "Your KURA security PIN was changed. Other sessions were signed out.",
				Source: "Security", Severity: events.Warning, LinkPath: "/account",
				TemplateCode: "auth.pin_reset",
				DedupeKey:    "auth.pin_reset:" + u.ID.String() + ":" + itoa(int(version))}}
		}
		if err := events.Emit(ctx, q, ev); err != nil {
			return err
		}
		pair, err = s.issueTokens(ctx, q, u.ID, int(version))
		return err
	})
	return reset, pair, err
}
