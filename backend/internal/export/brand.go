package export

import (
	"bytes"
	_ "embed"
	"fmt"
	"strings"
	"time"

	"github.com/go-pdf/fpdf"
)

// The K mark (160px, transparent) from the admin's brand folder.
//
//go:embed brand/kura-mark.png
var kuraMark []byte

type rgb struct{ r, g, b int }

// Kura Mobility colours, the admin console's tokens.
var (
	brandNavy  = rgb{0, 49, 83}     // --sb sidebar
	brandTeal  = rgb{13, 124, 143}  // --pr primary
	brandMint  = rgb{28, 160, 181}  // primary on dark
	brandInk   = rgb{15, 36, 48}    // --tx
	brandMuted = rgb{95, 118, 129}  // --mu
	brandLine  = rgb{226, 233, 237} // --bd
	brandZebra = rgb{243, 246, 248} // --bg
)

const (
	bandH        = 22.0 // header band height (mm)
	footerMargin = 16.0 // room kept for the footer
)

var lagos = func() *time.Location {
	l, err := time.LoadLocation("Africa/Lagos")
	if err != nil {
		return time.UTC
	}
	return l
}()

// NewDoc starts a Kura Mobility branded A4 document: every page opens with
// the navy band (K mark, KURA / MOBILITY wordmark, title and subtitle) and
// ends with the footer (generated time, site, page n of N). Content starts
// below the band at the left margin.
func NewDoc(orientation, title, subtitle string) *fpdf.Fpdf {
	pdf := fpdf.New(orientation, "mm", "A4", "")
	pdf.SetMargins(12, bandH+8, 12)
	pdf.SetAutoPageBreak(true, footerMargin)
	pdf.AliasNbPages("{nb}")
	pdf.SetTitle("Kura Mobility · "+title, true)
	pdf.SetAuthor("Kura Mobility", false)
	pdf.SetCreator("kuramobility.com", false)
	pdf.RegisterImageOptionsReader("kura-mark", fpdf.ImageOptions{ImageType: "PNG"}, bytes.NewReader(kuraMark))
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	generated := "Generated " + time.Now().In(lagos).Format("2 Jan 2006, 15:04") + " WAT"

	pdf.SetHeaderFunc(func() {
		pageW, _ := pdf.GetPageSize()
		left, _, right, _ := pdf.GetMargins()
		setFill(pdf, brandNavy)
		pdf.Rect(0, 0, pageW, bandH, "F")
		setFill(pdf, brandTeal)
		pdf.Rect(0, bandH, pageW, 1.2, "F")

		pdf.ImageOptions("kura-mark", left, 4.5, 0, 13, false, fpdf.ImageOptions{ImageType: "PNG"}, 0, "")
		pdf.SetXY(left+15, 6)
		pdf.SetFont("Helvetica", "B", 15)
		setText(pdf, rgb{255, 255, 255})
		pdf.CellFormat(40, 6, "KURA", "", 2, "L", false, 0, "")
		pdf.SetFont("Helvetica", "B", 6.5)
		setText(pdf, brandMint)
		pdf.CellFormat(40, 4, "M O B I L I T Y", "", 0, "L", false, 0, "")

		w := pageW - left - right - 60
		pdf.SetXY(pageW-right-w, 5.5)
		pdf.SetFont("Helvetica", "B", 12)
		setText(pdf, rgb{255, 255, 255})
		pdf.CellFormat(w, 6, tr(fit(pdf, title, w+2)), "", 2, "R", false, 0, "")
		if subtitle != "" {
			pdf.SetFont("Helvetica", "", 8)
			setText(pdf, rgb{201, 217, 227})
			pdf.CellFormat(w, 5, tr(fit(pdf, subtitle, w+2)), "", 0, "R", false, 0, "")
		}
		pdf.SetXY(left, bandH+8)
		setText(pdf, brandInk)
	})

	pdf.SetFooterFunc(func() {
		pageW, pageH := pdf.GetPageSize()
		left, _, right, _ := pdf.GetMargins()
		y := pageH - 11
		pdf.SetDrawColor(brandLine.r, brandLine.g, brandLine.b)
		pdf.SetLineWidth(0.2)
		pdf.Line(left, y, pageW-right, y)
		pdf.SetFont("Helvetica", "", 7.5)
		setText(pdf, brandMuted)
		width := pageW - left - right
		pdf.SetXY(left, y+2)
		pdf.CellFormat(width/3, 4, tr("Kura Mobility · kuramobility.com"), "", 0, "L", false, 0, "")
		pdf.CellFormat(width/3, 4, tr(generated), "", 0, "C", false, 0, "")
		pdf.CellFormat(width/3, 4, fmt.Sprintf("Page %d of {nb}", pdf.PageNo()), "", 0, "R", false, 0, "")
	})
	return pdf
}

// DocTitle drops the "Kura " prefix titles carry; the band already says it.
func DocTitle(t string) string {
	t = strings.TrimSpace(strings.TrimPrefix(t, "Kura "))
	if t == "" {
		return "Report"
	}
	return strings.ToUpper(t[:1]) + t[1:]
}

func setFill(pdf *fpdf.Fpdf, c rgb) { pdf.SetFillColor(c.r, c.g, c.b) }
func setText(pdf *fpdf.Fpdf, c rgb) { pdf.SetTextColor(c.r, c.g, c.b) }
