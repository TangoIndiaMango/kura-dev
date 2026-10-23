package spend

import "testing"

func d(s string) Date { x, _ := ParseDate(s); return x }

func TestWindow(t *testing.T) {
	today := d("2026-10-22")
	cases := []struct{ start, end, wantS, wantE string }{
		{"", "", "2026-10-09", "2026-10-22"},
		{"2026-09-01", "2026-10-22", "2026-09-01", "2026-10-22"},
		{"2026-01-01", "2026-10-22", "2026-07-25", "2026-10-22"}, // > 90 days keeps last 90
		{"2026-10-20", "2026-10-01", "2026-09-18", "2026-10-01"}, // backwards resets
		{"bad", "2026-10-15", "2026-10-02", "2026-10-15"},
		{"", "2026-9-3", "2026-08-21", "2026-09-03"}, // parse_date allows 1-digit parts
		{"", "2026-02-30", "2026-10-09", "2026-10-22"},
	}
	for _, c := range cases {
		s, e := Window(c.start, c.end, today)
		if s.ISO() != c.wantS || e.ISO() != c.wantE {
			t.Errorf("Window(%q,%q) = %s..%s, want %s..%s", c.start, c.end, s.ISO(), e.ISO(), c.wantS, c.wantE)
		}
	}
}

func TestFuelSaved(t *testing.T) {
	p := Petrol{}.WithDefaults()
	if got := p.FuelSavedKobo(3); got != 306000 {
		t.Fatalf("FuelSavedKobo(3) = %d", got)
	}
}
