package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
)

// PrincipalLoader loads the caller's live state (active flag, role,
// session_version, capabilities) — implemented by the accounts module.
type PrincipalLoader interface {
	LoadPrincipal(ctx context.Context, userID string) (*reqctx.Principal, bool, error)
}

// Authenticator attaches a Principal for a valid Bearer access token. It
// never rejects on its own: endpoints opt in with RequireUser/RequireCap.
type Authenticator struct {
	tokens *Tokens
	loader PrincipalLoader
}

func NewAuthenticator(t *Tokens, l PrincipalLoader) *Authenticator {
	return &Authenticator{tokens: t, loader: l}
}

// Middleware validates the token like SessionVersionJWTAuthentication. A
// present-but-bad token is a 401 (DRF behaviour), not an anonymous request.
func (a *Authenticator) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, ok := bearer(r)
		if !ok {
			next.ServeHTTP(w, r)
			return
		}
		claims, err := a.tokens.Parse(raw, TypeAccess)
		if err != nil || claims.Scope == ScopePin {
			respond.Error(w, r, invalidToken())
			return
		}
		p, active, err := a.loader.LoadPrincipal(r.Context(), claims.UserID)
		if err != nil {
			respond.Error(w, r, err)
			return
		}
		if p == nil || !active {
			respond.Error(w, r, apperr.Unauthorized("User not found or inactive."))
			return
		}
		sv := 0
		if claims.SessionVersion != nil {
			sv = *claims.SessionVersion
		}
		if sv != p.SessionVersion {
			respond.Error(w, r, apperr.Unauthorized("Session expired. Sign in again."))
			return
		}
		p.AccessJTI = claims.JTI
		next.ServeHTTP(w, r.WithContext(reqctx.WithPrincipal(r.Context(), p)))
	})
}

// RequireUser wraps a handler that needs any signed-in caller (DRF
// IsAuthenticated).
func RequireUser(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if reqctx.User(r.Context()) == nil {
			respond.Error(w, r, apperr.Unauthorized(""))
			return
		}
		h(w, r)
	}
}

// RequireCap wraps a handler that needs a capability (HasCapability).
func RequireCap(code string, h http.HandlerFunc) http.HandlerFunc {
	return RequireUser(func(w http.ResponseWriter, r *http.Request) {
		if !reqctx.User(r.Context()).Can(code) {
			respond.Error(w, r, apperr.Forbidden(""))
			return
		}
		h(w, r)
	})
}

func bearer(r *http.Request) (string, bool) {
	h := r.Header.Get("Authorization")
	scheme, token, ok := strings.Cut(h, " ")
	if !ok || !strings.EqualFold(scheme, "Bearer") || strings.TrimSpace(token) == "" {
		return "", false
	}
	return token, true
}

func invalidToken() *apperr.Error {
	return apperr.Unauthorized("Given token not valid for any token type").
		WithDetails(apperr.Details{"code": "token_not_valid"})
}
