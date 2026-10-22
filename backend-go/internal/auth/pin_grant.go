package auth

import (
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
)

// AssertPinGrant is accounts.services.auth.assert_pin_grant: a short-lived
// pin-scoped access token issued to user (403 missing, 401 bad / foreign).
func (t *Tokens) AssertPinGrant(token string, user uuid.UUID) error {
	raw := strings.TrimSpace(token)
	if raw == "" {
		return apperr.New("PIN_GRANT_REQUIRED", "Rider PIN confirmation is required for this wallet debit.").
			WithStatus(http.StatusForbidden)
	}
	bad := func(msg string) error {
		return apperr.New("PIN_GRANT_INVALID", msg).WithStatus(http.StatusUnauthorized)
	}
	c, err := t.Parse(raw, TypeAccess)
	if err != nil {
		return bad("PIN confirmation expired or invalid. Ask the rider to enter PIN again.")
	}
	if c.Scope != ScopePin {
		return bad("Invalid PIN confirmation.")
	}
	if c.UserID != user.String() {
		return bad("PIN confirmation does not match this rider.")
	}
	return nil
}
