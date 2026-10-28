package accounts_test

import (
	"net/http"
	"testing"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/apitest"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/config"
)

// OTP_SHOW_IN_APP must work in production: there is no SMS yet, so the code
// returned to the app is the only way riders can sign in.
func TestOTPShowInAppWorksInProduction(t *testing.T) {
	c := apitest.NewWith(t, func(cfg *config.Config) {
		cfg.Env, cfg.Debug, cfg.OTPShowInApp = "production", false, true
	})
	r := c.Do("POST", "/api/v1/auth/otp/request/", map[string]any{"phone": "08031110002"}, "")
	code, _ := r.Expect(t, http.StatusAccepted)["dev_code"].(string)
	if len(code) != 6 {
		t.Fatalf("production with OTP_SHOW_IN_APP must return the code: %v", r.Body)
	}
	ok := c.Do("POST", "/api/v1/auth/otp/verify/", map[string]any{"phone": "08031110002", "code": code}, "")
	ok.Expect(t, http.StatusOK)
}

func TestOTPHiddenByDefault(t *testing.T) {
	c := apitest.NewWith(t, func(cfg *config.Config) { cfg.Env, cfg.Debug = "production", false })
	r := c.Do("POST", "/api/v1/auth/otp/request/", map[string]any{"phone": "08031110003"}, "")
	if _, leaked := r.Expect(t, http.StatusAccepted)["dev_code"]; leaked {
		t.Fatalf("the code must not be returned unless OTP_SHOW_IN_APP is on: %v", r.Body)
	}
}
