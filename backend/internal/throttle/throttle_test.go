package throttle

import (
	"net/http/httptest"
	"testing"
	"time"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
)

func TestSlidingWindowAndRetryAfter(t *testing.T) {
	now := time.Date(2026, 10, 22, 10, 0, 0, 0, time.UTC)
	l := New(NewMemory())
	l.now = func() time.Time { return now }
	r := httptest.NewRequest("POST", "/x", nil)
	r = r.WithContext(reqctx.WithClientIP(r.Context(), "1.2.3.4"))
	rule := []Rule{MustRule("t", "2/min")}

	for i := 0; i < 2; i++ {
		if err := l.Check(r, rule); err != nil {
			t.Fatalf("hit %d throttled early: %v", i, err)
		}
	}
	now = now.Add(20 * time.Second)
	err := l.Check(r, rule)
	e, ok := apperr.As(err)
	if !ok || e.Code != "THROTTLED" || e.RetryAfter != 40 {
		t.Fatalf("want THROTTLED with 40s wait, got %+v", err)
	}
	now = now.Add(41 * time.Second)
	if err := l.Check(r, rule); err != nil {
		t.Fatalf("window should have slid: %v", err)
	}
}

func TestAnonOnlySkipsSignedIn(t *testing.T) {
	l := New(NewMemory())
	r := httptest.NewRequest("GET", "/x", nil)
	r = r.WithContext(reqctx.WithPrincipal(r.Context(), &reqctx.Principal{UserID: "u1"}))
	rule := []Rule{anonOnly(MustRule("a", "1/min"))}
	for i := 0; i < 3; i++ {
		if err := l.Check(r, rule); err != nil {
			t.Fatal("anon rule applied to a signed-in user")
		}
	}
}

func TestMustRuleParsesDRFRates(t *testing.T) {
	r := MustRule("x", "2000/day")
	if r.Limit != 2000 || r.Window != 24*time.Hour {
		t.Fatalf("got %+v", r)
	}
}
