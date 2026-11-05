package export

import (
	"bytes"
	"strings"
	"testing"
)

func TestRenderPDFIsBrandedAndPaged(t *testing.T) {
	head := []string{"Receipt", "Amount (NGN)", "Rider"}
	var rows [][]string
	for i := 0; i < 70; i++ {
		rows = append(rows, []string{"RC-1", "450.00", "Ibrahim Musa"})
	}
	b, err := RenderPDF("Kura payments · 2026-10-01 to 2026-10-31", head, rows, false)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(b, []byte("%PDF")) {
		t.Fatal("not a PDF")
	}
	// 70 rows run past one landscape page, so the band and table header repeat.
	if !bytes.Contains(b, []byte("/Count 3")) {
		t.Fatalf("expected 3 pages")
	}
	if !bytes.Contains(b, []byte("/Image")) {
		t.Fatal("logo missing")
	}
}

func TestFitCutsByRuneWithEllipsis(t *testing.T) {
	pdf := NewDoc("L", "x", "")
	pdf.AddPage()
	pdf.SetFont("Helvetica", "", 8)
	got := fit(pdf, "Ọlálékan Àdébáyọ̀ Express Rider Company", 20)
	if !strings.HasSuffix(got, "…") || !utf8Valid(got) {
		t.Fatalf("bad cut: %q", got)
	}
}

func utf8Valid(s string) bool { return strings.ToValidUTF8(s, "�") == s }
