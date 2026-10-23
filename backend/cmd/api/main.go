// Command api runs the Kura HTTP API.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/app"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/config"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/logging"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "kura-api:", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	log := logging.New(cfg.IsProduction(), cfg.Debug)
	slog.SetDefault(log)
	cfg.LogWarnings(log)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := database.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           app.Build(cfg, log, pool),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       60 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	errs := make(chan error, 1)
	go func() {
		log.Info("listening", "addr", srv.Addr, "env", cfg.Env)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errs <- err
		}
		close(errs)
	}()

	select {
	case err := <-errs:
		return err
	case <-ctx.Done():
	}
	log.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()
	return srv.Shutdown(shutdownCtx)
}
