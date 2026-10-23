// Package migrate owns the database schema: goose migrations embedded in
// the binary, a one-time baseline for databases Django created, and the
// demo seed for empty databases.
package migrate

import (
	"context"
	"database/sql"
	"fmt"
	stdlog "log"
	"log/slog"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib" // database/sql driver "pgx"
	"github.com/pressly/goose/v3"

	"github.com/TangoIndiaMango/kura-dev/backend/db"
)

// Baseline is the migration holding the schema inherited from Django.
const Baseline = 1

// Open connects with database/sql (goose's interface).
func Open(url string) (*sql.DB, error) { return sql.Open("pgx", url) }

func setup() error {
	goose.SetBaseFS(dbfs.Migrations)
	goose.SetLogger(goose.NopLogger())
	return goose.SetDialect("postgres")
}

func exists(ctx context.Context, conn *sql.DB, table string) (bool, error) {
	var ok bool
	err := conn.QueryRowContext(ctx, "SELECT to_regclass($1) IS NOT NULL", "public."+table).Scan(&ok)
	return ok, err
}

// adoptExisting marks the baseline as applied on a database whose schema
// Django already built (no goose table yet, but the tables are there).
func adoptExisting(ctx context.Context, conn *sql.DB, log *slog.Logger) error {
	hasGoose, err := exists(ctx, conn, "goose_db_version")
	if err != nil || hasGoose {
		return err
	}
	hasSchema, err := exists(ctx, conn, "accounts_user")
	if err != nil || !hasSchema {
		return err
	}
	if _, err := goose.EnsureDBVersionContext(ctx, conn); err != nil {
		return err
	}
	if _, err := conn.ExecContext(ctx,
		"INSERT INTO goose_db_version (version_id, is_applied) VALUES ($1, true)", Baseline); err != nil {
		return err
	}
	log.Info("migrate_baseline_adopted", "version", Baseline)
	return nil
}

// Up applies every pending migration.
func Up(ctx context.Context, conn *sql.DB, log *slog.Logger) error {
	if err := setup(); err != nil {
		return err
	}
	if err := adoptExisting(ctx, conn, log); err != nil {
		return fmt.Errorf("baseline: %w", err)
	}
	before, err := goose.GetDBVersionContext(ctx, conn)
	if err != nil {
		return err
	}
	if err := goose.UpContext(ctx, conn, "migrations"); err != nil {
		return err
	}
	after, err := goose.GetDBVersionContext(ctx, conn)
	if err == nil {
		log.Info("migrate_up", "from", before, "to", after)
	}
	return err
}

// Status prints applied / pending migrations.
func Status(ctx context.Context, conn *sql.DB) error {
	if err := setup(); err != nil {
		return err
	}
	goose.SetLogger(stdlog.New(os.Stdout, "", 0))
	return goose.StatusContext(ctx, conn, "migrations")
}

// Seed loads the demo dataset, only into a database with no users yet.
func Seed(ctx context.Context, conn *sql.DB, log *slog.Logger) error {
	var users int
	if err := conn.QueryRowContext(ctx, "SELECT count(*) FROM accounts_user").Scan(&users); err != nil {
		return fmt.Errorf("seed: run `migrate up` first: %w", err)
	}
	if users > 0 {
		log.Info("seed_skipped", "reason", "database already has users", "users", users)
		return nil
	}
	tx, err := conn.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck
	if _, err := tx.ExecContext(ctx, dbfs.Seed); err != nil {
		return fmt.Errorf("seed: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	log.Info("seed_loaded")
	return nil
}
