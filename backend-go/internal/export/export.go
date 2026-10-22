// Package export ports core.helpers.csv_export: admin table downloads as CSV
// or PDF with the same headers, row caps, filenames and X-Export-* headers.
package export

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-pdf/fpdf"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
)

const (
	RowCap    = 25_000
	PDFRowCap = 2_000
)

var truncationNote = fmt.Sprintf("TRUNCATED at %s rows — contact KURA ops for a full DB export.",
	thousands(RowCap))

// Table is one export: headers plus string rows (callers stringify cells the
// way Django's str() would; nil → "").
type Table struct {
	Stem    string // filename without extension, e.g. "roles"
	Title   string // PDF heading
	Headers []string
	Rows    [][]string
}

// Write sends ?export=csv|pdf (default csv), like table_export_response.
func Write(w http.ResponseWriter, format string, t Table) error {
	switch strings.ToLower(strings.TrimSpace(format)) {
	case "", "csv":
		return writeCSV(w, t)
	case "pdf":
		return writePDF(w, t)
	default:
		return apperr.New("VALIDATION_ERROR", fmt.Sprintf("Unsupported export format '%s'. Use csv or pdf.", format))
	}
}

func materialise(t Table, limit int) ([][]string, bool) {
	rows := t.Rows
	truncated := len(rows) > limit
	if truncated {
		rows = append(rows[:limit:limit], append([]string{truncationNote}, make([]string, max(0, len(t.Headers)-1))...))
	}
	return rows, truncated
}

func writeCSV(w http.ResponseWriter, t Table) error {
	rows, truncated := materialise(t, RowCap)
	var buf bytes.Buffer
	cw := csv.NewWriter(&buf)
	cw.UseCRLF = true // Python's csv module writes \r\n
	_ = cw.Write(t.Headers)
	_ = cw.WriteAll(rows)
	headers(w, t.Stem+".csv", "text/csv; charset=utf-8", rows, truncated)
	_, err := w.Write(buf.Bytes())
	return err
}

func writePDF(w http.ResponseWriter, t Table) error {
	rows, truncated := materialise(t, PDFRowCap)
	tr := fpdf.New("L", "mm", "A4", "").UnicodeTranslatorFromDescriptor("")
	pdf := fpdf.New("L", "mm", "A4", "")
	pdf.SetAutoPageBreak(true, 12)
	pdf.AddPage()
	pdf.SetFont("Helvetica", "B", 14)
	pdf.CellFormat(0, 8, tr(t.Title), "", 1, "L", false, 0, "")
	pdf.SetFont("Helvetica", "", 8)
	count := len(rows)
	note := ""
	if truncated {
		count--
		note = " (truncated - open CSV for full set)"
	}
	pdf.CellFormat(0, 5, fmt.Sprintf("%d rows%s", count, note), "", 1, "L", false, 0, "")
	pdf.Ln(2)
	drawTable(pdf, tr, t.Headers, rows)

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return err
	}
	headers(w, t.Stem+".pdf", "application/pdf", rows, truncated)
	_, err := w.Write(buf.Bytes())
	return err
}

// drawTable: dark header row repeated on each page, zebra body rows.
func drawTable(pdf *fpdf.Fpdf, tr func(string) string, head []string, rows [][]string) {
	pageW, _ := pdf.GetPageSize()
	left, _, right, _ := pdf.GetMargins()
	colW := (pageW - left - right) / float64(max(len(head), 1))
	header := func() {
		pdf.SetFont("Helvetica", "B", 8)
		pdf.SetFillColor(30, 41, 59)
		pdf.SetTextColor(255, 255, 255)
		for _, h := range head {
			pdf.CellFormat(colW, 6, tr(fit(pdf, h, colW)), "", 0, "L", true, 0, "")
		}
		pdf.Ln(-1)
		pdf.SetFont("Helvetica", "", 8)
		pdf.SetTextColor(0, 0, 0)
	}
	header()
	_, pageH := pdf.GetPageSize()
	for i, row := range rows {
		if pdf.GetY()+5 > pageH-12 {
			pdf.AddPage()
			header()
		}
		pdf.SetFillColor(245, 247, 250)
		for j := range head {
			cell := ""
			if j < len(row) {
				cell = row[j]
			}
			pdf.CellFormat(colW, 5, tr(fit(pdf, cell, colW)), "B", 0, "L", i%2 == 1, 0, "")
		}
		pdf.Ln(-1)
	}
}

// fit trims text that would overflow its column.
func fit(pdf *fpdf.Fpdf, s string, width float64) string {
	for len(s) > 1 && pdf.GetStringWidth(s) > width-2 {
		s = s[:len(s)-1]
	}
	return s
}

func headers(w http.ResponseWriter, filename, contentType string, rows [][]string, truncated bool) {
	n := len(rows)
	if truncated {
		n--
	}
	h := w.Header()
	h.Set("Content-Type", contentType)
	h.Set("Content-Disposition", `attachment; filename="`+filename+`"`)
	h.Set("X-Export-Row-Count", strconv.Itoa(max(n, 0)))
	if truncated {
		h.Set("X-Export-Truncated", "1")
	} else {
		h.Set("X-Export-Truncated", "0")
	}
	// Merge with the CORS list so the app can read the filename and counts
	// (Django's CORS middleware overwrote these, hiding them).
	expose := "Content-Disposition, X-Export-Row-Count, X-Export-Truncated"
	if cur := h.Get("Access-Control-Expose-Headers"); cur != "" {
		expose = cur + ", " + expose
	}
	h.Set("Access-Control-Expose-Headers", expose)
	w.WriteHeader(http.StatusOK)
}

func thousands(n int) string {
	s := strconv.Itoa(n)
	for i := len(s) - 3; i > 0; i -= 3 {
		s = s[:i] + "," + s[i:]
	}
	return s
}
