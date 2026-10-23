// Command migrate manages the database schema and demo data.
//
//	migrate up              apply pending migrations (adopts Django-built databases)
//	migrate status          list applied / pending migrations
//	migrate seed            load demo data into an empty database
//	migrate create NAME     new SQL migration in db/migrations (run from backend/)
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/pressly/goose/v3"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/migrate"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/logging"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "kura-migrate:", err)
		os.Exit(1)
	}
}

func run() error {
	if len(os.Args) < 2 {
		return fmt.Errorf("usage: migrate up | status | seed | create NAME")
	}
	if os.Args[1] == "create" {
		if len(os.Args) < 3 {
			return fmt.Errorf("usage: migrate create NAME")
		}
		goose.SetSequential(true)
		return goose.Create(nil, "db/migrations", os.Args[2], "sql")
	}
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	log := logging.New(os.Getenv("KURA_ENV") == "production" || os.Getenv("KURA_ENV") == "staging", false)
	slog.SetDefault(log)
	conn, err := migrate.Open(url)
	if err != nil {
		return err
	}
	defer conn.Close()
	ctx := context.Background()
	switch os.Args[1] {
	case "up":
		return migrate.Up(ctx, conn, log)
	case "status":
		return migrate.Status(ctx, conn)
	case "seed":
		return migrate.Seed(ctx, conn, log)
	}
	return fmt.Errorf("unknown command %q", os.Args[1])
}
