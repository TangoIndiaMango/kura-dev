// Command worker runs Kura's periodic sweeps (Django's run_task_worker):
// unreturned packs, swap lifecycle, mock IoT, shift auto-close + cash
// settlement, subscriptions, scheduled price matrices, virtual-account
// retries and the daily credit jobs.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/app"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/jobs"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/config"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/logging"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "kura-worker:", err)
		os.Exit(1)
	}
}

func run() error {
	once := flag.Bool("once", false, "run one loop and exit")
	sleep := flag.Int("sleep", 15, "seconds between loops")
	only := flag.String("only", "", "comma-separated jobs to run (default: all); "+strings.Join(jobs.Order, ", "))
	asJSON := flag.Bool("json", false, "with --once: print each job's result as JSON")
	skip := map[string]*bool{}
	for _, name := range []string{"unreturned", "settlement", "subscriptions", "credit", "swaps", "mock-iot", "pricing"} {
		skip[name] = flag.Bool("no-"+name, false, "skip "+name)
	}
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		return err
	}
	log := logging.New(cfg.IsProduction(), cfg.Debug)
	slog.SetDefault(log)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	pool, err := database.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()
	runner := app.Worker(cfg, log, pool)

	enabled := map[string]bool{}
	for _, name := range jobs.Order {
		enabled[name] = true
	}
	if *only != "" {
		enabled = map[string]bool{}
		for _, n := range strings.Split(*only, ",") {
			enabled[strings.TrimSpace(n)] = true
		}
	}
	off := map[string][]string{"unreturned": {"unreturned"}, "settlement": {"shifts", "settlement"},
		"subscriptions": {"subscriptions"}, "credit": {"credit_scores", "credit_debit"}, "swaps": {"swaps"},
		"mock-iot": {"mock_iot"}, "pricing": {"pricing"}}
	for flagName, set := range skip {
		if *set {
			for _, n := range off[flagName] {
				delete(enabled, n)
			}
		}
	}
	if *once && *asJSON {
		out := map[string]any{}
		for _, name := range jobs.Order {
			if enabled[name] {
				res, err := runner.Run(ctx, name)
				if err != nil {
					return fmt.Errorf("%s: %w", name, err)
				}
				out[name] = res
			}
		}
		return json.NewEncoder(os.Stdout).Encode(out)
	}
	for {
		runner.Loop(ctx, enabled)
		if *once {
			return nil
		}
		select {
		case <-ctx.Done():
			return nil
		case <-time.After(time.Duration(max(1, *sleep)) * time.Second):
		}
	}
}
