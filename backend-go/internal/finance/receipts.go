package finance

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/canonjson"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

var channelLabels = map[string]string{"WALLET_DEBIT": "Wallet", "NUBAN_TRANSFER": "Bank transfer", "CARD": "Card",
	"AGENT_CASH": "Cash at hub", "CREDIT": "Swap credit"}

var statusLabels = map[string]string{"SUCCESS": "Paid", "PENDING": "Pending", "FAILED": "Failed",
	"REVERSED": "Reversed"}

func label(m map[string]string, k string) string {
	if v, ok := m[k]; ok {
		return v
	}
	return k
}

// FormatNaira is core.money.format_naira: "₦1,234.50", "-₦5.00".
func FormatNaira(kobo int64) string {
	sign := ""
	if kobo < 0 {
		sign, kobo = "-", -kobo
	}
	whole := fmt.Sprint(kobo / 100)
	var b strings.Builder
	for i, c := range whole {
		if i > 0 && (len(whole)-i)%3 == 0 {
			b.WriteByte(',')
		}
		b.WriteRune(c)
	}
	return fmt.Sprintf("%s₦%s.%02d", sign, b.String(), kobo%100)
}

// seal is seal_receipt_payload: HMAC-SHA256 over the canonical document.
func (h *Handler) seal(doc map[string]any) string { return Seal(h.receiptKey, doc) }

// Seal is seal_receipt_payload with an explicit key.
func Seal(key []byte, doc map[string]any) string {
	body := map[string]any{}
	for k, v := range doc {
		if k != "integrity_hash" && k != "signature" {
			body[k] = v
		}
	}
	canon, _ := canonjson.Marshal(body)
	m := hmac.New(sha256.New, key)
	m.Write(canon)
	return hex.EncodeToString(m.Sum(nil))
}

func personLabel(first, last string, email, phone *string, id string) string {
	if n := strings.TrimSpace(first + " " + last); n != "" {
		return n
	}
	for _, v := range []*string{email, phone} {
		if v != nil && *v != "" {
			return *v
		}
	}
	return id
}

// receiptDoc is build_payment_receipt_document.
func (h *Handler) receiptDoc(r *http.Request, p db.PaymentByIDRow) (map[string]any, error) {
	ctx := r.Context()
	owner, err := h.q.UserRow(ctx, p.OwnerUserID)
	if err != nil {
		return nil, err
	}
	purpose := strings.ToUpper(firstOf(p.Purpose, "SWAP"))
	amount, vat := p.AmountKobo, p.VatKobo
	net := max(0, amount-vat)
	if vat <= 0 && amount > 0 && (purpose == "PLAN" || purpose == "SWAP") {
		net, vat = SplitVAT(amount)
	}
	purposeLabels := map[string]string{"PLAN": "Plan subscription", "SWAP": "Battery swap", "FUND": "Wallet funding",
		"CREDIT_REPAY": "Credit repayment"}
	lines := []any{map[string]any{"label": "Net", "amount_kobo": net},
		map[string]any{"label": "VAT (7.5%)", "amount_kobo": vat},
		map[string]any{"label": "Total", "amount_kobo": amount}}
	doc := map[string]any{"schema": "kura.receipt.v1", "kind": "PAYMENT", "receipt_code": p.ReceiptCode,
		"payment_id": p.ID.String(), "account_id": p.AccountID.String(), "account_kura_id": p.AccountKuraID,
		"channel": p.Channel, "channel_label": label(channelLabels, p.Channel), "amount_kobo": amount,
		"net_kobo": net, "vat_kobo": vat, "amount_label": FormatNaira(amount), "net_label": FormatNaira(net),
		"vat_label": FormatNaira(vat), "purpose": purpose, "purpose_label": label(purposeLabels, purpose),
		"operator_name":    personLabel(owner.FirstName, owner.LastName, owner.Email, owner.Phone, owner.ID.String()),
		"operator_user_id": owner.ID.String(), "psp_reference": deref(p.PspReference), "status": p.Status,
		"status_label": label(statusLabels, p.Status), "issued_at": jsontime.FormatISO(p.CreatedAt),
		"issued_at_label": p.CreatedAt.In(lagos).Format("02 Jan 2006, 15:04 WAT"), "lines": lines}
	var reservation *string
	if purpose == "SWAP" {
		s, err := h.q.ReceiptSwap(ctx, &p.ID)
		if err == nil {
			attachSwap(doc, s)
			if s.ReservationID != nil {
				k := "reservation:" + s.ReservationID.String()
				reservation = &k
			}
		} else if !database.IsNoRows(err) {
			return nil, err
		}
	}
	if err := h.attachDiscount(r, doc, p, reservation); err != nil {
		return nil, err
	}
	seal := h.seal(doc)
	doc["integrity_hash"], doc["signature"] = seal, seal
	return doc, nil
}

// attachSwap is _attach_swap_pack_fields.
func attachSwap(doc map[string]any, s db.ReceiptSwapRow) {
	doc["hub_code"], doc["hub_name"], doc["vehicle_plate"] = s.HubCode, s.HubName, s.RegistrationPlate
	if s.AgentID != nil {
		if _, has := doc["agent_name"]; !has {
			doc["agent_name"] = personLabel(deref(s.AgentFirst), deref(s.AgentLast), s.AgentEmail, s.AgentPhone,
				s.AgentID.String())
		}
	}
	if s.ReturnedBatteryID != nil {
		doc["battery_in"] = fmt.Sprintf("%s · returned · %d%%", deref(s.ReturnedSerial), s.ReturnedChargePct)
	} else {
		doc["battery_in"] = "First swap · no pack returned"
	}
	if s.IssuedBatteryID != nil {
		bits := []string{deref(s.IssuedSerial)}
		if t := deref(s.IssuedType); t != "" {
			bits = append(bits, t)
		}
		bits = append(bits, fmt.Sprintf("%d%%", s.IssuedChargePct))
		doc["battery_out"] = strings.Join(bits, " · ")
	}
}

// attachDiscount is _attach_discount_fields.
func (h *Handler) attachDiscount(r *http.Request, doc map[string]any, p db.PaymentByIDRow, reservationKey *string) error {
	ctx := r.Context()
	row, err := h.q.RedemptionForPayment(ctx, &p.ID)
	if database.IsNoRows(err) && reservationKey != nil {
		var alt db.RedemptionByKeyRow
		alt, err = h.q.RedemptionByKey(ctx, reservationKey)
		row = db.RedemptionForPaymentRow(alt)
	}
	if database.IsNoRows(err) {
		return nil
	}
	if err != nil || row.DiscountKobo <= 0 {
		return err
	}
	doc["list_price_kobo"], doc["discount_code"], doc["discount_kobo"] = row.ListPriceKobo, row.Code, row.DiscountKobo
	doc["lines"] = append([]any{map[string]any{"label": "List price", "amount_kobo": row.ListPriceKobo},
		map[string]any{"label": "Discount (" + row.Code + ")", "amount_kobo": -row.DiscountKobo}},
		doc["lines"].([]any)...)
	return nil
}

func (h *Handler) receipt(w http.ResponseWriter, r *http.Request) {
	p, err := h.payment(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	doc, err := h.receiptDoc(r, p)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	if r.URL.Query().Get("as") != "pdf" {
		respond.OK(w, doc)
		return
	}
	pdf, err := renderReceiptPDF(doc)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", `attachment; filename="`+p.ReceiptCode+`.pdf"`)
	_, _ = w.Write(pdf)
}
