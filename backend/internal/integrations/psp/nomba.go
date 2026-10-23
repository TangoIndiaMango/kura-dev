package psp

import (
	"context"
	"math"
	"strconv"
	"strings"
)

// NombaClient is integrations.providers.nomba.client.NombaPsp.
type NombaClient struct {
	secret, accountID, base string
}

func (c *NombaClient) Code() string { return Nomba }

func (c *NombaClient) notConfigured() error {
	return &Error{Message: "NOMBA_SECRET_KEY / NOMBA_ACCOUNT_ID are not configured."}
}

// ProvisionVirtualAccount is POST /v1/accounts/virtual (synchronous NUBAN).
func (c *NombaClient) ProvisionVirtualAccount(ctx context.Context, in VARequest) (VAResult, error) {
	if c.secret == "" || c.accountID == "" {
		return VAResult{}, c.notConfigured()
	}
	name := in.DisplayName
	if len(name) > 100 {
		name = name[:100]
	}
	if name == "" {
		name = "KURA Operator"
	}
	body := map[string]any{"accountRef": in.AccountID, "accountName": name, "currency": "NGN"}
	if in.BVNOrNIN != "" {
		body["bvn"] = in.BVNOrNIN
	}
	data, err := c.api(ctx, "POST", "/v1/accounts/virtual", body)
	if err != nil {
		return VAResult{}, err
	}
	ref := pyStr(data["accountRef"])
	if ref == "" {
		ref = in.AccountID
	}
	acctName := pyStr(data["bankAccountName"])
	if acctName == "" {
		acctName = pyStr(data["accountName"])
	}
	return VAResult{Reference: ref, NUBAN: pyStr(data["bankAccountNumber"]), BankName: pyStr(data["bankName"]),
		AccountName: acctName}, nil
}

// VerifyTransaction reads one account transaction.
func (c *NombaClient) VerifyTransaction(ctx context.Context, reference string) (VerifyResult, error) {
	if c.secret == "" || c.accountID == "" {
		return VerifyResult{}, c.notConfigured()
	}
	data, err := c.api(ctx, "GET", "/v1/transactions/accounts/single?transactionId="+reference, nil)
	if err != nil {
		return VerifyResult{}, err
	}
	status := strings.ToUpper(pyStr(data["status"]))
	out := VerifyResult{OK: status == "SUCCESS" || status == "SUCCESSFUL", Reference: pyStr(data["transactionId"]),
		Status: status, Currency: pyStr(data["currency"])}
	if out.Reference == "" {
		out.Reference = reference
	}
	if out.Currency == "" {
		out.Currency = "NGN"
	}
	amount := data["transactionAmount"]
	if !truthy(amount) {
		amount = data["amount"]
	}
	if k, ok := NairaToKobo(amount); ok {
		out.AmountKobo = &k
	}
	return out, nil
}

func (c *NombaClient) api(ctx context.Context, method, path string, body any) (map[string]any, error) {
	payload, err := requestJSON(ctx, "nomba", method, c.base+path,
		map[string]string{"Authorization": "Bearer " + c.secret, "accountId": c.accountID}, body)
	if err != nil {
		return nil, err
	}
	code := pyStr(payload["code"])
	if code != "00" && code != "0" && !truthy(payload["status"]) {
		msg := pyStr(payload["description"])
		if msg == "" {
			msg = pyStr(payload["message"])
		}
		if msg == "" {
			msg = "Nomba request failed."
		}
		return nil, &Error{Message: msg, Payload: payload}
	}
	return dataOf(payload), nil
}

// NairaToKobo is core.money.naira_to_kobo: int(round(naira * 100)), ties to
// even like Python. Numeric strings are accepted too (Django would raise).
func NairaToKobo(v any) (int64, bool) {
	var naira float64
	switch t := v.(type) {
	case float64:
		naira = t
	case string:
		f, err := strconv.ParseFloat(strings.TrimSpace(t), 64)
		if err != nil {
			return 0, false
		}
		naira = f
	default:
		return 0, false
	}
	return int64(math.RoundToEven(naira * 100)), true
}
