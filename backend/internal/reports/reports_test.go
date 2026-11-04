package reports_test

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/apitest"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/rollup"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/testkit"
)

// login creates a staff user with a throwaway password made per test run.
func login(t *testing.T, c *apitest.Client, email, role string) string {
	t.Helper()
	pass := uuid.NewString()
	testkit.CreateUser(t, c.Pool, testkit.User{Email: email, Password: pass, IsStaff: true, Role: role})
	tok := c.Do("POST", "/api/v1/auth/login/", map[string]any{"identifier": email, "password": pass}, "").Str("access")
	if tok == "" {
		t.Fatal("login failed")
	}
	return tok
}

// seedPayment adds a rider account and one successful payment made now.
func seedPayment(t *testing.T, c *apitest.Client, kobo int64) uuid.UUID {
	t.Helper()
	ctx := context.Background()
	owner := testkit.CreateUser(t, c.Pool, testkit.User{Phone: "+2348000000" + strings.Repeat("1", 3)})
	acct := uuid.New()
	if _, err := c.Pool.Exec(ctx, `INSERT INTO accounts_account (id, created_at, updated_at, kura_id, kind, display_name,
		status, kyc_status, owner_user_id, registration_channel, psp, risk_status)
		VALUES ($1, now(), now(), 'KR-T1', 'INDIVIDUAL', 'Musa Test', 'ACTIVE', 'VERIFIED', $2, 'WEB', '', 'NORMAL')`,
		acct, owner); err != nil {
		t.Fatal(err)
	}
	if _, err := c.Pool.Exec(ctx, `INSERT INTO finance_payment (id, created_at, updated_at, channel, amount_kobo, vat_kobo,
		receipt_code, status, purpose, account_id) VALUES (gen_random_uuid(), now(), now(), 'CARD', $1, $2, 'RC-T1',
		'SUCCESS', 'PLAN', $3)`, kobo, kobo*75/1075, acct); err != nil {
		t.Fatal(err)
	}
	return acct
}

func TestSummaryReadsRollups(t *testing.T) {
	c := apitest.New(t)
	tok := login(t, c, "ops@test.eco", "SUPER_ADMIN")
	seedPayment(t, c, 107_500)

	empty := c.Do("GET", "/api/v1/reports/summary/", nil, tok).Expect(t, http.StatusOK)
	if empty["totals"].(map[string]any)["revenue_kobo"].(float64) != 0 {
		t.Fatalf("summary must read rollups, not live payments: %v", empty["totals"])
	}
	if _, err := rollup.Run(context.Background(), c.Pool, true); err != nil {
		t.Fatal(err)
	}
	body := c.Do("GET", "/api/v1/reports/summary/", nil, tok).Expect(t, http.StatusOK)
	totals := body["totals"].(map[string]any)
	if totals["revenue_kobo"].(float64) != 107_500 || totals["received_kobo"].(float64) != 107_500 || totals["vat_kobo"].(float64) != 7_500 ||
		totals["net_kobo"].(float64) != 100_000 || totals["new_riders"].(float64) != 1 {
		t.Fatalf("totals: %v", totals)
	}
	if n := len(body["daily"].([]any)); n != 30 {
		t.Fatalf("default window is 30 days, got %d", n)
	}
	purposes := body["purposes"].([]any)
	if len(purposes) != 1 || purposes[0].(map[string]any)["key"] != "PLAN" {
		t.Fatalf("purposes: %v", purposes)
	}
	coops := c.Do("GET", "/api/v1/reports/summary/cooperatives/", nil, tok).Expect(t, http.StatusOK)
	rows := coops["results"].([]any)
	if len(rows) != 1 || rows[0].(map[string]any)["name"] != "No chairman" {
		t.Fatalf("cooperatives: %v", rows)
	}

	cohorts := c.Do("GET", "/api/v1/analytics/revenue/cohorts/?months=3", nil, tok).Expect(t, http.StatusOK)
	list := cohorts["cohorts"].([]any)
	last := list[len(list)-1].(map[string]any)
	month := last["months"].([]any)[0].(map[string]any)
	if last["riders"].(float64) != 1 || month["active"].(float64) != 1 || month["paid_kobo"].(float64) != 107_500 {
		t.Fatalf("cohorts: %v", cohorts)
	}
	arpu := cohorts["arpu"].([]any)
	if a := arpu[len(arpu)-1].(map[string]any); a["arpu_kobo"].(float64) != 107_500 {
		t.Fatalf("arpu: %v", arpu)
	}
	overview := c.Do("GET", "/api/v1/analytics/revenue/overview/", nil, tok).Expect(t, http.StatusOK)
	if overview["gross_kobo"].(float64) != 107_500 || overview["transactions"].(float64) != 1 {
		t.Fatalf("revenue overview must read the rollup: %v", overview)
	}
	ret := c.Do("GET", "/api/v1/analytics/revenue/retention/", nil, tok).Expect(t, http.StatusOK)
	if ret["active_riders"].(float64) != 1 || ret["churned_riders"].(float64) != 0 || ret["churn_pct"] != nil {
		t.Fatalf("retention: %v", ret)
	}

	// A second run inside the gap is skipped; the rows stay exact.
	res, err := rollup.Run(context.Background(), c.Pool, false)
	if err != nil || res["skipped"] != "recent" {
		t.Fatalf("second run: %v %v", res, err)
	}
	if n := testkit.Count(t, c.Pool, `SELECT sum(payments) FROM analytics_dailymoney`); n != 1 {
		t.Fatalf("rollup rows duplicated: %d", n)
	}
}

func TestSummaryRejectsBadRanges(t *testing.T) {
	c := apitest.New(t)
	tok := login(t, c, "ops@test.eco", "SUPER_ADMIN")
	r := c.Do("GET", "/api/v1/reports/summary/?start_date=2020-01-01&end_date=2026-01-01", nil, tok)
	if r.Status != http.StatusBadRequest {
		t.Fatalf("over three years must be refused, got %d", r.Status)
	}
	if r := c.Do("GET", "/api/v1/reports/summary/?start_date=2026-02-30", nil, tok); r.Status != http.StatusBadRequest {
		t.Fatalf("impossible date accepted: %d", r.Status)
	}
}

func TestChairmanWithoutCooperativeIsRefused(t *testing.T) {
	c := apitest.New(t)
	tok := login(t, c, "chair@test.eco", "COOPERATIVE_CHAIRMAN")
	if r := c.Do("GET", "/api/v1/reports/summary/", nil, tok); r.Status != http.StatusForbidden {
		t.Fatalf("got %d", r.Status)
	}
}

func TestBuilderPreviewAndExport(t *testing.T) {
	c := apitest.New(t)
	tok := login(t, c, "ops@test.eco", "SUPER_ADMIN")
	seedPayment(t, c, 107_500)

	sets := c.Do("GET", "/api/v1/reports/datasets/", nil, tok)
	if sets.Status != http.StatusOK || !strings.Contains(string(sets.Raw), `"code":"payments"`) {
		t.Fatalf("datasets: %d %s", sets.Status, sets.Raw)
	}
	if strings.Contains(string(sets.Raw), "p.receipt_code") {
		t.Fatal("field SQL must never leave the server")
	}

	today := rollup.Day(time.Now()).Format(time.DateOnly)
	req := map[string]any{"dataset": "payments", "fields": []string{"receipt", "amount", "rider_name"},
		"start_date": today, "end_date": today, "filters": map[string]string{"status": "SUCCESS"}, "search": "musa"}
	prev := c.Do("POST", "/api/v1/reports/preview/", req, tok).Expect(t, http.StatusOK)
	rows := prev["rows"].([]any)
	if prev["count"].(float64) != 1 || len(rows) != 1 {
		t.Fatalf("preview: %v", prev)
	}
	if row := rows[0].([]any); row[0] != "RC-T1" || row[1].(float64) != 107_500 || row[2] != "Musa Test" {
		t.Fatalf("row: %v", row)
	}

	for name, bad := range map[string]map[string]any{
		"unknown field": {"dataset": "payments", "fields": []string{"p.id; DROP TABLE x"}, "start_date": today, "end_date": today},
		"bad choice":    {"dataset": "payments", "fields": []string{"receipt"}, "start_date": today, "end_date": today, "filters": map[string]string{"status": "x' OR 1=1"}},
		"no fields":     {"dataset": "payments", "fields": []string{}, "start_date": today, "end_date": today},
		"no dataset":    {"dataset": "nope", "fields": []string{"receipt"}, "start_date": today, "end_date": today},
	} {
		if r := c.Do("POST", "/api/v1/reports/preview/", bad, tok); r.Status != http.StatusBadRequest {
			t.Fatalf("%s: got %d %s", name, r.Status, r.Body)
		}
	}

	job := c.Do("POST", "/api/v1/reports/", map[string]any{"kind": "DATASET", "params": req}, tok).Expect(t, http.StatusCreated)
	if raw := job["raw"].(map[string]any); job["status"] != "READY" || raw["rows"].(float64) != 1 || raw["truncated"] != false {
		t.Fatalf("job: %v", job)
	}
	file := c.Do("GET", job["download_path"].(string), nil, tok)
	if file.Status != http.StatusOK || !strings.HasPrefix(string(file.Raw), "Receipt,Amount (NGN),Rider\r\nRC-T1,1075.00,Musa Test") {
		t.Fatalf("csv: %d %q", file.Status, file.Raw)
	}
	hist := c.Do("GET", "/api/v1/reports/", nil, tok).Expect(t, http.StatusOK)
	if hist["count"].(float64) != 1 {
		t.Fatalf("history: %v", hist)
	}

	// Someone else's file is not theirs to read.
	other := login(t, c, "agent@test.eco", "HUB_AGENT")
	if r := c.Do("GET", "/api/v1/reports/"+job["id"].(string)+"/", nil, other); r.Status != http.StatusNotFound {
		t.Fatalf("other user saw the job: %d", r.Status)
	}
}

func TestRiderSeesNoDatasets(t *testing.T) {
	c := apitest.New(t)
	testkit.CreateUser(t, c.Pool, testkit.User{Email: "rider@test.eco"})
	c.Do("POST", "/api/v1/auth/otp/request/", map[string]any{"phone": "+2348011111111"}, "")
	tok := c.Do("POST", "/api/v1/auth/otp/verify/", map[string]any{"phone": "+2348011111111", "code": "123456"}, "").Str("access")
	sets := c.Do("GET", "/api/v1/reports/datasets/", nil, tok)
	if sets.Status != http.StatusOK || strings.TrimSpace(string(sets.Raw)) != "[]" {
		t.Fatalf("rider datasets: %d %s", sets.Status, sets.Raw)
	}
	req := map[string]any{"dataset": "payments", "fields": []string{"receipt"}, "start_date": "2026-01-01", "end_date": "2026-01-02"}
	if r := c.Do("POST", "/api/v1/reports/", map[string]any{"kind": "DATASET", "params": req}, tok); r.Status != http.StatusBadRequest {
		t.Fatalf("rider export: %d", r.Status)
	}
}

func TestHubAgentOnlyGetsHubDatasetsForTheirHubs(t *testing.T) {
	c := apitest.New(t)
	tok := login(t, c, "agent@test.eco", "HUB_AGENT")
	seedPayment(t, c, 5_000)
	sets := string(c.Do("GET", "/api/v1/reports/datasets/", nil, tok).Raw)
	for _, code := range []string{"swaps", "hubs", "batteries", "alerts"} {
		if !strings.Contains(sets, `"code":"`+code+`"`) {
			t.Fatalf("agent should see %s: %s", code, sets)
		}
	}
	for _, code := range []string{"riders", "payments", "vehicles"} {
		if strings.Contains(sets, `"code":"`+code+`"`) {
			t.Fatalf("agent must not see %s", code)
		}
	}
	// No stations assigned: the hub condition matches nothing.
	req := map[string]any{"dataset": "hubs", "fields": []string{"code"}, "start_date": "2000-01-01", "end_date": "2030-01-01"}
	if body := c.Do("POST", "/api/v1/reports/preview/", req, tok).Expect(t, http.StatusOK); body["count"].(float64) != 0 {
		t.Fatalf("agent preview: %v", body)
	}
}

func TestWalletTopUpIsNotCountedTwice(t *testing.T) {
	c := apitest.New(t)
	tok := login(t, c, "ops@test.eco", "SUPER_ADMIN")
	acct := seedPayment(t, c, 0)
	for _, p := range []struct{ purpose, channel string }{{"FUND", "CARD"}, {"SWAP", "WALLET_DEBIT"}} {
		if _, err := c.Pool.Exec(context.Background(), `INSERT INTO finance_payment (id, created_at, updated_at, channel,
			amount_kobo, vat_kobo, receipt_code, status, purpose, account_id) VALUES (gen_random_uuid(), now(), now(), $1,
			10000, 0, 'RC-'||$2, 'SUCCESS', $2, $3)`, p.channel, p.purpose, acct); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := rollup.Run(context.Background(), c.Pool, true); err != nil {
		t.Fatal(err)
	}
	totals := c.Do("GET", "/api/v1/reports/summary/", nil, tok).Expect(t, http.StatusOK)["totals"].(map[string]any)
	// ₦100 came in by card, was parked in the wallet, then spent on a swap.
	if totals["received_kobo"].(float64) != 10000 || totals["revenue_kobo"].(float64) != 10000 ||
		totals["topup_kobo"].(float64) != 10000 {
		t.Fatalf("totals: %v", totals)
	}
}
