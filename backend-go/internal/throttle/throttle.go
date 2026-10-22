// Package throttle ports DRF throttling (core/throttles.py + DEFAULT_THROTTLE_*):
// a sliding-log limiter per (scope, ident), the same rates, and the same 429.
package throttle

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
)

// Rule is one scope with its rate, e.g. {"anon", 20, time.Minute}.
type Rule struct {
	Scope  string
	Limit  int
	Window time.Duration
	// Ident picks the key; nil = user id when signed in, else client IP.
	Ident func(r *http.Request) string
	// AnonOnly skips signed-in callers (DRF AnonRateThrottle).
	AnonOnly bool
}

// MustRule parses DRF rate strings ("60/min", "5/hour", "2000/day").
func MustRule(scope, rate string) Rule {
	n, period, ok := strings.Cut(rate, "/")
	limit, err := strconv.Atoi(n)
	if !ok || err != nil {
		panic(fmt.Sprintf("throttle: bad rate %q", rate))
	}
	windows := map[byte]time.Duration{'s': time.Second, 'm': time.Minute, 'h': time.Hour, 'd': 24 * time.Hour}
	w, ok := windows[period[0]]
	if !ok {
		panic(fmt.Sprintf("throttle: bad period %q", rate))
	}
	return Rule{Scope: scope, Limit: limit, Window: w}
}

// Rates from settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"].
var (
	UserBurst     = MustRule("user_burst", "60/min")
	UserSustained = MustRule("user_sustained", "2000/day")
	AnonBurst     = anonOnly(MustRule("anon", "20/min"))
	OTPIP         = anonOnly(MustRule("otp_ip", "30/hour"))
	PIN           = MustRule("pin", "10/hour")
	MediaUpload   = MustRule("media_upload", "30/hour")
	Webhook       = anonOnly(MustRule("webhook", "600/min"))

	// Defaults apply to every route that doesn't set its own.
	Defaults = []Rule{UserBurst, UserSustained, AnonBurst}
)

func anonOnly(r Rule) Rule { r.AnonOnly = true; return r }

// Store remembers request times per key. Memory is per process; a shared
// store (Redis) can implement the same interface.
type Store interface {
	// Hit records now for key if under limit; otherwise returns the wait.
	Hit(key string, limit int, window time.Duration, now time.Time) (ok bool, wait time.Duration)
}

// Memory is a mutex-guarded sliding log (DRF's history list).
type Memory struct {
	mu   sync.Mutex
	logs map[string][]time.Time
	hits int
}

func NewMemory() *Memory { return &Memory{logs: map[string][]time.Time{}} }

func (m *Memory) Hit(key string, limit int, window time.Duration, now time.Time) (bool, time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()
	cut := now.Add(-window)
	log := m.logs[key]
	i := 0
	for i < len(log) && !log[i].After(cut) {
		i++
	}
	log = log[i:]
	if len(log) >= limit {
		m.logs[key] = log
		return false, log[0].Add(window).Sub(now)
	}
	m.logs[key] = append(log, now)
	if m.hits++; m.hits%10000 == 0 {
		m.sweep(cut)
	}
	return true, 0
}

// sweep drops idle keys so memory stays bounded.
func (m *Memory) sweep(cut time.Time) {
	for k, log := range m.logs {
		if len(log) == 0 || !log[len(log)-1].After(cut.Add(-24*time.Hour)) {
			delete(m.logs, k)
		}
	}
}

// Limiter applies rules for a request.
type Limiter struct {
	store Store
	now   func() time.Time
}

func New(s Store) *Limiter { return &Limiter{store: s, now: time.Now} }

// Check returns a THROTTLED error (DRF wording + Retry-After) when any rule
// is exhausted.
func (l *Limiter) Check(r *http.Request, rules []Rule) error {
	user := reqctx.User(r.Context())
	for _, rule := range rules {
		if rule.AnonOnly && user != nil {
			continue
		}
		ident := identFor(r, rule)
		if ident == "" {
			continue
		}
		ok, wait := l.store.Hit("throttle_"+rule.Scope+"_"+ident, rule.Limit, rule.Window, l.now())
		if !ok {
			secs := int(wait.Seconds() + 0.999)
			return &apperr.Error{Code: "THROTTLED", Status: http.StatusTooManyRequests,
				Message:    fmt.Sprintf("Request was throttled. Expected available in %d seconds.", secs),
				RetryAfter: secs}
		}
	}
	return nil
}

func identFor(r *http.Request, rule Rule) string {
	if rule.Ident != nil {
		return rule.Ident(r)
	}
	if u := reqctx.User(r.Context()); u != nil {
		return u.UserID
	}
	return reqctx.ClientIP(r.Context())
}
