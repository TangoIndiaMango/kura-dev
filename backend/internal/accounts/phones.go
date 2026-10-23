package accounts

import (
	"strings"

	"github.com/nyaruka/phonenumbers"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
)

// NormalizeNGPhone mirrors accounts.helpers.phones.normalize_ng_phone:
// parse with Nigeria as the default region, require a valid number, return E.164.
func NormalizeNGPhone(raw string) (string, error) {
	text := strings.TrimSpace(raw)
	if text == "" {
		return "", apperr.New("VALIDATION_ERROR", "Phone number is required.").
			WithDetails(apperr.Details{"phone": []string{"required"}})
	}
	num, err := phonenumbers.Parse(text, "NG")
	if err != nil {
		return "", apperr.New("VALIDATION_ERROR", "Enter a valid Nigerian phone number.").
			WithDetails(apperr.Details{"phone": []string{err.Error()}})
	}
	if !phonenumbers.IsValidNumber(num) {
		return "", apperr.New("VALIDATION_ERROR", "Enter a valid Nigerian phone number.").
			WithDetails(apperr.Details{"phone": []string{"invalid"}})
	}
	return phonenumbers.Format(num, phonenumbers.E164), nil
}
