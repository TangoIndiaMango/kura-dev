package finance

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"sort"
	"strings"

	"github.com/go-pdf/fpdf"
	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/export"
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
func (h *Handler) seal(doc map[string]any) string {
	body := map[string]any{}
	for k, v := range doc {
		if k != "integrity_hash" && k != "signature" {
			body[k] = v
		}
	}
	canon, _ := canonjson.Marshal(body)
	m := hmac.New(sha256.New, h.receiptKey)
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

// renderReceiptPDF is render_receipt_pdf (Helvetica, latin-1 text).
func renderReceiptPDF(doc map[string]any) ([]byte, error) {
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetAutoPageBreak(true, 18)
	pdf.AddPage()
	pdf.SetMargins(18, 18, 18)
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	ascii := func(v any) string {
		s := fmt.Sprint(v)
		if v == nil || s == "" {
			s = "-"
		}
		return tr(strings.NewReplacer("₦", "NGN ", "·", "-").Replace(s))
	}
	w, _ := pdf.GetPageSize()
	l, _, rgt, _ := pdf.GetMargins()
	line := func(text any, bold bool, size float64, rgb [3]int) {
		pdf.SetX(l)
		style := ""
		if bold {
			style = "B"
		}
		pdf.SetFont("Helvetica", style, size)
		pdf.SetTextColor(rgb[0], rgb[1], rgb[2])
		pdf.MultiCell(w-l-rgt, 6, ascii(text), "", "", false)
	}
	dark, grey, mid := [3]int{26, 43, 54}, [3]int{91, 107, 117}, [3]int{60, 72, 80}
	line("KURA receipt", true, 18, [3]int{0, 49, 83})
	line(firstOf(fmt.Sprint(doc["purpose_label"]), "Payment"), false, 11, [3]int{90, 107, 117})
	pdf.Ln(2)
	line(doc["amount_label"], true, 20, [3]int{13, 124, 143})
	pdf.Ln(2)
	if items, ok := doc["lines"].([]any); ok {
		for _, it := range items {
			m := it.(map[string]any)
			line(fmt.Sprintf("%v: %s", m["label"], FormatNaira(toInt(m["amount_kobo"]))), false, 10, mid)
		}
	}
	pdf.Ln(3)
	when := doc["issued_at_label"]
	for _, kv := range [][2]any{{"Receipt", doc["receipt_code"]}, {"Paid by", firstOf(fmt.Sprint(doc["channel_label"]),
		fmt.Sprint(doc["channel"]))}, {"PSP reference", doc["psp_reference"]}, {"Status", doc["status_label"]},
		{"Hub", fmt.Sprintf("%v - %v", doc["hub_code"], doc["hub_name"])}, {"Vehicle", doc["vehicle_plate"]},
		{"Battery out", doc["battery_out"]}, {"Battery in", doc["battery_in"]}, {"Account", doc["account_kura_id"]},
		{"When", when}} {
		s := fmt.Sprint(kv[1])
		if kv[1] == nil || s == "" || s == "<nil> - <nil>" || s == " - " {
			continue
		}
		line(kv[0], false, 9, grey)
		line(s, true, 11, dark)
		pdf.Ln(1)
	}
	pdf.Ln(4)
	line("Proof of receipt", true, 12, [3]int{0, 49, 83})
	pdf.Ln(1)
	line("Operator (payer)", false, 9, grey)
	line(doc["operator_name"], true, 12, dark)
	line(doc["account_kura_id"], false, 10, grey)
	pdf.Ln(3)
	line("Hub agent (collector)", false, 9, grey)
	line(doc["agent_name"], true, 12, dark)
	pdf.Ln(6)
	line("If this amount is not what you paid in cash, open Report a problem in the Kura app.", false, 9, grey)
	if seal, _ := doc["integrity_hash"].(string); seal != "" {
		pdf.Ln(4)
		line(fmt.Sprintf("Kura seal: %s...%s", seal[:20], seal[len(seal)-8:]), false, 8, [3]int{140, 150, 158})
	}
	var buf bytes.Buffer
	err := pdf.Output(&buf)
	return buf.Bytes(), err
}

func toInt(v any) int64 {
	switch x := v.(type) {
	case int64:
		return x
	case int:
		return int64(x)
	case float64:
		return int64(x)
	}
	return 0
}

func firstOf(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

func deref(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

// statementHeaders is STATEMENT_HEADERS.
var statementHeaders = []string{"Time (WAT)", "Receipt", "Hub", "Account (KURA ID)", "Account name", "Paid by",
	"Purpose", "Amount (NGN)", "VAT (NGN)", "Net (NGN)", "Vehicle", "Agent", "Status"}

func naira(kobo int64) string { return fmt.Sprintf("%.2f", float64(kobo)/100) }

// export is the payments statement (statement_rows): one row per payment
// then totals by channel and account.
func (h *Handler) export(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	f, err := h.paymentFilter(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows, err := h.q.StatementRows(ctx, db.StatementRowsParams{AllRows: f.all, Own: f.own, Account: f.account,
		Status: f.status, Channel: f.channel, Purpose: f.purpose, Hub: f.hub, Q: f.q, FromAt: f.from, ToAt: f.to,
		Lim: export.RowCap + 1})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	payIDs := make([]uuid.UUID, len(rows))
	for i, p := range rows {
		payIDs[i] = p.ID
	}
	swaps, err := h.q.SwapsForPayments(ctx, payIDs)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	firstSwap := map[uuid.UUID]db.SwapsForPaymentsRow{} // next(iter(p.swaps.all()))
	for _, s := range swaps {
		if _, seen := firstSwap[*s.PaymentID]; !seen {
			firstSwap[*s.PaymentID] = s
		}
	}
	type agg struct{ n, kobo int64 }
	byChannel, byAccount := map[string]*agg{}, map[[2]string]*agg{}
	var total agg
	qv := r.URL.Query()
	stem := "kura-payments"
	for _, bit := range []string{qv.Get("start_date"), qv.Get("end_date")} {
		if bit != "" {
			stem += "-" + bit
		}
	}
	t := export.Table{Stem: stem, Title: "Kura payments statement", Headers: statementHeaders}
	for _, p := range rows {
		agent, plate := "", ""
		if s, ok := firstSwap[p.ID]; ok {
			plate = s.Plate
			if s.AgentFirst != nil {
				agent = strings.TrimSpace(deref(s.AgentFirst) + " " + deref(s.AgentLast))
			}
		}
		t.Rows = append(t.Rows, []string{p.CreatedAt.In(lagos).Format("2006-01-02 15:04"), p.ReceiptCode,
			deref(p.HubCode), p.AccountKuraID, p.AccountName, label(channelLabels, p.Channel), p.Purpose,
			naira(p.AmountKobo), naira(p.VatKobo), naira(p.AmountKobo - p.VatKobo), plate, agent, p.Status})
		if p.Status != "SUCCESS" {
			continue
		}
		ch := label(channelLabels, p.Channel)
		if byChannel[ch] == nil {
			byChannel[ch] = &agg{}
		}
		byChannel[ch].n, byChannel[ch].kobo = byChannel[ch].n+1, byChannel[ch].kobo+p.AmountKobo
		key := [2]string{p.AccountKuraID, p.AccountName}
		if byAccount[key] == nil {
			byAccount[key] = &agg{}
		}
		byAccount[key].n, byAccount[key].kobo = byAccount[key].n+1, byAccount[key].kobo+p.AmountKobo
		total.n, total.kobo = total.n+1, total.kobo+p.AmountKobo
	}
	blank := make([]string, len(statementHeaders))
	pad := func(row ...string) []string { return append(row, make([]string, len(statementHeaders)-len(row))...) }
	t.Rows = append(t.Rows, blank, pad("TOTALS (successful)", "", "", "", "", "Payments", "", naira(total.kobo)),
		pad("", "", "", "", "", fmt.Sprint(total.n), "", ""), blank,
		pad("BY CHANNEL", "", "", "", "", "Paid by", "Count", "Amount (NGN)"))
	chans := make([]string, 0, len(byChannel))
	for k := range byChannel {
		chans = append(chans, k)
	}
	sort.Strings(chans)
	for _, k := range chans {
		t.Rows = append(t.Rows, pad("", "", "", "", "", k, fmt.Sprint(byChannel[k].n), naira(byChannel[k].kobo)))
	}
	t.Rows = append(t.Rows, blank, pad("BY ACCOUNT", "", "", "KURA ID", "Account name", "", "Count", "Amount (NGN)"))
	accts := make([][2]string, 0, len(byAccount))
	for k := range byAccount {
		accts = append(accts, k)
	}
	// Python: sorted(items, key=-amount) — stable on dict insertion order.
	order := map[[2]string]int{}
	i := 0
	for _, p := range rows {
		k := [2]string{p.AccountKuraID, p.AccountName}
		if _, seen := order[k]; !seen && byAccount[k] != nil {
			order[k] = i
			i++
		}
	}
	sort.SliceStable(accts, func(a, b int) bool {
		if byAccount[accts[a]].kobo != byAccount[accts[b]].kobo {
			return byAccount[accts[a]].kobo > byAccount[accts[b]].kobo
		}
		return order[accts[a]] < order[accts[b]]
	})
	for _, k := range accts {
		t.Rows = append(t.Rows, pad("", "", "", k[0], k[1], "", fmt.Sprint(byAccount[k].n), naira(byAccount[k].kobo)))
	}
	if err := export.Write(w, qv.Get("export"), t); err != nil {
		respond.Error(w, r, err)
	}
}
