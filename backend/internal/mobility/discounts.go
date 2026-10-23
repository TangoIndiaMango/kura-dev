package mobility

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
)

var periodOption = map[string]string{"day": "daily", "daily": "daily", "week": "weekly", "weekly": "weekly",
	"month": "monthly", "monthly": "monthly", "swap": "swap", "pps": "pps"}

// normalizeCode is discount_rules.normalize_code.
func normalizeCode(raw string) string {
	return strings.ReplaceAll(strings.ToUpper(strings.TrimSpace(raw)), " ", "")
}

func periodKey(p string) string {
	k := strings.ToLower(strings.TrimSpace(p))
	if v, ok := periodOption[k]; ok {
		return v
	}
	return strings.ToLower(p)
}

func channelAllowed(channels, channel string) bool {
	for _, part := range strings.Split(strings.ReplaceAll(channels, "|", "·"), "·") {
		for _, p := range strings.Split(strings.ToLower(strings.TrimSpace(part)), ",") {
			if p != "" && p == strings.ToLower(channel) {
				return true
			}
		}
	}
	return false
}

// discountValueLabel is value_label ("10%" / "₦500").
func discountValueLabel(d db.MobilityDiscountcampaign) string {
	if d.ValueType == "PERCENT" {
		return fmt.Sprintf("%d%%", d.Value)
	}
	return "₦" + thousands(int64(d.Value)/100)
}

func thousands(n int64) string {
	s := fmt.Sprint(n)
	var b strings.Builder
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 && c != '-' {
			b.WriteByte(',')
		}
		b.WriteRune(c)
	}
	return b.String()
}

func computeDiscount(d db.MobilityDiscountcampaign, list int64) int64 {
	if list <= 0 {
		return 0
	}
	if d.ValueType == "PERCENT" {
		return max(0, list*int64(min(100, d.Value))/100)
	}
	return min(list, int64(d.Value))
}

func conflict(code, msg string) error { return apperr.Conflict(code, msg) }

// assertLive is assert_live_status.
func assertLive(d db.MobilityDiscountcampaign) error {
	now := time.Now()
	switch d.Status {
	case "SCHEDULED":
		return conflict("DISCOUNT_NOT_LIVE", "This code is not live yet.")
	case "EXPIRED":
		return conflict("DISCOUNT_EXPIRED", "This code has expired.")
	case "PAUSED":
		return conflict("DISCOUNT_PAUSED", "This code is paused.")
	case "ACTIVE":
	default:
		return conflict("DISCOUNT_UNAVAILABLE", "This code is not available.")
	}
	if d.StartsAt != nil && d.StartsAt.After(now) {
		return conflict("DISCOUNT_NOT_LIVE", "This code is not live yet.")
	}
	if d.EndsAt != nil && !d.EndsAt.After(now) {
		return conflict("DISCOUNT_EXPIRED", "This code has expired.")
	}
	return nil
}

func jsonStrings(raw []byte) []string {
	var vals []any
	_ = json.Unmarshal(raw, &vals)
	out := make([]string, 0, len(vals))
	for _, v := range vals {
		out = append(out, strings.ToLower(pyStr(v)))
	}
	return out
}

func containsStr(list []string, s string) bool {
	for _, x := range list {
		if x == s {
			return true
		}
	}
	return false
}

// assertEligible is assert_eligible (plan nil = no catalogue plan).
func assertEligible(d db.MobilityDiscountcampaign, period, channel string, plan *db.MobilityPlan, vehicles int32) error {
	if !channelAllowed(d.Channels, channel) {
		return conflict("DISCOUNT_CHANNEL", fmt.Sprintf("Not valid on %s. Use: %s.", channel, d.Channels))
	}
	key := periodKey(period)
	periods := jsonStrings(d.Periods)
	if !(containsStr(periods, key) || (key == "swap" && containsStr(periods, "pps")) ||
		(key == "pps" && containsStr(periods, "swap"))) {
		return conflict("DISCOUNT_PERIOD", fmt.Sprintf("Not valid for %s payments.", key))
	}
	if !d.AppliesToAllPlans && key != "swap" && key != "pps" {
		option := key
		if plan != nil {
			option = periodOption[plan.Period]
			if plan.Period == "swap" {
				option = "pps"
			} else if option == "" {
				option = plan.Period
			}
		} else if key == "swap" {
			option = "pps"
		}
		var allowed []string
		var raw []any
		_ = json.Unmarshal(d.PlanOptionIds, &raw)
		for _, v := range raw {
			allowed = append(allowed, pyStr(v))
		}
		if !containsStr(allowed, option) {
			return conflict("DISCOUNT_PLAN", "Not valid for this plan.")
		}
	}
	if d.Audience == "FLEET" {
		minV := int32(2)
		if d.FleetMinVehicles != nil && *d.FleetMinVehicles != 0 {
			minV = *d.FleetMinVehicles
		}
		if vehicles < minV {
			return conflict("DISCOUNT_AUDIENCE", fmt.Sprintf("Needs %d+ vehicles on the account.", minV))
		}
	}
	if d.Audience == "SEGMENT" {
		if d.SegmentID == "" {
			return conflict("DISCOUNT_AUDIENCE", "Segment discount is misconfigured.")
		}
		return conflict("DISCOUNT_AUDIENCE", "Not eligible for this segment code.") // no segment grant on these paths
	}
	return nil
}

// Quote is DiscountQuote.
type Quote struct {
	Discount              db.MobilityDiscountcampaign
	List, Discounted, Due int64
	Code, Label           string
}

func notFound() error {
	return apperr.New("DISCOUNT_INVALID", "Code not found.").WithStatus(http.StatusNotFound)
}

// quoteDiscount is DiscountService.quote (read only).
func quoteDiscount(ctx context.Context, q *db.Queries, code string, list int64, period, channel string,
	plan *db.MobilityPlan, vehicles int32) (Quote, error) {
	if list <= 0 {
		return Quote{}, apperr.New("DISCOUNT_NOT_APPLICABLE", "No charge on this payment — discount does not apply.")
	}
	d, err := q.DiscountByCode(ctx, normalizeCode(code))
	if database.IsNoRows(err) {
		return Quote{}, notFound()
	}
	if err == nil {
		err = assertLive(d)
	}
	if err == nil {
		err = assertEligible(d, period, channel, plan, vehicles)
	}
	if err != nil {
		return Quote{}, err
	}
	off := computeDiscount(d, list)
	return Quote{Discount: d, List: list, Discounted: off, Due: max(0, list-off), Code: d.Code,
		Label: discountValueLabel(d)}, nil
}

// consumeIn is DiscountService.consume's arguments.
type consumeIn struct {
	Code, Period, Channel, Key string
	List                       int64
	Account                    uuid.UUID
	Plan                       *db.MobilityPlan
	Vehicles                   int32
	Payment, Subscription      *uuid.UUID
}

// consumeDiscount is DiscountService.consume: lock the campaign, re-check,
// enforce per-account and global caps, record the redemption.
func consumeDiscount(ctx context.Context, q *db.Queries, in consumeIn) (Quote, error) {
	key := strings.TrimSpace(in.Key)
	if key != "" {
		if r, err := q.DiscountRedemptionByKey(ctx, &key); err == nil {
			d := db.MobilityDiscountcampaign{ID: r.DiscountID, Code: r.Code, ValueType: r.ValueType, Value: r.Value}
			return Quote{Discount: d, List: r.ListPriceKobo, Discounted: r.DiscountKobo, Due: r.DueKobo, Code: r.Code,
				Label: discountValueLabel(d)}, nil
		} else if !database.IsNoRows(err) {
			return Quote{}, err
		}
	}
	d, err := q.DiscountByCodeForUpdate(ctx, normalizeCode(in.Code))
	if database.IsNoRows(err) {
		return Quote{}, notFound()
	}
	if err == nil {
		err = assertLive(d)
	}
	if err == nil {
		err = assertEligible(d, in.Period, in.Channel, in.Plan, in.Vehicles)
	}
	if err != nil {
		return Quote{}, err
	}
	if d.MaxPerAccount > 0 {
		used, err := q.AccountRedemptionCount(ctx, db.AccountRedemptionCountParams{DiscountID: d.ID, AccountID: in.Account})
		if err != nil {
			return Quote{}, err
		}
		if used >= d.MaxPerAccount {
			return Quote{}, conflict("DISCOUNT_EXHAUSTED", "This account has already used this code.")
		}
	}
	n, err := q.BumpRedemptions(ctx, db.BumpRedemptionsParams{ID: d.ID, MaxRedemptions: d.MaxRedemptions})
	if err != nil {
		return Quote{}, err
	}
	if n != 1 {
		return Quote{}, conflict("DISCOUNT_EXHAUSTED", "This code has no remaining redemptions.")
	}
	off := computeDiscount(d, in.List)
	due := max(0, in.List-off)
	var k *string
	if key != "" {
		k = &key
	}
	if err := q.InsertRedemption(ctx, db.InsertRedemptionParams{ID: ids.New(), ListPriceKobo: in.List,
		DiscountKobo: off, DueKobo: due, Channel: in.Channel, Period: periodKey(in.Period), IdempotencyKey: k,
		AccountID: in.Account, DiscountID: d.ID, PaymentID: in.Payment, SubscriptionID: in.Subscription}); err != nil {
		return Quote{}, err
	}
	return Quote{Discount: d, List: in.List, Discounted: off, Due: due, Code: d.Code, Label: discountValueLabel(d)}, nil
}
