package mobility

import (
	"context"
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
)

// assertMayUse is assert_driver_may_use_vehicle.
func assertMayUse(driver *uuid.UUID, v db.MobilityVehicle) error {
	if v.AssignedDriverID == nil || (driver != nil && *driver == *v.AssignedDriverID) {
		return nil
	}
	return apperr.Conflict("VEHICLE_ASSIGNED", "This vehicle is assigned to another driver on the account.").
		WithDetails(apperr.Details{"vehicle_id": v.ID.String(), "assigned_driver_id": v.AssignedDriverID.String()})
}

// assertWithinLimits is assert_driver_within_limits (Lagos day; holds count).
func assertWithinLimits(ctx context.Context, q *db.Queries, driver uuid.UUID, fee int64) error {
	d, err := q.DriverForUpdate(ctx, driver)
	if database.IsNoRows(err) {
		return nil
	}
	if err != nil || (d.DailySwapLimit == nil && d.DailySpendKoboLimit == nil) {
		return err
	}
	now := time.Now().In(lagosTZ)
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, lagosTZ)
	day, err := q.DriverDaySwaps(ctx, db.DriverDaySwapsParams{DriverID: driver, CompletedAt: &start,
		CompletedAt_2: ptrTime(start.AddDate(0, 0, 1))})
	if err != nil {
		return err
	}
	holds, err := q.DriverLiveHolds(ctx, driver)
	if err != nil {
		return err
	}
	if d.DailySwapLimit != nil {
		if used := int64(day.Swaps + holds.N); used >= int64(*d.DailySwapLimit) {
			return apperr.Conflict("DRIVER_SWAP_LIMIT", "Daily swap limit reached for this driver.").
				WithDetails(apperr.Details{"limit": *d.DailySwapLimit, "used": used})
		}
	}
	if d.DailySpendKoboLimit != nil {
		if day.Spend+holds.Held+max(0, fee) > *d.DailySpendKoboLimit {
			return apperr.Conflict("DRIVER_SPEND_LIMIT", "Daily spend limit would be exceeded for this driver.").
				WithDetails(apperr.Details{"limit_kobo": *d.DailySpendKoboLimit, "spent_kobo": day.Spend,
					"held_kobo": holds.Held, "fee_kobo": fee})
		}
	}
	return nil
}

func ptrTime(t time.Time) *time.Time { return &t }

var lagosTZ, _ = time.LoadLocation("Africa/Lagos")

var dayKeys = []string{"sun", "mon", "tue", "wed", "thu", "fri", "sat"}

func hhmm(s string) (int, bool) {
	parts := strings.Split(s, ":")
	if len(parts) != 2 {
		return 0, false
	}
	h, e1 := strconv.Atoi(parts[0])
	m, e2 := strconv.Atoi(parts[1])
	return h*60 + m, e1 == nil && e2 == nil
}

// hubOpen is hub_is_open (status + operating_hours in the hub's timezone).
func hubOpen(h db.MobilityHub, at time.Time) bool {
	switch h.Status {
	case "OFFLINE", "CLOSED", "MAINTENANCE":
		return false
	}
	var hours map[string]any
	_ = json.Unmarshal(h.OperatingHours, &hours)
	if len(hours) == 0 {
		return h.Status == "ONLINE"
	}
	tz, err := time.LoadLocation(h.Timezone)
	if h.Timezone == "" || err != nil {
		tz = lagosTZ
	}
	now := at.In(tz)
	key := dayKeys[now.Weekday()]
	windows, _ := hours[key].([]any)
	if len(windows) == 0 {
		windows, _ = hours[strings.ToUpper(key)].([]any)
	}
	local := now.Hour()*60 + now.Minute()
	sec := now.Second()*1_000_000_000 + now.Nanosecond()
	for _, w := range windows {
		pair, ok := w.([]any)
		if !ok || len(pair) != 2 {
			continue
		}
		start, ok1 := hhmm(pyStr(pair[0]))
		end, ok2 := hhmm(pyStr(pair[1]))
		if !ok1 || !ok2 {
			continue
		}
		// start <= t <= end on a time-of-day with seconds (end is HH:MM:00).
		if local >= start && (local < end || (local == end && sec == 0)) {
			return true
		}
	}
	return false
}

// assertHubOpen is assert_hub_accepts_reservations.
func assertHubOpen(h db.MobilityHub) error {
	if hubOpen(h, time.Now()) {
		return nil
	}
	return apperr.Conflict("HUB_CLOSED", "Hub "+h.Code+" is closed or outside operating hours.")
}

// assertNoOverdue is assert_no_unreturned_battery.
func assertNoOverdue(ctx context.Context, q *db.Queries, account uuid.UUID) error {
	o, err := q.OverdueBatteryForAccount(ctx, account)
	if database.IsNoRows(err) {
		return nil
	}
	if err != nil {
		return err
	}
	return apperr.Conflict("BATTERY_UNRETURNED", "Pack "+o.Serial+" on "+o.RegistrationPlate+
		" has been out for more than 48 hours, so app booking is paused. Ride it to any Kura hub and the agent will swap it.").
		WithDetails(apperr.Details{"vehicle": o.RegistrationPlate, "battery": o.Serial})
}

// planCovers is assert_plan_covers_swap (locks the subscription).
func planCovers(ctx context.Context, q *db.Queries, vehicle uuid.UUID) (db.MobilitySubscription, error) {
	s, err := q.ActiveSubscriptionCovering(ctx, vehicle)
	if database.IsNoRows(err) {
		return s, apperr.Conflict("PLAN_REQUIRED", "No active subscription covering this vehicle.")
	}
	if err != nil {
		return s, err
	}
	if s.SwapsAllowance != nil && s.SwapsUsed >= *s.SwapsAllowance {
		return s, apperr.Conflict("PLAN_EXHAUSTED", "Plan swap allowance exhausted.")
	}
	return s, nil
}
