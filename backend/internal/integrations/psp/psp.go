// Package psp ports integrations.ports.psp + providers: one Port per payment
// provider (Paystack, Nomba). Finance code only sees these shapes.
package psp

import (
	"context"
	"fmt"
	"strings"
)

// Codes (PspCode).
const (
	Paystack = "PAYSTACK"
	Nomba    = "NOMBA"
)

// VAResult is VaProvisionResult.
type VAResult struct {
	Pending     bool
	Reference   string
	NUBAN       string
	BankName    string
	AccountName string
}

// VerifyResult is the PSP's view of one transaction.
type VerifyResult struct {
	OK         bool
	Reference  string
	AmountKobo *int64
	Currency   string
	Status     string
}

// Port is what each provider client implements.
type Port interface {
	Code() string
	ProvisionVirtualAccount(ctx context.Context, in VARequest) (VAResult, error)
	VerifyTransaction(ctx context.Context, reference string) (VerifyResult, error)
}

// VARequest carries the customer for a dedicated account.
type VARequest struct {
	AccountID   string
	DisplayName string
	Email       string
	Phone       string
	BVNOrNIN    string
}

// Error is an INTEGRATION_ERROR from a provider (DomainError with details).
// Body is the raw response body for HTTP failures; CustomerCode is kept when
// Paystack created the customer but refused the account.
type Error struct {
	Message      string
	Status       int // HTTP status from the provider; 0 for transport errors
	Body         string
	Payload      map[string]any
	CustomerCode string
}

func (e *Error) Error() string { return e.Message }

// Settings are the provider credentials (from config).
type Settings struct {
	DefaultPSP          string
	PaystackSecret      string
	PaystackBank        string
	CustomerEmailDomain string
	NombaSecret         string
	NombaAccountID      string
}

// Get is integrations.registry.get_psp.
func Get(code string, s Settings) (Port, error) {
	resolved := strings.ToUpper(code)
	if resolved == "" {
		resolved = strings.ToUpper(s.DefaultPSP)
	}
	if resolved == "" {
		resolved = Paystack
	}
	switch resolved {
	case Paystack:
		return &PaystackClient{secret: s.PaystackSecret, bank: s.PaystackBank,
			emailDomain: s.CustomerEmailDomain, base: "https://api.paystack.co"}, nil
	case Nomba:
		return &NombaClient{secret: s.NombaSecret, accountID: s.NombaAccountID, base: "https://api.nomba.com"}, nil
	}
	return nil, fmt.Errorf("unknown PSP %q", resolved)
}
