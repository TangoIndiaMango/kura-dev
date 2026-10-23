package mail

import (
	"os"
	"regexp"
	"strings"
	"testing"
)

var space = regexp.MustCompile(`\s+`)

func norm(s string) string { return strings.TrimSpace(space.ReplaceAllString(s, " ")) }

// Golden files rendered by Django's render_to_string with the same context.
func TestStaffInviteMatchesDjango(t *testing.T) {
	ctx := map[string]any{"support_email": "help@kura.test", "product_name": "Kura",
		"logo_mark_cid": "cid:kura_mark", "logo_circle_cid": "cid:kura_mark_circle",
		"first_name": "Ada", "role_label": "Operations Manager",
		"setup_url": "https://admin.kura.test/create-password?token=abc&email=a%40b.c", "expires_hours": 72}
	html, text, err := render("staff_invite", "Set up your Kura console password", ctx)
	if err != nil {
		t.Fatal(err)
	}
	wantHTML, _ := os.ReadFile("testdata/staff_invite.django.html")
	wantText, _ := os.ReadFile("testdata/staff_invite.django.txt")
	if norm(html) != norm(string(wantHTML)) {
		t.Errorf("html differs\n go:     %.400s\n django: %.400s", norm(html), norm(string(wantHTML)))
	}
	// Django autoescapes .txt templates too ("&amp;" in a plain-text link);
	// Go's text/template is correct, so compare with that undone.
	if norm(text) != strings.ReplaceAll(norm(string(wantText)), "&amp;", "&") {
		t.Errorf("text differs\n go:     %s\n django: %s", norm(text), norm(string(wantText)))
	}
}
