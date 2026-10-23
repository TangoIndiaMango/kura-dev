package mobility

import (
	"context"
	"fmt"
	"time"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/spend"
)

var vehicleTypes = []string{"MOTORCYCLE", "TRICYCLE", "BOAT"}

// Seed tariffs in naira (PricingService._DEFAULT_MATRICES_NAIRA).
var defaultMatrices = map[string][4]int64{ // daily, weekly, monthly, pay-per-swap
	"MOTORCYCLE": {1200, 6500, 24000, 450},
	"TRICYCLE":   {1800, 9500, 35000, 650},
	"BOAT":       {3500, 18000, 65000, 1200},
}

// Catalogue plan rows (seed_data.fleet): period, name, duration, code suffix.
var planRows = []struct {
	period, name, suffix string
	days                 *int32
}{
	{"swap", "Pay-per-swap", "PAY-SWAP", nil},
	{"day", "Daily", "DAILY", i32p(1)},
	{"week", "Weekly", "WEEKLY", i32p(7)},
	{"month", "Monthly", "MONTHLY", i32p(30)},
}

var motorcycleCodes = map[string]string{"swap": "PLAN-PAY-SWAP", "day": "PLAN-DAILY", "week": "PLAN-WEEKLY-UNLTD",
	"month": "PLAN-MONTHLY-FLEET"}

var defaultAllowance = map[string]map[string]*int32{
	"MOTORCYCLE": {"day": i32p(2), "week": nil, "month": nil},
	"TRICYCLE":   {"day": i32p(3), "week": i32p(18), "month": nil},
	"BOAT":       {"day": i32p(2), "week": i32p(12), "month": nil},
}

var fallbackPrice = map[string]map[string]int64{
	"MOTORCYCLE": {"swap": 45_000, "day": 120_000, "week": 650_000, "month": 2_400_000},
	"TRICYCLE":   {"swap": 65_000, "day": 180_000, "week": 950_000, "month": 3_500_000},
	"BOAT":       {"swap": 120_000, "day": 350_000, "week": 1_800_000, "month": 6_500_000},
}

func i32p(v int32) *int32 { return &v }

func planCode(vehicleType, period, suffix string) string {
	if vehicleType == "MOTORCYCLE" {
		return motorcycleCodes[period]
	}
	prefix := "BOAT"
	if vehicleType == "TRICYCLE" {
		prefix = "TRI"
	}
	return "PLAN-" + prefix + "-" + suffix
}

func eqI32(a, b *int32) bool {
	return (a == nil && b == nil) || (a != nil && b != nil && *a == *b)
}

// ensureDefaults is PricingService.ensure_defaults: hold policy, an ACTIVE
// matrix per vehicle type, the catalogue plans (upsert_catalogue_plans) and
// plan list prices synced to the active matrix. Django runs this on every
// pricing read and price lookup; so does the Go port.
func ensureDefaults(ctx context.Context, q *db.Queries) error {
	if ok, err := q.AnyHoldPolicy(ctx); err != nil {
		return err
	} else if !ok {
		if _, err := q.InsertHoldPolicy(ctx, db.InsertHoldPolicyParams{ID: ids.New(), DefaultHoldMinutes: 15,
			MaxExtendMinutes: 15}); err != nil {
			return err
		}
	}
	today := dateOf(spend.LagosToday(time.Now()))
	for _, vt := range vehicleTypes {
		if ok, err := q.ActiveMatrixExists(ctx, vt); err != nil {
			return err
		} else if ok {
			continue
		}
		r := defaultMatrices[vt]
		if _, err := q.InsertMatrix(ctx, db.InsertMatrixParams{ID: ids.New(), VehicleType: vt, DailyKobo: r[0] * 100,
			WeeklyKobo: r[1] * 100, MonthlyKobo: r[2] * 100, PayPerSwapKobo: r[3] * 100, EffectiveFrom: today,
			Status: "ACTIVE"}); err != nil {
			return err
		}
	}
	if err := upsertCataloguePlans(ctx, q); err != nil {
		return err
	}
	for _, vt := range vehicleTypes {
		m, err := q.LatestActiveMatrix(ctx, vt)
		if database.IsNoRows(err) {
			continue
		}
		if err != nil {
			return err
		}
		if err := syncPlanPrices(ctx, q, m); err != nil {
			return err
		}
	}
	return nil
}

// upsertCataloguePlans keeps Daily/Weekly/Monthly/PPS rows per vehicle type
// at their defaults and expires ACTIVE subscriptions to the PPS plan.
func upsertCataloguePlans(ctx context.Context, q *db.Queries) error {
	for _, vt := range vehicleTypes {
		for _, row := range planRows {
			code := planCode(vt, row.period, row.suffix)
			var allowance *int32
			if row.period != "swap" {
				allowance = defaultAllowance[vt][row.period]
			}
			price := fallbackPrice[vt][row.period]
			p, err := q.PlanByCode(ctx, code)
			if database.IsNoRows(err) {
				if err := q.InsertCataloguePlan(ctx, db.InsertCataloguePlanParams{ID: ids.New(), Code: code,
					Name: row.name, VehicleType: vt, Period: row.period, DurationDays: row.days,
					SwapAllowance: allowance, PriceKobo: price}); err != nil {
					return err
				}
				continue
			}
			if err != nil {
				return err
			}
			if p.Name == row.name && p.VehicleType == vt && p.Period == row.period && eqI32(p.DurationDays, row.days) &&
				eqI32(p.SwapAllowance, allowance) && p.PriceKobo == price && p.IsActive && p.Status == "ACTIVE" {
				continue
			}
			if err := q.SaveCataloguePlan(ctx, db.SaveCataloguePlanParams{ID: p.ID, Name: row.name, VehicleType: vt,
				Period: row.period, DurationDays: row.days, SwapAllowance: allowance, PriceKobo: price, IsActive: true,
				Status: "ACTIVE"}); err != nil {
				return err
			}
		}
	}
	pps, err := q.PlanByCode(ctx, "PLAN-PAY-SWAP")
	if database.IsNoRows(err) || (err == nil && pps.Period != "swap") {
		return nil
	}
	if err != nil {
		return err
	}
	return q.ExpirePPSSubscriptions(ctx, pps.ID)
}

// syncPlanPrices is _sync_plan_catalogue_prices.
func syncPlanPrices(ctx context.Context, q *db.Queries, m db.MobilityPricematrix) error {
	for period, kobo := range map[string]int64{"day": m.DailyKobo, "week": m.WeeklyKobo, "month": m.MonthlyKobo,
		"swap": m.PayPerSwapKobo} {
		if err := q.SyncPlanPrice(ctx, db.SyncPlanPriceParams{VehicleType: m.VehicleType, Period: period,
			PriceKobo: kobo}); err != nil {
			return err
		}
	}
	return nil
}

// activeMatrix is PricingService.active_matrix (ensure_defaults first).
func activeMatrix(ctx context.Context, q *db.Queries, vehicleType string) (db.MobilityPricematrix, error) {
	if err := ensureDefaults(ctx, q); err != nil {
		return db.MobilityPricematrix{}, err
	}
	m, err := q.ActiveMatrixAsOf(ctx, db.ActiveMatrixAsOfParams{VehicleType: vehicleType,
		Today: dateOf(spend.LagosToday(time.Now()))})
	if database.IsNoRows(err) {
		return m, apperr.Conflict("PRICE_NOT_CONFIGURED", fmt.Sprintf("No active price matrix for %s.", vehicleType))
	}
	return m, err
}
