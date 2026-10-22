package accounts

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/logging"
)

// hashOTP is hash_otp: HMAC-SHA256(pepper, code) hex.
func (s *AuthService) hashOTP(code string) string {
	m := hmac.New(sha256.New, s.cfg.Pepper())
	m.Write([]byte(code))
	return hex.EncodeToString(m.Sum(nil))
}

// RequestOTP mirrors request_otp: PIN holders are routed to PIN (unless
// force), a 60 s resend cooldown applies, and the code is never returned.
// Delivery (SMS) is not wired yet — same as Django today.
func (s *AuthService) RequestOTP(ctx context.Context, phone, purpose, channel, deviceID string, force bool) (map[string]any, error) {
	e164, err := NormalizeNGPhone(phone)
	if err != nil {
		return nil, err
	}
	if purpose == "LOGIN" && !force {
		routed, err := s.BeginLogin(ctx, e164, channel)
		if err != nil || routed["next"] == "pin" {
			return routed, err
		}
	}
	recent, err := s.q.LatestOpenOTP(ctx, db.LatestOpenOTPParams{Phone: e164, Purpose: purpose})
	if err == nil && recent.CreatedAt.After(s.now().Add(-otpCooldown)) {
		return nil, apperr.New("OTP_TOO_MANY", "Please wait before requesting another code.").
			WithStatus(http.StatusTooManyRequests).
			WithDetails(apperr.Details{"retry_after_seconds": 60})
	}
	if err != nil && !database.IsNoRows(err) {
		return nil, err
	}
	n, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		return nil, err
	}
	code := fmt.Sprintf("%06d", n.Int64())
	if s.cfg.Debug {
		logging.From(ctx).Info("otp_issued", "phone", e164[len(e164)-4:], "purpose", purpose,
			"channel", channel, "code", code)
	}
	if err := s.q.InsertOTP(ctx, db.InsertOTPParams{ID: ids.New(), Phone: e164, Purpose: purpose,
		CodeHash: s.hashOTP(code), ExpiresAt: s.now().Add(otpTTL), DeviceID: deviceID,
		Channel: channel}); err != nil {
		return nil, err
	}
	return map[string]any{"status": "accepted", "next": "otp",
		"message": "If this number can receive SMS, a code is on its way.", "phone": e164,
		"purpose": purpose, "channel": channel, "has_pin": false}, nil
}

// OTPResult is verify_otp's payload.
type OTPResult struct {
	LoginResult
	IsNewUser bool
	Channel   string
}

// VerifyOTP checks the latest open challenge, creating the operator on first
// sign-in. DEBUG accepts OTP_DEV_CODE, like Django.
func (s *AuthService) VerifyOTP(ctx context.Context, phone, code, purpose, channel string) (OTPResult, error) {
	e164, err := NormalizeNGPhone(phone)
	if err != nil {
		return OTPResult{}, err
	}
	code = strings.TrimSpace(code)
	var out OTPResult
	var bad error
	err = database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		ch, err := q.LatestOpenOTPForUpdate(ctx, db.LatestOpenOTPForUpdateParams{Phone: e164, Purpose: purpose})
		if database.IsNoRows(err) {
			bad = apperr.New("OTP_INVALID", "The verification code is invalid or expired.")
			return nil
		}
		if err != nil {
			return err
		}
		if !ch.ExpiresAt.After(s.now()) {
			bad = apperr.New("OTP_EXPIRED", "This verification code has expired. Request a new one.")
			return nil
		}
		if ch.Attempts >= otpMaxAttempts {
			bad = apperr.New("OTP_TOO_MANY", "Too many incorrect attempts. Request a new code.").
				WithStatus(http.StatusTooManyRequests)
			return q.ConsumeOTP(ctx, ch.ID)
		}
		valid := hmac.Equal([]byte(ch.CodeHash), []byte(s.hashOTP(code))) ||
			(s.cfg.Debug && code == s.cfg.OTPDevCode)
		if !valid {
			attempts, err := q.BumpOTPAttempts(ctx, ch.ID)
			if err != nil {
				return err
			}
			bad = apperr.New("OTP_INVALID", "The verification code entered is incorrect.").
				WithDetails(apperr.Details{"attempts_remaining": max(otpMaxAttempts-int(attempts), 0)})
			return nil
		}
		if err := q.ConsumeOTP(ctx, ch.ID); err != nil {
			return err
		}
		user, err := q.GetUserByPhone(ctx, &e164)
		if database.IsNoRows(err) {
			out.IsNewUser = true
			if user, err = s.provisionOperator(ctx, q, e164, channel); err != nil {
				return err
			}
		} else if err != nil {
			return err
		} else if !user.IsActive {
			bad = apperr.New("AUTH_DISABLED", "This account is disabled.").WithStatus(http.StatusForbidden)
			return nil
		}
		out.User, out.Channel = user, channel
		out.Pair, err = s.issueTokens(ctx, q, user.ID, int(user.SessionVersion))
		return err
	})
	if err == nil {
		err = bad // attempt counters commit; the caller still sees the error
	}
	return out, err
}

// provisionOperator creates user + individual account + driver profile.
func (s *AuthService) provisionOperator(ctx context.Context, q *db.Queries, e164, channel string) (db.AccountsUser, error) {
	userID := ids.New()
	publicID, err := uniquePublicID(ctx, q, "OP")
	if err != nil {
		return db.AccountsUser{}, err
	}
	if err := q.InsertOperatorUser(ctx, db.InsertOperatorUserParams{ID: userID, Phone: &e164,
		PublicID: &publicID}); err != nil {
		return db.AccountsUser{}, err
	}
	if !oneOf(channel, "WEB", "APP", "USSD", "HUB") {
		channel = "WEB"
	}
	accountID, err := q.InsertIndividualAccount(ctx, db.InsertIndividualAccountParams{
		ID: ids.New(), KuraID: kuraID("KR", 6), DisplayName: "Rider " + e164[len(e164)-4:],
		OwnerUserID: userID, RegistrationChannel: channel})
	if err != nil {
		return db.AccountsUser{}, err
	}
	if err := q.InsertDriver(ctx, db.InsertDriverParams{ID: ids.New(), AccountID: accountID,
		UserID: userID}); err != nil {
		return db.AccountsUser{}, err
	}
	return q.GetUserByPhone(ctx, &e164)
}

// CompleteOnboarding marks onboarding done once the rider has an account.
func (s *AuthService) CompleteOnboarding(ctx context.Context, userID uuid.UUID) error {
	return database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		u, err := q.GetUserByIDForUpdate(ctx, userID)
		if err != nil {
			return err
		}
		acct, err := q.FirstAccountForOwner(ctx, userID)
		if database.IsNoRows(err) {
			return apperr.Conflict("ACCOUNT_REQUIRED", "Complete your profile before finishing onboarding.")
		}
		if err != nil {
			return err
		}
		if err := q.SetOnboardingStep(ctx, db.SetOnboardingStepParams{ID: userID, OnboardingStep: "home"}); err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "account.onboarding_completed",
			SubjectType: "account", SubjectID: acct.ID.String(),
			SubjectLabel: firstNonEmpty(acct.KuraID, acct.DisplayName), Actor: actorOf(u),
			Before: events.Map{"onboarding_step": u.OnboardingStep},
			After:  events.Map{"onboarding_step": "home"}})
	})
}
