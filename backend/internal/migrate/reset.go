package migrate

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
)

// Reset drops every table and all data (the whole public schema, including
// goose's history) so `migrate up` and `migrate seed` can rebuild from
// scratch. confirm must equal the connected database's name — a typed
// safeguard against wiping the wrong database. Cannot be undone.
func Reset(ctx context.Context, conn *sql.DB, log *slog.Logger, confirm string) error {
	var name string
	if err := conn.QueryRowContext(ctx, "SELECT current_database()").Scan(&name); err != nil {
		return err
	}
	if confirm != name {
		return fmt.Errorf("refusing to reset: this deletes ALL data in database %q — run `migrate reset %s` to confirm",
			name, name)
	}
	var tables int
	if err := conn.QueryRowContext(ctx,
		"SELECT count(*) FROM pg_tables WHERE schemaname = 'public'").Scan(&tables); err != nil {
		return err
	}
	if _, err := conn.ExecContext(ctx, "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"); err != nil {
		return fmt.Errorf("reset: %w", err)
	}
	log.Warn("database_reset", "database", name, "tables_dropped", tables)
	return nil
}
