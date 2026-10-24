package psp

import (
	"context"
	"errors"
	"strings"
)

// PaystackClient is integrations.providers.paystack.client.PaystackPsp.
type PaystackClient struct {
	secret, bank, emailDomain, base string
}

func (c *PaystackClient) Code() string { return Paystack }

func (c *PaystackClient) notConfigured() error {
	return &Error{Message: "PAYSTACK_SECRET_KEY is not configured."}
}

// ProvisionVirtualAccount creates the customer, then asks for a dedicated
// NUBAN. Paystack answers asynchronously (webhook), so the result is pending.
func (c *PaystackClient) ProvisionVirtualAccount(ctx context.Context, in VARequest) (VAResult, error) {
	if c.secret == "" {
		return VAResult{}, c.notConfigured()
	}
	email := in.Email
	if email == "" {
		domain := c.emailDomain
		if domain == "" {
			domain = "customers.kura.eco"
		}
		email = "acct-" + in.AccountID + "@" + domain
	}
	first, last := "Operator", "KURA"
	if in.DisplayName != "" {
		parts := strings.Split(in.DisplayName, " ")
		first = parts[0]
		if rest := strings.Join(parts[1:], " "); rest != "" {
			last = rest
		}
	}
	customer, err := c.api(ctx, "POST", "/customer", map[string]any{"email": email, "first_name": first,
		"last_name": last, "phone": in.Phone})
	if err != nil {
		return VAResult{}, err
	}
	customerCode := pyStr(customer["customer_code"])
	body := map[string]any{"email": email, "first_name": first, "last_name": last, "phone": in.Phone,
		"preferred_bank": c.bank}
	if in.BVNOrNIN != "" {
		body["identification"] = map[string]any{"type": "bvn", "number": in.BVNOrNIN}
	}
	assigned, err := c.api(ctx, "POST", "/dedicated_account/assign", body)
	if err != nil {
		var pe *Error
		if errors.As(err, &pe) {
			pe.CustomerCode = customerCode // keep it so the webhook can match later
		}
		return VAResult{}, err
	}
	ref := customerCode
	if ref == "" {
		if cu, ok := assigned["customer"].(map[string]any); ok {
			ref = pyStr(cu["customer_code"])
		}
	}
	if ref == "" {
		ref = in.AccountID
	}
	return VAResult{Pending: true, Reference: ref}, nil
}

// VerifyTransaction is GET /transaction/verify/{reference}.
func (c *PaystackClient) VerifyTransaction(ctx context.Context, reference string) (VerifyResult, error) {
	if c.secret == "" {
		return VerifyResult{}, c.notConfigured()
	}
	data, err := c.api(ctx, "GET", "/transaction/verify/"+reference, nil)
	if err != nil {
		return VerifyResult{}, err
	}
	status := pyStr(data["status"])
	out := VerifyResult{OK: status == "success", Reference: pyStr(data["reference"]), Status: status,
		Currency: pyStr(data["currency"]), Channel: pyStr(data["channel"])}
	if out.Reference == "" {
		out.Reference = reference
	}
	if out.Currency == "" {
		out.Currency = "NGN"
	}
	if a, ok := data["amount"].(float64); ok {
		k := int64(a)
		out.AmountKobo = &k
	}
	return out, nil
}

// InitializeCheckout is POST /transaction/initialize: Paystack hosts the
// payment page; the app opens it in the InlineJS popup with AccessCode, or
// redirects to AuthorizationURL.
func (c *PaystackClient) InitializeCheckout(ctx context.Context, in CheckoutRequest) (CheckoutResult, error) {
	if c.secret == "" {
		return CheckoutResult{}, c.notConfigured()
	}
	body := map[string]any{"email": in.Email, "amount": in.AmountKobo, "reference": in.Reference,
		"currency": "NGN", "metadata": in.Metadata}
	if in.CallbackURL != "" {
		body["callback_url"] = in.CallbackURL
	}
	data, err := c.api(ctx, "POST", "/transaction/initialize", body)
	if err != nil {
		return CheckoutResult{}, err
	}
	out := CheckoutResult{AuthorizationURL: pyStr(data["authorization_url"]), AccessCode: pyStr(data["access_code"]),
		Reference: pyStr(data["reference"])}
	if out.AccessCode == "" || out.AuthorizationURL == "" {
		return out, &Error{Message: "Paystack did not return a checkout link.", Payload: data}
	}
	return out, nil
}

func (c *PaystackClient) api(ctx context.Context, method, path string, body any) (map[string]any, error) {
	payload, err := requestJSON(ctx, "paystack", method, c.base+path,
		map[string]string{"Authorization": "Bearer " + c.secret}, body)
	if err != nil {
		return nil, err
	}
	if !truthy(payload["status"]) {
		msg := pyStr(payload["message"])
		if msg == "" {
			msg = "Paystack request failed."
		}
		return nil, &Error{Message: msg, Payload: payload}
	}
	return dataOf(payload), nil
}
