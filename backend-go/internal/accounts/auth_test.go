package accounts_test

import (
	"net/http"
	"testing"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/apitest"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/testkit"
)

const riderPhone = "+2348031110001"

func TestOTPSignupCreatesOperatorAndCoolsDown(t *testing.T) {
	c := apitest.New(t)
	r := c.Do("POST", "/api/v1/auth/otp/request/", map[string]any{"phone": "08031110001"}, "")
	if r.Expect(t, http.StatusAccepted)["next"] != "otp" {
		t.Fatalf("new number must go to OTP: %v", r.Body)
	}
	again := c.Do("POST", "/api/v1/auth/otp/request/", map[string]any{"phone": riderPhone}, "")
	if again.Status != http.StatusTooManyRequests || again.ErrorCode() != "OTP_TOO_MANY" {
		t.Fatalf("resend inside 60 s must be refused: %d %v", again.Status, again.Body)
	}
	bad := c.Do("POST", "/api/v1/auth/otp/verify/", map[string]any{"phone": riderPhone, "code": "000000"}, "")
	if bad.ErrorCode() != "OTP_INVALID" {
		t.Fatalf("wrong code: %v", bad.Body)
	}
	ok := c.Do("POST", "/api/v1/auth/otp/verify/", map[string]any{"phone": riderPhone, "code": "123456"}, "")
	body := ok.Expect(t, http.StatusOK)
	if body["is_new_user"] != true || body["onboarding_step"] != "pin" {
		t.Fatalf("expected a new operator at the PIN step: %v", body)
	}
	if n := testkit.Count(t, c.Pool, `SELECT count(*) FROM accounts_account a JOIN accounts_driver d
		ON d.account_id = a.id WHERE a.display_name = 'Rider 0001' AND a.kura_id LIKE 'KR-%'`); n != 1 {
		t.Fatalf("account + driver not provisioned (%d)", n)
	}
}

func TestPinLockoutAfterThreeMisses(t *testing.T) {
	c := apitest.New(t)
	testkit.CreateUser(t, c.Pool, testkit.User{Phone: riderPhone, PIN: "1234"})
	for i := 0; i < 3; i++ {
		r := c.Do("POST", "/api/v1/auth/pin/login/", map[string]any{"phone": riderPhone, "pin": "9999"}, "")
		if r.ErrorCode() != "PIN_INVALID" {
			t.Fatalf("miss %d: %v", i, r.Body)
		}
	}
	locked := c.Do("POST", "/api/v1/auth/pin/login/", map[string]any{"phone": riderPhone, "pin": "1234"}, "")
	if locked.Status != http.StatusTooManyRequests || locked.ErrorCode() != "PIN_LOCKED" {
		t.Fatalf("4th try must be locked even with the right PIN: %v", locked.Body)
	}
}

func TestPinResetSignsOutOtherSessions(t *testing.T) {
	c := apitest.New(t)
	testkit.CreateUser(t, c.Pool, testkit.User{Phone: riderPhone, PIN: "1234"})
	login := c.Do("POST", "/api/v1/auth/pin/login/", map[string]any{"phone": riderPhone, "pin": "1234"}, "")
	old := login.Expect(t, http.StatusOK)["access"].(string)

	reset := c.Do("POST", "/api/v1/auth/pin/set/", map[string]any{"pin": "4321", "pin_confirm": "4321"}, old)
	if reset.Expect(t, http.StatusOK)["was_reset"] != true {
		t.Fatalf("expected a reset: %v", reset.Body)
	}
	if r := c.Do("POST", "/api/v1/auth/pin/verify/", map[string]any{"pin": "4321"}, old); r.Status != http.StatusUnauthorized {
		t.Fatalf("old session must be revoked, got %d", r.Status)
	}
	fresh := reset.Str("access")
	if r := c.Do("POST", "/api/v1/auth/pin/verify/", map[string]any{"pin": "4321"}, fresh); r.Status != http.StatusOK {
		t.Fatalf("new session should work: %v", r.Body)
	}
}

func TestRefreshRotatesAndBlacklists(t *testing.T) {
	c := apitest.New(t)
	testkit.CreateUser(t, c.Pool, testkit.User{Email: "ops@test.eco", Password: "pw-test-1", IsStaff: true,
		Role: "OPS_MANAGER"})
	login := c.Do("POST", "/api/v1/auth/login/", map[string]any{"identifier": "OPS@test.eco", "password": "pw-test-1"}, "")
	refresh := login.Expect(t, http.StatusOK)["refresh"].(string)

	rotated := c.Do("POST", "/api/v1/auth/token/refresh/", map[string]any{"refresh": refresh}, "")
	if rotated.Expect(t, http.StatusOK)["refresh"] == refresh {
		t.Fatal("refresh token must rotate")
	}
	reuse := c.Do("POST", "/api/v1/auth/token/refresh/", map[string]any{"refresh": refresh}, "")
	if reuse.Status != http.StatusUnauthorized {
		t.Fatalf("old refresh must be blacklisted, got %d", reuse.Status)
	}
	if n := testkit.Count(t, c.Pool, `SELECT count(*) FROM audit_auditevent WHERE action = 'auth.staff_login'`); n != 1 {
		t.Fatalf("staff login not audited (%d)", n)
	}
}

func TestConsoleLoginRejectsRiders(t *testing.T) {
	c := apitest.New(t)
	testkit.CreateUser(t, c.Pool, testkit.User{Email: "rider@test.eco", Password: "pw-test-1"})
	r := c.Do("POST", "/api/v1/auth/login/", map[string]any{"identifier": "rider@test.eco", "password": "pw-test-1"}, "")
	if r.Status != http.StatusUnauthorized || r.ErrorCode() != "AUTH_INVALID" {
		t.Fatalf("non-staff must not sign in to the console: %v", r.Body)
	}
}
