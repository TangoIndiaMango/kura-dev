package accounts

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/auth"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/config"
)

// Same constants as accounts/services/auth.py.
const (
	otpTTL         = 5 * time.Minute
	otpMaxAttempts = 5
	otpCooldown    = 60 * time.Second
	pinLockAfter   = 3
	pinLockFor     = 30 * time.Second
)

// AuthService holds the auth flows (Django AuthService).
type AuthService struct {
	pool   *pgxpool.Pool
	q      *db.Queries
	tokens *auth.Tokens
	cfg    config.Config
	now    func() time.Time
}

func NewAuthService(pool *pgxpool.Pool, tokens *auth.Tokens, cfg config.Config) *AuthService {
	return &AuthService{pool: pool, q: db.New(pool), tokens: tokens, cfg: cfg, now: time.Now}
}

// issueTokens mints a pair and records the refresh as outstanding, like
// simplejwt's blacklist-aware RefreshToken.for_user.
func (s *AuthService) issueTokens(ctx context.Context, q *db.Queries, userID uuid.UUID, sessionVersion int) (auth.Pair, error) {
	pair, err := s.tokens.Issue(userID.String(), sessionVersion)
	if err != nil {
		return auth.Pair{}, err
	}
	_, err = q.OutstandToken(ctx, db.OutstandTokenParams{
		Token: pair.Refresh, ExpiresAt: pair.RefreshExpires, UserID: &userID, Jti: pair.RefreshJTI,
	})
	return pair, err
}

// Refresh mirrors TokenRefreshView with ROTATE + BLACKLIST_AFTER_ROTATION:
// the old refresh is blacklisted and a rotated one (same claims) is issued.
func (s *AuthService) Refresh(ctx context.Context, raw string) (map[string]string, error) {
	claims, err := s.tokens.Parse(raw, auth.TypeRefresh)
	if err != nil {
		return nil, auth.InvalidRefreshToken(auth.TokenErrorDetail(err))
	}
	if listed, err := s.q.IsBlacklisted(ctx, claims.JTI); err != nil {
		return nil, err
	} else if listed {
		return nil, auth.InvalidRefreshToken("Token is blacklisted")
	}
	uid, err := uuid.Parse(claims.UserID)
	if err != nil {
		return nil, auth.InvalidRefreshToken("Token is invalid")
	}
	user, err := s.q.GetUserByID(ctx, uid)
	if err != nil || !user.IsActive {
		return nil, apperr.Unauthorized("No active account found for the given token.")
	}
	sv := 0
	if claims.SessionVersion != nil {
		sv = *claims.SessionVersion
	}
	if err := s.blacklist(ctx, s.q, raw, claims); err != nil {
		return nil, err
	}
	pair, err := s.issueTokens(ctx, s.q, uid, sv)
	if err != nil {
		return nil, err
	}
	return map[string]string{"access": pair.Access, "refresh": pair.Refresh}, nil
}

// Logout blacklists the refresh token (if valid) and audits it.
func (s *AuthService) Logout(ctx context.Context, actor *events.Actor, label, raw string) error {
	revoked := false
	if claims, err := s.tokens.Parse(raw, auth.TypeRefresh); err == nil {
		revoked = s.blacklist(ctx, s.q, raw, claims) == nil
	}
	return s.emit(ctx, events.Event{Action: "auth.logout", SubjectType: "user",
		SubjectID: actor.ID.String(), SubjectLabel: label, Actor: actor,
		Metadata: events.Map{"refresh_revoked": revoked}})
}

func (s *AuthService) blacklist(ctx context.Context, q *db.Queries, raw string, c *auth.Claims) error {
	var uid *uuid.UUID
	if id, err := uuid.Parse(c.UserID); err == nil {
		uid = &id
	}
	exp := s.now().Add(s.cfg.RefreshTTL)
	if c.ExpiresAt != nil {
		exp = c.ExpiresAt.Time
	}
	tokenID, err := q.OutstandToken(ctx, db.OutstandTokenParams{
		Token: raw, ExpiresAt: exp, UserID: uid, Jti: c.JTI})
	if err != nil {
		return err
	}
	return q.BlacklistToken(ctx, tokenID)
}

// emit runs an audit/notification event in its own transaction.
func (s *AuthService) emit(ctx context.Context, ev events.Event) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op after commit
	if err := events.Emit(ctx, db.New(tx), ev); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
