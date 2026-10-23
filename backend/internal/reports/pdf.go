package reports

import (
	"bytes"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-pdf/fpdf"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/analytics"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/finance"
)

// ascii is _ascii: core PDF fonts are latin-1 only (the em dash maps to
// "-"; it used to print as "?").
func ascii(v any) string {
	s := fmt.Sprint(v)
	if s == "" || s == "<nil>" {
		s = "—"
	}
	s = strings.NewReplacer("₦", "NGN ", "·", "-", "—", "-").Replace(s)
	var b strings.Builder
	for _, r := range s {
		if r > 0xff {
			r = '?'
		}
		b.WriteRune(r)
	}
	return b.String()
}

// impactPDF is render_impact_pdf: the monthly snapshot as an A4 page.
func impactPDF(r *http.Request, q *db.Queries, period string) ([]byte, error) {
	snap, err := analytics.Snapshot(r, q, period)
	if err != nil {
		return nil, err
	}
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetAutoPageBreak(true, 18)
	pdf.AddPage()
	pdf.SetMargins(18, 18, 18)
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	left, _, right, _ := pdf.GetMargins()
	pageW, _ := pdf.GetPageSize()
	line := func(text string, bold bool, size float64, rgb ...int) {
		if len(rgb) == 0 {
			rgb = []int{26, 43, 54}
		}
		style := ""
		if bold {
			style = "B"
		}
		pdf.SetX(left)
		pdf.SetFont("Helvetica", style, size)
		pdf.SetTextColor(rgb[0], rgb[1], rgb[2])
		pdf.MultiCell(pageW-left-right, 6, tr(ascii(text)), "", "L", false)
	}
	grey := []int{91, 107, 117}
	line("KURA Government Impact", true, 18, 0, 49, 83)
	line(fmt.Sprintf("Period %v", snap["period"]), false, 11, 90, 107, 117)
	pdf.Ln(4)
	fuel, _ := snap["fuel_savings_kobo"].(int64)
	for _, kv := range [][2]any{{"Operators served", snap["operators_served"]}, {"Swaps", snap["swaps"]},
		{"Fuel savings", finance.FormatNaira(fuel)}, {"Engines replaced", snap["engines_replaced"]},
		{"CO2 avoided (kg)", snap["co2_kg"]}} {
		line(fmt.Sprint(kv[0]), false, 9, grey...)
		line(fmt.Sprint(kv[1]), true, 12)
		pdf.Ln(1)
	}
	pdf.Ln(4)
	line("Monthly series", true, 12)
	if series, ok := snap["series"].([]map[string]any); ok {
		for _, p := range series {
			line(fmt.Sprintf("%v: %v swaps · %v t CO2", p["period"], p["swaps"], p["co2_t"]), false, 10)
		}
	}
	pdf.Ln(6)
	line("Disclaimer", true, 10, grey...)
	line(analytics.Disclaimer, false, 9, grey...)
	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
