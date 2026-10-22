package spend

import (
	"context"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
)

type MoneyTotals struct {
	Swaps        int32 `json:"swaps"`
	SwapFees     int64 `json:"swap_fees_kobo"`
	PlanFees     int64 `json:"plan_fees_kobo"`
	Total        int64 `json:"total_kobo"`
	AvgPerDayKob int64 `json:"avg_per_day_kobo"`
}

type MoneyDay struct {
	Date     string `json:"date"`
	Swaps    int32  `json:"swaps"`
	SwapFees int64  `json:"swap_fees_kobo"`
	PlanFees int64  `json:"plan_fees_kobo"`
	Total    int64  `json:"total_kobo"`
}

type MoneyVehicle struct {
	VehicleID *string `json:"vehicle_id"`
	Plate     string  `json:"plate"`
	Swaps     int32   `json:"swaps"`
	SwapFees  int64   `json:"swap_fees_kobo"`
	PlanFees  int64   `json:"plan_fees_kobo"`
	Total     int64   `json:"total_kobo"`
}

type MoneyDriver struct {
	DriverID *string `json:"driver_id"`
	Name     string  `json:"name"`
	Swaps    int32   `json:"swaps"`
	SwapFees int64   `json:"swap_fees_kobo"`
}

type ModeRow struct {
	Mode   string `json:"mode"`
	Swaps  int32  `json:"swaps"`
	Amount int64  `json:"amount_kobo"`
}

type DriverToday struct {
	DriverID            string `json:"driver_id"`
	Name                string `json:"name"`
	Swaps               int32  `json:"swaps"`
	Spend               int64  `json:"spend_kobo"`
	DailySwapLimit      *int16 `json:"daily_swap_limit"`
	DailySpendKoboLimit *int64 `json:"daily_spend_kobo_limit"`
}

// Money is fleet_money_breakdown.
type Money struct {
	StartDate    string         `json:"start_date"`
	EndDate      string         `json:"end_date"`
	Totals       MoneyTotals    `json:"totals"`
	Daily        []MoneyDay     `json:"daily"`
	ByVehicle    []MoneyVehicle `json:"by_vehicle"`
	ByDriver     []MoneyDriver  `json:"by_driver"`
	ByMode       []ModeRow      `json:"by_payment_mode"`
	DriversToday []DriverToday  `json:"drivers_today"`
}

// DriverName is _driver_name: "First Last", else the phone, else "—".
func DriverName(first, last string, phone *string) string {
	if n := strings.TrimSpace(strings.TrimSpace(first) + " " + strings.TrimSpace(last)); n != "" {
		return n
	}
	if phone != nil && *phone != "" {
		return *phone
	}
	return "—"
}

func idStr(id uuid.UUID) *string { s := id.String(); return &s }

// FleetMoney is fleet_money_breakdown: swap fees (COMPLETED swaps) plus plan
// fees (SUCCESS PLAN payments) per hub-local day, vehicle, driver and mode.
func FleetMoney(ctx context.Context, q *db.Queries, account uuid.UUID, startRaw, endRaw string, now time.Time) (Money, error) {
	start, end := Window(startRaw, endRaw, LagosToday(now))
	from, to := start.Start(), end.AddDays(1).Start()
	m := Money{StartDate: start.ISO(), EndDate: end.ISO(), Daily: []MoneyDay{}, ByVehicle: []MoneyVehicle{},
		ByDriver: []MoneyDriver{}, ByMode: []ModeRow{}}

	daily, err := q.SwapDaily(ctx, db.SwapDailyParams{AccountID: account, FromAt: from, ToAt: to})
	if err != nil {
		return m, err
	}
	plans, err := q.PlanFeesDaily(ctx, db.PlanFeesDailyParams{AccountID: account, FromAt: from, ToAt: to})
	if err != nil {
		return m, err
	}
	for _, d := range Days(start, end) {
		day := MoneyDay{Date: d.ISO()}
		for _, r := range daily {
			if d.Equal(r.Day.Time) {
				day.Swaps, day.SwapFees = r.Swaps, r.Fees
			}
		}
		for _, p := range plans {
			if d.Equal(p.Day.Time) {
				day.PlanFees = p.Fees
			}
		}
		day.Total = day.SwapFees + day.PlanFees
		m.Daily = append(m.Daily, day)
		m.Totals.Swaps += day.Swaps
		m.Totals.SwapFees += day.SwapFees
		m.Totals.PlanFees += day.PlanFees
	}
	m.Totals.Total = m.Totals.SwapFees + m.Totals.PlanFees
	m.Totals.AvgPerDayKob = m.Totals.Total / int64(max(1, len(m.Daily)))

	if m.ByVehicle, err = moneyByVehicle(ctx, q, account, from, to); err != nil {
		return m, err
	}
	drivers, err := q.SwapByDriver(ctx, db.SwapByDriverParams{AccountID: account, FromAt: from, ToAt: to})
	if err != nil {
		return m, err
	}
	for _, r := range drivers {
		m.ByDriver = append(m.ByDriver, MoneyDriver{DriverID: idStr(r.DriverID),
			Name: DriverName(r.FirstName, r.LastName, r.Phone), Swaps: r.Swaps, SwapFees: r.Fees})
	}
	modes, err := q.SwapByMode(ctx, db.SwapByModeParams{AccountID: account, FromAt: from, ToAt: to})
	if err != nil {
		return m, err
	}
	for _, r := range modes {
		m.ByMode = append(m.ByMode, ModeRow{Mode: r.PaymentMode, Swaps: r.Swaps, Amount: r.Fees})
	}
	m.DriversToday, err = DriversToday(ctx, q, account, now)
	return m, err
}

// moneyByVehicle joins swap fees and plan fees per vehicle; vehicles that
// only bought a plan are appended, then everything sorts by total (stable).
func moneyByVehicle(ctx context.Context, q *db.Queries, account uuid.UUID, from, to time.Time) ([]MoneyVehicle, error) {
	swaps, err := q.SwapByVehicle(ctx, db.SwapByVehicleParams{AccountID: account, FromAt: from, ToAt: to})
	if err != nil {
		return nil, err
	}
	plans, err := q.PlanFeesByVehicle(ctx, db.PlanFeesByVehicleParams{AccountID: account, FromAt: from, ToAt: to})
	if err != nil {
		return nil, err
	}
	used := make([]bool, len(plans))
	out := make([]MoneyVehicle, 0, len(swaps)+len(plans))
	for _, r := range swaps {
		v := MoneyVehicle{VehicleID: idStr(r.VehicleID), Plate: OrDash(r.Plate), Swaps: r.Swaps, SwapFees: r.Fees}
		for i, p := range plans {
			if !used[i] && p.VehicleID != nil && *p.VehicleID == r.VehicleID {
				used[i], v.PlanFees = true, p.Fees
			}
		}
		v.Total = v.SwapFees + v.PlanFees
		out = append(out, v)
	}
	for i, p := range plans {
		if used[i] {
			continue
		}
		v := MoneyVehicle{Plate: "Not linked to a vehicle", PlanFees: p.Fees, Total: p.Fees}
		if p.VehicleID != nil {
			v.VehicleID, v.Plate = idStr(*p.VehicleID), "—"
			if p.Plate != nil {
				v.Plate = *p.Plate
			}
		}
		out = append(out, v)
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Total > out[j].Total })
	return out, nil
}

// DriversToday is drivers_usage_today: each driver's swaps / spend so far
// today (hub-local day) next to their soft caps.
func DriversToday(ctx context.Context, q *db.Queries, account uuid.UUID, now time.Time) ([]DriverToday, error) {
	today := LagosToday(now)
	from, to := today.Start(), today.AddDays(1).Start()
	usage, err := q.DriverUsage(ctx, db.DriverUsageParams{AccountID: account, FromAt: from, ToAt: to})
	if err != nil {
		return nil, err
	}
	used := make(map[uuid.UUID]db.DriverUsageRow, len(usage))
	for _, u := range usage {
		used[u.DriverID] = u
	}
	rows, err := q.AccountDriversWithUser(ctx, account)
	if err != nil {
		return nil, err
	}
	out := make([]DriverToday, 0, len(rows))
	for _, r := range rows {
		u := used[r.ID]
		out = append(out, DriverToday{DriverID: r.ID.String(), Name: DriverName(r.FirstName, r.LastName, r.Phone),
			Swaps: u.Swaps, Spend: u.Fees, DailySwapLimit: r.DailySwapLimit, DailySpendKoboLimit: r.DailySpendKoboLimit})
	}
	return out, nil
}

// OrDash shows "—" for an empty label.
func OrDash(s string) string {
	if s == "" {
		return "—"
	}
	return s
}
