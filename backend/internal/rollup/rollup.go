// Package rollup keeps the per-day report tables (analytics_dailymoney,
// analytics_dailyswaps, analytics_dailyhubmetric, analytics_dailyaccount) in
// step with payments and swaps, so reports add up a few rows per day instead
// of scanning history.
//
// Each run replaces the most recent days (late payment statuses still land)
// and then walks backwards through older days in small chunks until it
// reaches the first payment or swap. Runs are serialised by an advisory lock
// and only ever write the rollup tables. The API keeps them current itself
// (Keep); the worker's "rollups" job does the same where one is deployed.
package rollup

import (
	"context"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
)

const (
	stateName = "daily"
	// SettleDays are recomputed on every run: today and the days whose
	// payments can still change status.
	SettleDays = 3
	// backfillChunk is how many older days one run fills.
	backfillChunk = 14
	// minGap spaces runs out; the worker loop ticks far more often.
	minGap = 10 * time.Minute
	// statementTimeout bounds each fill so a huge day can never pin the worker.
	statementTimeout = "120s"
)

var lagos, _ = time.LoadLocation("Africa/Lagos")

// Day is a Lagos calendar day at midnight.
func Day(t time.Time) time.Time {
	t = t.In(lagos)
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, lagos)
}

// Run refreshes the rollups. The recent days are rebuilt at most every
// minGap (force skips the gap, for `worker --once`); while history is still
// being backfilled, each run also fills the next older chunk, so callers can
// run back to back until out["complete"] is true. Another run holding the
// lock makes this one a no-op.
func Run(ctx context.Context, pool *pgxpool.Pool, force bool) (map[string]any, error) {
	out := map[string]any{}
	err := database.InTx(ctx, pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		locked, err := q.RollupTryLock(ctx)
		if err != nil || !locked {
			out["skipped"] = "busy"
			return err
		}
		if _, err := tx.Exec(ctx, "SET LOCAL statement_timeout = '"+statementTimeout+"'"); err != nil {
			return err
		}
		st, err := q.RollupState(ctx, stateName)
		if err != nil && !database.IsNoRows(err) {
			return err
		}
		fresh := err == nil
		first, err := q.FirstActivityDay(ctx)
		if err != nil {
			return err
		}
		floor := Day(first)
		today := Day(time.Now())
		settleFrom := today.AddDate(0, 0, -(SettleDays - 1))
		// done is the oldest day already rolled up.
		done := settleFrom
		if fresh && st.BackfilledFrom.Valid {
			d := st.BackfilledFrom.Time
			done = time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, lagos)
		}
		backfilling := done.After(floor)
		settle := !fresh || force || time.Since(st.LastRunAt) >= minGap
		if !settle && !backfilling {
			out["skipped"], out["complete"] = "recent", true
			return nil
		}
		if settle {
			if err := fill(ctx, q, settleFrom, today, out); err != nil {
				return err
			}
		}
		if backfilling {
			to := done.AddDate(0, 0, -1)
			from := to.AddDate(0, 0, -(backfillChunk - 1))
			if from.Before(floor) {
				from = floor
			}
			if err := fill(ctx, q, from, to, out); err != nil {
				return err
			}
			done = from
		}
		out["backfilled_from"], out["complete"] = done.Format(time.DateOnly), !done.After(floor)
		return q.SaveRollupState(ctx, db.SaveRollupStateParams{Name: stateName, BackfilledFrom: date(done)})
	})
	return out, err
}

// Keep runs rollups for as long as ctx lives, so reports stay current even
// where no separate worker is deployed: back to back while history is
// backfilling, then a check every minute (Run itself spaces real refreshes
// by minGap, and the advisory lock lets the API and a worker both call it).
func Keep(ctx context.Context, pool *pgxpool.Pool, log *slog.Logger) {
	wait := time.Duration(0)
	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(wait):
		}
		out, err := Run(ctx, pool, false)
		switch {
		case err != nil:
			log.Error("rollup_failed", "err", err)
			wait = time.Minute
		case out["complete"] == false:
			log.Info("rollup_backfill", "result", out)
			wait = time.Second
		default:
			if out["skipped"] == nil {
				log.Info("rollup_done", "result", out)
			}
			wait = time.Minute
		}
	}
}

// fill replaces [from, to] in every rollup table.
func fill(ctx context.Context, q *db.Queries, from, to time.Time, out map[string]any) error {
	f, t := date(from), date(to)
	if err := q.ClearDailyMoney(ctx, db.ClearDailyMoneyParams{FromDay: f, ToDay: t}); err != nil {
		return err
	}
	money, err := q.FillDailyMoney(ctx, db.FillDailyMoneyParams{FromDay: f, ToDay: t})
	if err != nil {
		return err
	}
	if err := q.ClearDailySwaps(ctx, db.ClearDailySwapsParams{FromDay: f, ToDay: t}); err != nil {
		return err
	}
	swaps, err := q.FillDailySwaps(ctx, db.FillDailySwapsParams{FromDay: f, ToDay: t})
	if err != nil {
		return err
	}
	if err := q.ClearDailyHubMetrics(ctx, db.ClearDailyHubMetricsParams{FromDay: f, ToDay: t}); err != nil {
		return err
	}
	hubs, err := q.FillDailyHubMetrics(ctx, db.FillDailyHubMetricsParams{FromDay: f, ToDay: t})
	if err != nil {
		return err
	}
	if err := q.ClearDailyAccounts(ctx, db.ClearDailyAccountsParams{FromDay: f, ToDay: t}); err != nil {
		return err
	}
	accounts, err := q.FillDailyAccounts(ctx, db.FillDailyAccountsParams{FromDay: f, ToDay: t})
	if err != nil {
		return err
	}
	add := func(k string, n int64) {
		v, _ := out[k].(int64)
		out[k] = v + n
	}
	add("money_rows", money)
	add("swap_rows", swaps)
	add("hub_rows", hubs)
	add("account_rows", accounts)
	return nil
}

// date is a Lagos day as a SQL date.
func date(t time.Time) pgtype.Date {
	return pgtype.Date{Time: time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC), Valid: true}
}
