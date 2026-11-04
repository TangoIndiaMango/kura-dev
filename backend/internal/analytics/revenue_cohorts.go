package analytics

import (
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/rollup"
)

// Cohorts, ARPU and retention read the per-account daily rollup, never raw
// payments, inside a read-only transaction.
const cohortTimeout = 8 * time.Second

func monthStart(t time.Time) pgtype.Date {
	return pgtype.Date{Time: time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC), Valid: true}
}

func monthKey(d pgtype.Date) string { return d.Time.Format("2006-01") }

func monthsBetween(a, b pgtype.Date) int {
	return (b.Time.Year()-a.Time.Year())*12 + int(b.Time.Month()) - int(a.Time.Month())
}

// revenueCohorts is GET /analytics/revenue/cohorts/?months=6 (1–12): each
// joining month's riders, how many were active in each month after, what
// they paid, and ARPU per month.
func (h *handler) revenueCohorts(w http.ResponseWriter, r *http.Request) {
	months := 6
	if n, err := strconv.Atoi(r.URL.Query().Get("months")); err == nil {
		months = min(12, max(1, n))
	}
	today := rollup.Day(time.Now())
	from := monthStart(today.AddDate(0, -(months - 1), 0))
	type cell struct {
		Offset   int   `json:"offset"`
		Active   int32 `json:"active"`
		PaidKobo int64 `json:"paid_kobo"`
	}
	type cohort struct {
		Cohort string `json:"cohort"`
		Riders int32  `json:"riders"`
		Months []cell `json:"months"`
	}
	type arpu struct {
		Month        string `json:"month"`
		ActiveRiders int32  `json:"active_riders"`
		PaidKobo     int64  `json:"paid_kobo"`
		ArpuKobo     int64  `json:"arpu_kobo"`
	}
	cohorts, trend := []cohort{}, []arpu{}
	err := database.ReadOnly(r.Context(), h.pool, cohortTimeout, func(tx pgx.Tx) error {
		q := db.New(tx)
		sizes, err := q.CohortSizes(r.Context(), from)
		if err != nil {
			return err
		}
		activity, err := q.CohortActivity(r.Context(), from)
		if err != nil {
			return err
		}
		idx := map[string]int{}
		for _, s := range sizes {
			idx[monthKey(s.Cohort)] = len(cohorts)
			cohorts = append(cohorts, cohort{Cohort: monthKey(s.Cohort), Riders: s.Riders, Months: []cell{}})
		}
		for _, a := range activity {
			if i, ok := idx[monthKey(a.Cohort)]; ok {
				cohorts[i].Months = append(cohorts[i].Months,
					cell{Offset: monthsBetween(a.Cohort, a.Month), Active: a.Active, PaidKobo: a.PaidKobo})
			}
		}
		rows, err := q.MonthlyArpu(r.Context(), from)
		for _, m := range rows {
			a := arpu{Month: monthKey(m.Month), ActiveRiders: m.ActiveRiders, PaidKobo: m.PaidKobo}
			if m.ActiveRiders > 0 {
				a.ArpuKobo = m.PaidKobo / int64(m.ActiveRiders)
			}
			trend = append(trend, a)
		}
		return err
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, map[string]any{"from_month": monthKey(from), "cohorts": cohorts, "arpu": trend})
}

// revenueRetention is GET /analytics/revenue/retention/: rider churn over
// the last 30 days against the 30 before, plan renewals, and plan money.
func (h *handler) revenueRetention(w http.ResponseWriter, r *http.Request) {
	today := rollup.Day(time.Now())
	day := pgtype.Date{Time: time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, time.UTC), Valid: true}
	out := map[string]any{}
	err := database.ReadOnly(r.Context(), h.pool, cohortTimeout, func(tx pgx.Tx) error {
		q := db.New(tx)
		ret, err := q.RiderRetention(r.Context(), day)
		if err != nil {
			return err
		}
		plans, err := q.PlanRenewals(r.Context())
		if err != nil {
			return err
		}
		pct := func(a, b int32) any {
			if b == 0 {
				return nil
			}
			return float64(a) * 100 / float64(b)
		}
		out["active_riders"], out["active_riders_before"], out["churned_riders"] = ret.ActiveNow, ret.ActiveBefore, ret.Churned
		out["churn_pct"] = pct(ret.Churned, ret.ActiveBefore)
		out["plans_ended"], out["plans_renewed"], out["active_plans"] = plans.Ended, plans.Renewed, plans.ActivePlans
		out["renewal_pct"] = pct(plans.Renewed, plans.Ended)
		return nil
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, out)
}
