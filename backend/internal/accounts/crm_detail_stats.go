package accounts

import (
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/spend"
)

type dayMetric struct {
	Date      string  `json:"date"`
	Label     string  `json:"label"`
	Swaps     int32   `json:"swaps"`
	EnergyKWh float64 `json:"energy_kwh"`
	Target    int     `json:"target"`
}

type socSlice struct {
	Name  string `json:"name"`
	Value int32  `json:"value"`
	Color string `json:"color"`
}

type spendVehicle struct {
	VehicleID *string `json:"vehicle_id"`
	Plate     string  `json:"plate"`
	Swaps     int32   `json:"swaps"`
	Amount    int64   `json:"amount_kobo"`
}

type spendDriver struct {
	DriverID *string `json:"driver_id"`
	Name     string  `json:"name"`
	Swaps    int32   `json:"swaps"`
	Amount   int64   `json:"amount_kobo"`
}

// pyRound is Python's round(x, n): correctly rounded, ties to even.
func pyRound(x float64, n int) float64 {
	v, _ := strconv.ParseFloat(strconv.FormatFloat(x, 'f', n, 64), 64)
	return v
}

// detailStats is account_detail_stats: swaps, energy, SOC mix and spend for
// one account over a clamped window (default: 14 days ending today, UTC date).
func (h *AccountHandler) detailStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	row, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	now := time.Now()
	qv := r.URL.Query()
	start, end := spend.Window(qv.Get("start_date"), qv.Get("end_date"), spend.DateOf(now.UTC()))
	p := db.SwapTotalsParams{AccountID: row.ID, FromAt: start.Start(), ToAt: end.AddDays(1).Start()}

	t, err := h.q.SwapTotals(ctx, p)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	daily, err := h.q.SwapDaily(ctx, db.SwapDailyParams(p))
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	metrics, energy := []dayMetric{}, 0.0
	for _, d := range spend.Days(start, end) {
		m := dayMetric{Date: d.ISO(), Label: d.Label(), Target: 2}
		for _, x := range daily {
			if d.Equal(x.Day.Time) {
				m.Swaps, m.EnergyKWh = x.Swaps, pyRound(x.Energy, 1)
			}
		}
		energy += m.EnergyKWh
		metrics = append(metrics, m)
	}
	vehicles, err := h.q.SwapByVehicleTop(ctx, db.SwapByVehicleTopParams(p))
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	byVehicle := []spendVehicle{}
	for _, v := range vehicles {
		id := v.VehicleID.String()
		byVehicle = append(byVehicle, spendVehicle{VehicleID: &id, Plate: spend.OrDash(v.Plate), Swaps: v.Swaps, Amount: v.Fees})
	}
	drivers, err := h.q.SwapByDriverTop(ctx, db.SwapByDriverTopParams(p))
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	byDriver := []spendDriver{}
	for _, d := range drivers {
		id := d.DriverID.String()
		byDriver = append(byDriver, spendDriver{DriverID: &id,
			Name: spend.DriverName(d.FirstName, d.LastName, d.Phone), Swaps: d.Swaps, Amount: d.Fees})
	}
	counts, err := h.q.AccountChildCounts(ctx, row.ID)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	money, err := spend.FleetMoney(ctx, h.q, row.ID, start.ISO(), end.ISO(), now)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	days := start.DaysUntil(end) + 1
	respond.OK(w, map[string]any{
		"status": row.Status, "kyc_status": row.KycStatus,
		"drivers_count": counts.Drivers, "vehicles_count": counts.Vehicles, "identity_docs_count": counts.Docs,
		"swaps_count": t.Swaps, "swaps_per_day": pyRound(float64(t.Swaps)/float64(days), 1),
		"energy_kwh_total":      pyRound(energy, 1),
		"fuel_saved_kobo":       h.petrol.FuelSavedKobo(int64(t.Swaps)),
		"petrol_kobo_per_litre": h.petrol.KoboPerLitre,
		"avg_returned_soc":      pyRound(t.AvgSoc, 1),
		"soc_distribution": []socSlice{{"Optimal (>20%)", t.Optimal, "#0D7C8F"},
			{"Adequate (12–20%)", t.Adequate, "#4FC3F7"}, {"Critical (<12%)", t.Critical, "#E74C3C"}},
		"daily_metrics": metrics, "start_date": start.ISO(), "end_date": end.ISO(),
		"spend_amount_kobo": t.Spend, "spend_by_vehicle": byVehicle, "spend_by_driver": byDriver,
		"money": money,
	})
}

// fleetSpend is MeFleetSpendView: the caller's first owned account only
// (peer drivers on a fleet must not see fleet totals).
func (h *AccountHandler) fleetSpend(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid, _ := uuid.Parse(reqctx.User(ctx).UserID)
	acct, err := h.q.FirstOwnedAccount(ctx, uid)
	if database.IsNoRows(err) {
		err = apperr.New("FORBIDDEN", "Only the account owner can view fleet spend.").WithStatus(http.StatusForbidden)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	qv := r.URL.Query()
	money, err := spend.FleetMoney(ctx, h.q, acct.ID, qv.Get("start_date"), qv.Get("end_date"), time.Now())
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, money)
}

// impact is MeImpactView: the savings estimate for the caller's account.
func (h *AccountHandler) impact(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid, _ := uuid.Parse(reqctx.User(ctx).UserID)
	own, err := ownAccountIDs(ctx, h.q, uid)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	if len(own) == 0 {
		respond.OK(w, spend.NoImpact())
		return
	}
	out, err := spend.AccountImpact(ctx, h.q, own[0], h.petrol, time.Now())
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, out)
}
