// Package credit ports the credit app: eligibility + scores, swap-credit
// applications and loans, offers and saved segments.
package credit

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"math"
	"strings"
	"time"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platformcfg"
	"github.com/jackc/pgx/v5/pgtype"
)

var lagos, _ = time.LoadLocation("Africa/Lagos")

// utcDay is aware_datetime.date() on a UTC-stored timestamp.
func utcDay(t time.Time) time.Time {
	u := t.UTC()
	return time.Date(u.Year(), u.Month(), u.Day(), 0, 0, 0, 0, time.UTC)
}

func daysBetween(a, b time.Time) int64 { return int64(utcDay(b).Sub(utcDay(a)).Hours() / 24) }

// pyRound is Python round() (half to even) to n places.
func pyRound(x float64, n int) float64 {
	p := math.Pow(10, float64(n))
	return math.RoundToEven(x*p) / p
}

// computeScore is EligibilityService._compute_score.
func computeScore(activeDays, onTime int64, perWeek float64, minDays, minOnTime, maxAmount int64) (int64, map[string]any, int64) {
	tenure := min(40, int64(40*float64(activeDays)/float64(max(minDays, 1))))
	ontime := min(40, int64(40*float64(onTime)/float64(max(minOnTime, 1))))
	freq := min(20, int64(math.Min(perWeek, 10)*2))
	score := max(0, min(100, tenure+ontime+freq))
	var limit int64
	if score >= 60 {
		limit = int64(float64(maxAmount) * float64(score) / 100)
		limit = max(500_000, min(maxAmount, (limit/100_000)*100_000))
	}
	return score, map[string]any{"tenure_pts": tenure, "on_time_pts": ontime, "frequency_pts": freq}, limit
}

// Eligibility is EligibilityResult.
type Eligibility struct {
	Eligible bool
	Limit    int64
	Blockers []string
	Payload  map[string]any
	progress map[string]any
}

// Evaluate is EligibilityService.evaluate.
func Evaluate(ctx context.Context, q *db.Queries, acct db.AccountsAccount, deviceID string) (Eligibility, error) {
	cfg, err := platformcfg.Effective(ctx, q, "credit")
	if err != nil {
		return Eligibility{}, err
	}
	threshold := platformcfg.Int(cfg, "score_threshold")
	minDays, minOnTime := platformcfg.Int(cfg, "min_active_days"), platformcfg.Int(cfg, "min_on_time_pct")
	minTrusted := platformcfg.Int(cfg, "min_trusted_device_days")
	now := time.Now()
	activeDays := max(0, daysBetween(acct.CreatedAt, now))
	outcomes, err := q.SwapOutcomes(ctx, db.SwapOutcomesParams{AccountID: acct.ID, CreatedAt: now.AddDate(0, 0, -60)})
	if err != nil {
		return Eligibility{}, err
	}
	var onTime int64
	if total := outcomes.Completed + outcomes.Failed; total > 0 {
		onTime = int64(math.RoundToEven(100 * float64(outcomes.Completed) / float64(total)))
	}
	perWeek := pyRound(float64(outcomes.Completed)/(60.0/7), 1)
	devices, err := q.TrustedDeviceSeen(ctx, acct.ID)
	if err != nil {
		return Eligibility{}, err
	}
	var trusted int64
	var browser any
	key := ""
	if raw := strings.TrimSpace(deviceID); raw != "" {
		sum := sha256.Sum256([]byte(raw))
		key = hex.EncodeToString(sum[:])
	}
	for _, d := range devices {
		days := max(0, daysBetween(d.FirstSeenAt, now))
		trusted = max(trusted, days)
		if key != "" && d.DeviceKey == key && browser == nil {
			browser = days
		}
	}
	var score, limit int64
	var factors any
	if row, err := q.LatestCreditScore(ctx, acct.ID); err == nil {
		score, limit = int64(row.Score), row.RecommendedLimitKobo
		var f map[string]any
		_ = json.Unmarshal(row.Factors, &f)
		factors = f
	} else if database.IsNoRows(err) {
		var f map[string]any
		score, f, limit = computeScore(activeDays, onTime, perWeek, minDays, minOnTime, platformcfg.Int(cfg, "max_amount_kobo"))
		factors = f
	} else {
		return Eligibility{}, err
	}
	loanActive, err := q.LoanBlocksCredit(ctx, acct.ID)
	if err != nil {
		return Eligibility{}, err
	}
	var lineStatus any
	if line, err := q.CreditLineByAccount(ctx, acct.ID); err == nil {
		lineStatus = line.Status
	} else if !database.IsNoRows(err) {
		return Eligibility{}, err
	}
	creditOn, err := platformcfg.IsEnabled(ctx, q, "credit")
	if err != nil {
		return Eligibility{}, err
	}
	offersOn, err := platformcfg.IsEnabled(ctx, q, "offers")
	if err != nil {
		return Eligibility{}, err
	}
	kyc := acct.KycStatus == "VERIFIED"
	risk := acct.RiskStatus
	if risk == "" {
		risk = "NORMAL"
	}
	blockers := []string{}
	add := func(cond bool, code string) {
		if cond {
			blockers = append(blockers, code)
		}
	}
	add(!creditOn, "CREDIT_DISABLED")
	add(activeDays < minDays, "ACTIVE_DAYS")
	add(onTime < minOnTime, "ON_TIME")
	add(trusted < minTrusted, "TRUSTED_DEVICE")
	add(score < threshold, "SCORE")
	add(!kyc, "KYC")
	add(loanActive, "LOAN_ACTIVE")
	add(lineStatus == "RESTRICTED", "LINE_RESTRICTED")
	add(lineStatus == "CLOSED", "LINE_CLOSED")
	add(acct.Status != "ACTIVE", "ACCOUNT_STATUS")
	add(risk != "NORMAL", "RISK_STATUS")
	eligible := len(blockers) == 0
	if !eligible {
		limit = 0
	}
	progress := map[string]any{"active_days": activeDays, "active_days_required": minDays, "on_time_pct": onTime,
		"on_time_required_pct": minOnTime, "trusted_device_days": trusted, "trusted_device_required_days": minTrusted,
		"this_browser_days": browser, "swaps_per_week": perWeek, "factors": factors,
		"device_trust_note": "Trust is per browser (this install). Clearing site data or using " +
			"Incognito starts a new browser clock."}
	payload := map[string]any{"eligible": eligible, "score": score, "threshold": threshold,
		"recommended_limit_kobo": limit, "kyc_verified": kyc, "loan_active": loanActive, "risk_status": risk,
		"progress": progress, "blockers": blockers, "credit_line_status": lineStatus, "credit_enabled": creditOn,
		"offers_enabled": offersOn}
	return Eligibility{Eligible: eligible, Limit: limit, Blockers: blockers, Payload: payload, progress: progress}, nil
}

func pgDate(t time.Time) pgtype.Date { return pgtype.Date{Time: t, Valid: true} }

var timeNow = time.Now

func requireCredit(ctx context.Context, q *db.Queries) error {
	return platformcfg.RequireEnabled(ctx, q, "credit")
}
