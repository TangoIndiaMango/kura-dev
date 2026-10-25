// Command migrate manages the database schema and demo data.
//
//	migrate up              apply pending migrations (adopts Django-built databases)
//	migrate status          list applied / pending migrations
//	migrate seed            load DEMO data into an empty database (never in production)
//	migrate bootstrap [--admin-email E --first-name F --last-name L --phone P]
//	                        production data: permissions, roles, grants (every deploy);
//	                        with --admin-email, the first super admin + a set-password link
//	migrate reset DBNAME    DELETE all tables and data (type the database name to confirm)
//	migrate create NAME     new SQL migration in db/migrations (run from backend/)
package main

import (
	"context"
	"database/sql"
	"flag"
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
		return fmt.Errorf("usage: migrate up | status | seed | bootstrap [--admin-email E] | reset DBNAME | create NAME")
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
	case "bootstrap":
		return bootstrap(ctx, conn, log, os.Args[2:])
	case "reset":
		confirm := ""
		if len(os.Args) > 2 {
			confirm = os.Args[2]
		}
		return migrate.Reset(ctx, conn, log, confirm)
	}
	return fmt.Errorf("unknown command %q", os.Args[1])
}

// bootstrap: reference data on every deploy; the first super admin once.
func bootstrap(ctx context.Context, conn *sql.DB, log *slog.Logger, args []string) error {
	fs := flag.NewFlagSet("bootstrap", flag.ContinueOnError)
	in := migrate.BootstrapAdmin{}
	fs.StringVar(&in.Email, "admin-email", "", "first super admin's email (skipped if one exists)")
	fs.StringVar(&in.FirstName, "first-name", "", "first name")
	fs.StringVar(&in.LastName, "last-name", "", "last name")
	fs.StringVar(&in.Phone, "phone", "", "phone (+234…), optional")
	if err := fs.Parse(args); err != nil {
		return err
	}
	in.Pepper = []byte(os.Getenv("OTP_PEPPER"))
	if len(in.Pepper) == 0 {
		in.Pepper = []byte(os.Getenv("DJANGO_SECRET_KEY"))
	}
	in.AdminURL = os.Getenv("FRONTEND_ADMIN_URL")
	link, err := migrate.Bootstrap(ctx, conn, log, in)
	if err != nil {
		return err
	}
	if link != "" {
		// Printed once to the operator's terminal, never logged: it sets the admin's password.
		fmt.Printf("\nSuper admin created. Open this link within 72 hours to set the password:\n\n  %s\n\n", link)
	}
	return nil
}
