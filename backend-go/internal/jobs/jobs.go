// Package jobs ports core.management.commands.run_task_worker: the periodic
// sweeps (unreturned packs, swap lifecycle, mock IoT, shifts + settlement,
// subscriptions, price matrices, virtual accounts, daily credit jobs).
package jobs

import (
	"context"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/credit"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/integrations/va"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/mail"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/mobility"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/operations"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/telemetry"
)

// Order is the run order of one loop (run_task_worker's enqueue order).
var Order = []string{"unreturned", "swaps", "mock_iot", "shifts", "settlement", "subscriptions", "pricing",
	"virtual_accounts", "credit_scores", "credit_debit"}

// Runner holds what the sweeps need.
type Runner struct {
	Pool    *pgxpool.Pool
	Log     *slog.Logger
	Mailer  *mail.Mailer
	VA      *va.Service
	Billing *mobility.Billing
	MockIoT bool
	// daily remembers the UTC day a once-a-day job last ran (Django keys
	// this in the cache with cache.add; one worker process here).
	daily map[string]string
}

// Run executes one named job and returns its summary.
func (r *Runner) Run(ctx context.Context, name string) (map[string]any, error) {
	switch name {
	case "unreturned":
		return mobility.FlagUnreturned(ctx, r.Pool, r.Mailer, 200)
	case "swaps":
		return mobility.SweepSwapLifecycle(ctx, r.Pool, r.Log, 200, 100)
	case "mock_iot":
		return telemetry.MockTick(ctx, r.Pool, r.MockIoT, 200)
	case "shifts":
		return operations.AutoCloseShifts(ctx, r.Pool)
	case "settlement":
		return operations.SettlementSweep(ctx, r.Pool, 12)
	case "subscriptions":
		return r.subscriptions(ctx)
	case "pricing":
		return mobility.ActivateDueMatrices(ctx, r.Pool, r.Log, 100)
	case "virtual_accounts":
		res, err := r.VA.RetryPending(ctx, 50)
		return map[string]any{"retried": res.Retried, "assigned": res.Assigned, "gave_up": res.GaveUp}, err
	case "credit_scores":
		return credit.RecomputeScores(ctx, r.Pool, 200)
	case "credit_debit":
		return credit.AutoDebitLoans(ctx, r.Pool, r.Log, 200)
	}
	return nil, nil
}

// subscriptions is renew_subscriptions_task: expire, renew, then warn.
func (r *Runner) subscriptions(ctx context.Context) (map[string]any, error) {
	out := map[string]any{}
	for _, step := range []func() (map[string]any, error){
		func() (map[string]any, error) { return r.Billing.ExpireDueSubscriptions(ctx, r.Log, 100) },
		func() (map[string]any, error) { return r.Billing.RenewDueSubscriptions(ctx, r.Log, 100) },
		func() (map[string]any, error) { return r.Billing.NotifyPriceChange(ctx, 24*time.Hour, 100) },
	} {
		res, err := step()
		if err != nil {
			return out, err
		}
		for k, v := range res {
			out[k] = v
		}
	}
	return out, nil
}

// Loop runs the enabled jobs once (credit jobs at most once a UTC day),
// logging each summary; a failing job is logged and the loop moves on.
func (r *Runner) Loop(ctx context.Context, enabled map[string]bool) {
	if r.daily == nil {
		r.daily = map[string]string{}
	}
	day := time.Now().UTC().Format("2006-01-02")
	for _, name := range Order {
		if !enabled[name] {
			continue
		}
		if name == "credit_scores" || name == "credit_debit" {
			if r.daily[name] == day {
				continue
			}
			r.daily[name] = day
		}
		start := time.Now()
		res, err := r.Run(ctx, name)
		if err != nil {
			r.Log.Error("job_failed", "job", name, "err", err)
			continue
		}
		r.Log.Info("job_done", "job", name, "result", res, "ms", time.Since(start).Milliseconds())
	}
}
