package auth

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Token types and scopes, identical to rest_framework_simplejwt.
const (
	TypeAccess  = "access"
	TypeRefresh = "refresh"
	ScopePin    = "pin"
	PinGrantTTL = 2 * time.Minute
)

// Claims is the simplejwt payload plus Kura's session_version / pin scope.
type Claims struct {
	TokenType      string `json:"token_type"`
	UserID         string `json:"user_id"`
	JTI            string `json:"jti"`
	SessionVersion *int   `json:"session_version,omitempty"`
	Scope          string `json:"scope,omitempty"`
	ParentJTI      string `json:"parent_jti,omitempty"`
	jwt.RegisteredClaims
}

// Pair is what login/refresh endpoints return.
type Pair struct {
	Access  string `json:"access"`
	Refresh string `json:"refresh"`
	// RefreshJTI / RefreshExpires let callers record the outstanding token.
	RefreshJTI     string    `json:"-"`
	RefreshExpires time.Time `json:"-"`
}

// Tokens signs and verifies HS256 tokens with the shared Django key.
type Tokens struct {
	key        []byte
	accessTTL  time.Duration
	refreshTTL time.Duration
	now        func() time.Time
}

func NewTokens(key []byte, accessTTL, refreshTTL time.Duration) *Tokens {
	return &Tokens{key: key, accessTTL: accessTTL, refreshTTL: refreshTTL, now: time.Now}
}

// Issue mints an access + refresh pair (simplejwt RefreshToken.for_user).
func (t *Tokens) Issue(userID string, sessionVersion int) (Pair, error) {
	now := t.now()
	sv := sessionVersion
	refreshJTI := newJTI()
	access, err := t.sign(Claims{TokenType: TypeAccess, UserID: userID, JTI: newJTI(),
		SessionVersion: &sv}, now, t.accessTTL)
	if err != nil {
		return Pair{}, err
	}
	refresh, err := t.sign(Claims{TokenType: TypeRefresh, UserID: userID, JTI: refreshJTI,
		SessionVersion: &sv}, now, t.refreshTTL)
	if err != nil {
		return Pair{}, err
	}
	return Pair{Access: access, Refresh: refresh, RefreshJTI: refreshJTI,
		RefreshExpires: now.Add(t.refreshTTL)}, nil
}

// IssuePinGrant mints the short-lived wallet-debit confirmation token.
func (t *Tokens) IssuePinGrant(userID, parentJTI string) (string, time.Time, error) {
	now := t.now()
	tok, err := t.sign(Claims{TokenType: TypeAccess, UserID: userID, JTI: newJTI(),
		Scope: ScopePin, ParentJTI: parentJTI}, now, PinGrantTTL)
	return tok, now.Add(PinGrantTTL), err
}

// Parse verifies signature + expiry and the expected token type.
func (t *Tokens) Parse(raw, wantType string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(strings.TrimSpace(raw), claims,
		func(tok *jwt.Token) (any, error) { return t.key, nil },
		jwt.WithValidMethods([]string{"HS256"}), jwt.WithExpirationRequired(),
		jwt.WithTimeFunc(t.now))
	if err != nil {
		return nil, fmt.Errorf("auth: invalid token: %w", err)
	}
	if claims.TokenType != wantType {
		return nil, errors.New("auth: wrong token type")
	}
	if claims.UserID == "" || claims.JTI == "" {
		return nil, errors.New("auth: token missing user_id or jti")
	}
	return claims, nil
}

func (t *Tokens) sign(c Claims, now time.Time, ttl time.Duration) (string, error) {
	c.IssuedAt = jwt.NewNumericDate(now)
	c.ExpiresAt = jwt.NewNumericDate(now.Add(ttl))
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, c)
	return tok.SignedString(t.key)
}

// newJTI matches simplejwt: uuid4 hex without dashes.
func newJTI() string {
	return strings.ReplaceAll(uuid.NewString(), "-", "")
}
