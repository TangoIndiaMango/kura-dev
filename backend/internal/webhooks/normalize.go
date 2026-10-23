// Package webhooks ports integrations' PSP webhooks: Paystack / Nomba
// signature checks, payload normalisation, idempotent ingest and the
// funding / VA-assignment effects, plus the admin events feed.
package webhooks

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
)

// Kinds (PspEventKind).
const (
	FundingSuccess  = "FUNDING_SUCCESS"
	FundingFailed   = "FUNDING_FAILED"
	FundingReversed = "FUNDING_REVERSED"
	VAAssigned      = "VA_ASSIGNED"
	VAFailed        = "VA_FAILED"
	Unknown         = "UNKNOWN"
)

// Event is NormalizedPspEvent.
type Event struct {
	Provider, EventID, Kind, Reference string
	AmountKobo                         *int64
	AccountHint, NUBAN, Bank, Name     string
	Raw                                map[string]any
}

func header(h map[string][]string, name string) string {
	for k, v := range h {
		if strings.EqualFold(k, name) && len(v) > 0 {
			return v[0]
		}
	}
	return ""
}

// verifyPaystack: hex HMAC-SHA512 of the raw body with the secret key.
func verifyPaystack(h map[string][]string, body []byte, secret string) bool {
	sig := header(h, "x-paystack-signature")
	if secret == "" || sig == "" {
		return false
	}
	m := hmac.New(sha512.New, []byte(secret))
	m.Write(body)
	return hmac.Equal([]byte(hex.EncodeToString(m.Sum(nil))), []byte(strings.TrimSpace(sig)))
}

// verifyNomba: base64 HMAC-SHA256 over Nomba's colon-joined canonical string.
func verifyNomba(h map[string][]string, body []byte, secret string) bool {
	sig := header(h, "nomba-signature")
	if sig == "" {
		sig = header(h, "nomba-sig-value")
	}
	ts := header(h, "nomba-timestamp")
	if sig == "" || ts == "" || secret == "" {
		return false
	}
	payload, ok := parse(body)
	if !ok {
		return false
	}
	data, merchant, txn := obj(payload["data"]), map[string]any{}, map[string]any{}
	merchant, txn = obj(data["merchant"]), obj(data["transaction"])
	code := str(txn["responseCode"])
	if code == "null" {
		code = ""
	}
	canon := strings.Join([]string{str(payload["event_type"]), str(payload["requestId"]), str(merchant["userId"]),
		str(merchant["walletId"]), str(txn["transactionId"]), str(txn["type"]), str(txn["time"]), code, ts}, ":")
	m := hmac.New(sha256.New, []byte(secret))
	m.Write([]byte(canon))
	return hmac.Equal([]byte(base64.StdEncoding.EncodeToString(m.Sum(nil))), []byte(strings.TrimSpace(sig)))
}

func parse(body []byte) (map[string]any, bool) {
	if len(bytes.TrimSpace(body)) == 0 {
		return map[string]any{}, true
	}
	d := json.NewDecoder(bytes.NewReader(body))
	d.UseNumber()
	var m map[string]any
	if d.Decode(&m) != nil || m == nil {
		return nil, false
	}
	return m, true
}

func obj(v any) map[string]any {
	if m, ok := v.(map[string]any); ok {
		return m
	}
	return map[string]any{}
}

// str is Python str(x or "") on a JSON value.
func str(v any) string {
	switch x := v.(type) {
	case nil:
		return ""
	case string:
		return x
	case bool:
		if !x {
			return ""
		}
		return "True"
	case json.Number:
		if f, _ := x.Float64(); f == 0 {
			return ""
		}
		return x.String()
	}
	return pyDumps(v)
}

func intOf(v any) *int64 {
	if n, ok := v.(json.Number); ok {
		if i, err := n.Int64(); err == nil {
			return &i
		}
		if f, err := n.Float64(); err == nil {
			i := int64(f)
			return &i
		}
	}
	return nil
}

func nairaToKobo(v any) *int64 {
	if n, ok := v.(json.Number); ok {
		if f, err := n.Float64(); err == nil {
			k := int64(math.RoundToEven(f * 100))
			return &k
		}
	}
	return nil
}

// pyDumps is json.dumps(v, sort_keys=True, default=str) (", " / ": ").
func pyDumps(v any) string {
	switch x := v.(type) {
	case nil:
		return "null"
	case bool:
		return strconv.FormatBool(x)
	case json.Number:
		return x.String()
	case string:
		var b strings.Builder
		b.WriteByte('"')
		for _, r := range x {
			switch {
			case r == '"':
				b.WriteString(`\"`)
			case r == '\\':
				b.WriteString(`\\`)
			case r == '\n':
				b.WriteString(`\n`)
			case r == '\r':
				b.WriteString(`\r`)
			case r == '\t':
				b.WriteString(`\t`)
			case r < 0x20 || r > 0x7e:
				if r > 0xffff {
					r -= 0x10000
					b.WriteString(fmt.Sprintf(`\u%04x\u%04x`, 0xd800+(r>>10), 0xdc00+(r&0x3ff)))
				} else {
					b.WriteString(fmt.Sprintf(`\u%04x`, r))
				}
			default:
				b.WriteRune(r)
			}
		}
		b.WriteByte('"')
		return b.String()
	case []any:
		parts := make([]string, len(x))
		for i, e := range x {
			parts[i] = pyDumps(e)
		}
		return "[" + strings.Join(parts, ", ") + "]"
	case map[string]any:
		keys := make([]string, 0, len(x))
		for k := range x {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		parts := make([]string, len(keys))
		for i, k := range keys {
			parts[i] = pyDumps(k) + ": " + pyDumps(x[k])
		}
		return "{" + strings.Join(parts, ", ") + "}"
	}
	return `""`
}

func paystackEventID(event string, data, payload map[string]any) string {
	for _, k := range []string{"id", "reference"} {
		if v, ok := data[k]; ok && v != nil && v != "" {
			return event + ":" + rawStr(v)
		}
	}
	sum := sha256.Sum256([]byte(pyDumps(payload)))
	return event + ":" + hex.EncodeToString(sum[:])[:32]
}

// rawStr is str(value) for a present, non-empty value.
func rawStr(v any) string {
	switch x := v.(type) {
	case string:
		return x
	case json.Number:
		return x.String()
	case bool:
		if x {
			return "True"
		}
		return "False"
	}
	return pyDumps(v)
}

func firstStr(vals ...any) string {
	for _, v := range vals {
		if s := str(v); s != "" {
			return s
		}
	}
	return ""
}

// normalizePaystack is normalize_paystack_payload.
func normalizePaystack(p map[string]any) Event {
	event := str(p["event"])
	data := obj(p["data"])
	ev := Event{Provider: "PAYSTACK", EventID: paystackEventID(event, data, p), Raw: p}
	switch {
	case event == "charge.success" || event == "charge.success.offline":
		cust, auth := obj(data["customer"]), obj(data["authorization"])
		ev.Kind, ev.Reference, ev.AmountKobo = FundingSuccess, str(data["reference"]), intOf(data["amount"])
		ev.AccountHint = str(cust["customer_code"])
		ev.NUBAN = firstStr(auth["receiver_bank_account_number"], auth["account_number"])
		ev.Bank, ev.Name = firstStr(auth["receiver_bank"], auth["bank"]), str(auth["account_name"])
	case event == "dedicatedaccount.assign.success" || event == "customeridentification.success":
		dedicated := data
		if d, ok := data["dedicated_account"].(map[string]any); ok {
			dedicated = d
		}
		cust := obj(data["customer"])
		ev.Kind, ev.Reference = VAAssigned, firstStr(cust["customer_code"], dedicated["id"])
		ev.NUBAN, ev.Name, ev.AccountHint = str(dedicated["account_number"]), str(dedicated["account_name"]), str(cust["customer_code"])
		if bank, ok := dedicated["bank"].(map[string]any); ok {
			ev.Bank = str(bank["name"])
		} else {
			ev.Bank = str(dedicated["bank_name"])
		}
	case event == "dedicatedaccount.assign.failed" || event == "customeridentification.failed":
		ev.Kind, ev.Reference = VAFailed, firstStr(data["reference"], data["id"], ev.EventID)
	case strings.HasPrefix(event, "refund") || event == "charge.dispute.create":
		ev.Kind, ev.Reference = FundingReversed, firstStr(data["transaction_reference"], data["reference"])
		ev.AmountKobo = intOf(data["amount"])
	default:
		ev.Kind, ev.Reference = Unknown, firstStr(data["reference"], ev.EventID)
	}
	return ev
}

// normalizeNomba is normalize_nomba_payload.
func normalizeNomba(p map[string]any) Event {
	eventType, reqID := str(p["event_type"]), str(p["requestId"])
	data := obj(p["data"])
	txn, order, bank := obj(data["transaction"]), obj(data["order"]), obj(data["bankAccount"])
	txnID := firstStr(txn["transactionId"], reqID)
	key := reqID
	if key == "" {
		key = txnID
	}
	ev := Event{Provider: "NOMBA", EventID: eventType + ":" + key, Reference: txnID, Raw: p}
	amount := txn["transactionAmount"]
	if amount == nil {
		amount = order["amount"]
	}
	if amount != nil {
		ev.AmountKobo = nairaToKobo(amount)
	}
	switch eventType {
	case "payment_success":
		ev.Kind = FundingSuccess
		ev.AccountHint = firstStr(order["orderReference"], bank["accountNumber"])
		ev.NUBAN, ev.Bank, ev.Name = str(bank["accountNumber"]), str(bank["bankName"]), str(bank["accountName"])
	case "payment_failed":
		ev.Kind = FundingFailed
	case "payment_reversal", "payout_refund":
		ev.Kind = FundingReversed
	default:
		ev.Kind, ev.AmountKobo = Unknown, nil
		ev.Reference = firstStr(txnID, ev.EventID)
	}
	return ev
}
