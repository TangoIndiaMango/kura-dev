package finance

import (
	"bytes"
	"fmt"
	"strings"

	"github.com/go-pdf/fpdf"
)

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
