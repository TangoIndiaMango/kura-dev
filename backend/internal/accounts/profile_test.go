package accounts_test

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"testing"
	"time"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/apitest"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/testkit"
)

// Pepper = the apitest secret key (OTP_PEPPER unset), as in Django.
func setupHash(raw string) string {
	m := hmac.New(sha256.New, []byte("test-secret-key-0123456789abcdef-test"))
	m.Write([]byte(raw))
	return hex.EncodeToString(m.Sum(nil))
}

func TestInviteSetupSignsInOnceThenTokenIsSpent(t *testing.T) {
	c := apitest.New(t)
	uid := testkit.CreateUser(t, c.Pool, testkit.User{Email: "new.staff@test.eco", IsStaff: true,
		Role: "OPS_MANAGER", FirstName: "Ada"})
	_, err := c.Pool.Exec(context.Background(), `INSERT INTO accounts_passwordsetuptoken
		(id, created_at, updated_at, purpose, token_hash, expires_at, user_id)
		VALUES (gen_random_uuid(), now(), now(), 'INVITE', $1, $2, $3)`,
		setupHash("raw-token-1"), time.Now().Add(time.Hour), uid)
	if err != nil {
		t.Fatal(err)
	}
	ctx := c.Do("POST", "/api/v1/auth/password-setup/context/", map[string]any{"token": "raw-token-1"}, "")
	if body := ctx.Expect(t, http.StatusOK); body["first_name"] != "Ada" || body["purpose"] != "INVITE" {
		t.Fatalf("context: %v", body)
	}
	body := map[string]any{"token": "raw-token-1", "password": "Str0ng!pass", "password_confirmation": "Str0ng!pass"}
	done := c.Do("POST", "/api/v1/auth/password-setup/", body, "")
	if done.Expect(t, http.StatusOK)["access"] == "" {
		t.Fatal("setup must sign the user in")
	}
	again := c.Do("POST", "/api/v1/auth/password-setup/", body, "")
	if again.Status != http.StatusUnauthorized {
		t.Fatalf("token must be single use, got %d", again.Status)
	}
	if n := testkit.Count(t, c.Pool, `SELECT count(*) FROM audit_auditevent WHERE action = 'user.password_set'`); n != 1 {
		t.Fatalf("password_set not audited (%d)", n)
	}
}

func TestMeForFreshRiderAfterOTP(t *testing.T) {
	c := apitest.New(t)
	c.Do("POST", "/api/v1/auth/otp/request/", map[string]any{"phone": riderPhone}, "")
	tok := c.Do("POST", "/api/v1/auth/otp/verify/", map[string]any{"phone": riderPhone, "code": "123456"}, "").Str("access")
	me := c.Do("GET", "/api/v1/auth/me/", nil, tok).Expect(t, http.StatusOK)
	kyc := me["kyc"].(map[string]any)
	consent := me["consent"].(map[string]any)
	if me["is_driver"] != true || me["has_pin"] != false || kyc["next_action"] != "submit" {
		t.Fatalf("unexpected me: %v", me)
	}
	if consent["needs_service_consent"] != true || consent["prompt_required"] != false {
		t.Fatalf("fresh rider consent state wrong: %v", consent)
	}
	prefs := me["notification_prefs"].(map[string]any)
	if len(prefs) != 6 || prefs["swap_sms"] != true {
		t.Fatalf("prefs not normalised: %v", prefs)
	}
}
