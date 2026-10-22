// Package qr ports core.helpers.crypto_qr: L1 signed QR tokens (HMAC-SHA256
// over pipe-joined parts, keyed by pepper|entity secret, 32 hex chars).
package qr

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
)

// Signer holds the pepper (QR_HMAC_PEPPER, else SECRET_KEY).
type Signer struct{ Pepper string }

// Sign is sign_parts.
func (s Signer) Sign(secret string, parts ...string) string {
	m := hmac.New(sha256.New, []byte(s.Pepper+"|"+secret))
	m.Write([]byte(strings.Join(parts, "|")))
	return hex.EncodeToString(m.Sum(nil))[:32]
}

// Verify is verify_sig (case-insensitive, trimmed signature).
func (s Signer) Verify(secret, sig string, parts ...string) bool {
	return hmac.Equal([]byte(s.Sign(secret, parts...)), []byte(strings.ToLower(strings.TrimSpace(sig))))
}

// NewSecret is secrets.token_urlsafe(24).
func NewSecret() string {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

// BatteryToken is build_battery_token.
func (s Signer) BatteryToken(serial, secret string) string {
	return "kura:bat:v1." + serial + "." + s.Sign(secret, "bat", serial)
}

// ParsedBattery is parse_battery_token's result.
type ParsedBattery struct{ Serial, Sig string }

func invalid(msg string) error {
	return apperr.New("AUTH_INVALID", msg).WithStatus(http.StatusUnauthorized)
}

// ParseBattery is parse_battery_token: a signed token, or a bare serial
// (PRINTED scheme only; the caller checks the scheme).
func ParseBattery(token string) (ParsedBattery, error) {
	raw := strings.TrimSpace(token)
	if rest, ok := strings.CutPrefix(raw, "kura:bat:v1."); ok {
		serial, sig, _ := strings.Cut(rest, ".")
		if serial == "" || sig == "" {
			return ParsedBattery{}, invalid("Malformed battery QR.")
		}
		return ParsedBattery{Serial: serial, Sig: sig}, nil
	}
	return ParsedBattery{Serial: raw}, nil
}

// VerifyBattery is verify_battery_token.
func (s Signer) VerifyBattery(token, serial, secret, scheme string) error {
	p, err := ParseBattery(token)
	if err != nil {
		return err
	}
	if !strings.EqualFold(p.Serial, serial) {
		return invalid("Battery QR serial mismatch.")
	}
	switch scheme = strings.ToUpper(scheme); scheme {
	case "PRINTED":
		return nil
	case "BMS_AUTH", "NFC_SUN":
		return apperr.New("UNSUPPORTED_SCHEME", scheme+" requires OEM hardware; use SIGNED/PRINTED.").WithStatus(501)
	}
	if p.Sig == "" || !s.Verify(secret, p.Sig, "bat", serial) {
		return invalid("Battery QR signature invalid.")
	}
	return nil
}

// ReservationToken is build_reservation_token.
func (s Signer) ReservationToken(reservationID string, exp int64, secret string) string {
	return fmt.Sprintf("v1.%s.%d.%s", reservationID, exp, s.Sign(secret, "rsv", reservationID, strconv.FormatInt(exp, 10)))
}

// ParsedReservation is parse_reservation_token's result.
type ParsedReservation struct {
	ReservationID string
	Exp           int64
	Sig, Token    string
}

// ParseReservation is parse_reservation_token.
func ParseReservation(token string) (ParsedReservation, error) {
	raw := strings.TrimSpace(token)
	parts := strings.Split(raw, ".")
	if len(parts) != 4 || parts[0] != "v1" {
		return ParsedReservation{}, invalid("Malformed reservation QR.")
	}
	exp, err := strconv.ParseInt(parts[2], 10, 64)
	if err != nil { // Django's int() raises here → 500; a bad token is a 401
		return ParsedReservation{}, invalid("Malformed reservation QR.")
	}
	return ParsedReservation{ReservationID: parts[1], Exp: exp, Sig: parts[3], Token: raw}, nil
}

// VerifyReservation is verify_reservation_token.
func (s Signer) VerifyReservation(token, secret string) (ParsedReservation, error) {
	p, err := ParseReservation(token)
	if err != nil {
		return p, err
	}
	if p.Exp < time.Now().Unix() {
		return p, apperr.Conflict("RESERVATION_EXPIRED", "Reservation QR has expired.")
	}
	if !s.Verify(secret, p.Sig, "rsv", p.ReservationID, strconv.FormatInt(p.Exp, 10)) {
		return p, invalid("Reservation QR signature invalid.")
	}
	return p, nil
}

// TokenHash is token_hash.
func TokenHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
