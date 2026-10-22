package accounts

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/router"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/throttle"
)

// Module mounts the accounts endpoints.
type Module struct {
	auth    *AuthHandler
	limiter *throttle.Limiter
}

func NewModule(auth *AuthHandler, limiter *throttle.Limiter) *Module {
	return &Module{auth: auth, limiter: limiter}
}

// Register mounts /api/v1/auth/* with AuthViewSet's permissions and throttles.
func (m *Module) Register(mux *http.ServeMux) {
	g := router.New(mux, "/api/v1/auth", m.limiter)
	a := m.auth

	g.Public("POST", "/login/", handle(a.login))
	g.Throttle(throttle.AnonBurst).Public("POST", "/login/begin/", handle(a.loginBegin))
	g.Throttle(otpPhone, throttle.OTPIP).Public("POST", "/otp/request/", handle(a.otpRequest))
	g.Public("POST", "/otp/verify/", handle(a.otpVerify))
	g.Throttle(throttle.PIN).Public("POST", "/pin/login/", handle(a.pinLogin))
	g.Throttle(throttle.PIN).User("POST", "/pin/set/", handle(a.pinSet))
	g.Throttle(throttle.PIN).User("POST", "/pin/verify/", handle(a.pinVerify))
	g.Public("POST", "/token/refresh/", handle(a.refresh))
	g.User("POST", "/logout/", handle(a.logout))
	g.User("POST", "/onboarding/complete/", a.completeOnboarding)
}

// otpPhone keys OTP requests by the phone in the body (OtpPhoneThrottle).
var otpPhone = func() throttle.Rule {
	r := throttle.MustRule("otp_phone", "5/hour")
	r.Ident = phoneIdent
	return r
}()

// phoneIdent reads "phone" from the JSON body and restores the body for the
// handler. Empty phone = rule skipped (DRF returns no cache key).
func phoneIdent(r *http.Request) string {
	raw, err := io.ReadAll(io.LimitReader(r.Body, 64<<10))
	if err != nil {
		return ""
	}
	r.Body = io.NopCloser(bytes.NewReader(raw))
	var b struct {
		Phone any `json:"phone"`
	}
	if json.Unmarshal(raw, &b) != nil || b.Phone == nil {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(b.Phone))
}
