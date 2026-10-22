// Package testkit gives tests a real Postgres with the Django schema.
//
// The database (default kura_go_test) is created from db/schema.sql once per
// test binary; every test starts from empty tables. Set TEST_DATABASE_URL to
// point elsewhere. Tests skip (not fail) when Postgres is unreachable.
package testkit

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const defaultURL = "postgres://kura:kura_dev_password@127.0.0.1:5432/kura_go_test"

var (
	once    sync.Once
	pool    *pgxpool.Pool
	tables  []string
	initErr error
)

// DB returns the shared pool with every table truncated.
func DB(t *testing.T) *pgxpool.Pool {
	t.Helper()
	once.Do(func() { initErr = setup(context.Background()) })
	if initErr != nil {
		t.Skipf("testkit: postgres unavailable: %v", initErr)
	}
	if len(tables) > 0 {
		sql := "TRUNCATE " + strings.Join(tables, ", ") + " RESTART IDENTITY CASCADE"
		if _, err := pool.Exec(context.Background(), sql); err != nil {
			t.Fatalf("testkit: truncate: %v", err)
		}
	}
	return pool
}

func setup(ctx context.Context) error {
	target := os.Getenv("TEST_DATABASE_URL")
	if target == "" {
		target = defaultURL
	}
	u, err := url.Parse(target)
	if err != nil {
		return err
	}
	// One database per test binary: packages run in parallel.
	name := strings.TrimPrefix(u.Path, "/") + "_" + binarySuffix()
	u.Path = "/" + name
	target = u.String()
	if err := recreate(ctx, u, name); err != nil {
		return err
	}
	if pool, err = pgxpool.New(ctx, target); err != nil {
		return err
	}
	schema, err := os.ReadFile(schemaPath())
	if err != nil {
		return err
	}
	// pg_dump empties search_path for its session; keep ours on public.
	ddl := strings.Replace(string(schema),
		"SELECT pg_catalog.set_config('search_path', '', false);", "", 1)
	if _, err := pool.Exec(ctx, ddl); err != nil {
		return fmt.Errorf("load schema: %w", err)
	}
	rows, err := pool.Query(ctx,
		`SELECT quote_ident(tablename) FROM pg_tables WHERE schemaname = 'public'`)
	if err != nil {
		return err
	}
	tables, err = pgx.CollectRows(rows, pgx.RowTo[string])
	return err
}

// recreate drops and creates the test database through the maintenance db.
func recreate(ctx context.Context, u *url.URL, name string) error {
	admin := *u
	admin.Path = "/postgres"
	conn, err := pgx.Connect(ctx, admin.String())
	if err != nil {
		return err
	}
	defer conn.Close(ctx)
	ident := pgx.Identifier{name}.Sanitize()
	if _, err := conn.Exec(ctx, "DROP DATABASE IF EXISTS "+ident+" WITH (FORCE)"); err != nil {
		return err
	}
	_, err = conn.Exec(ctx, "CREATE DATABASE "+ident)
	return err
}

// binarySuffix turns the test binary name ("events.test") into "events".
func binarySuffix() string {
	base := strings.TrimSuffix(filepath.Base(os.Args[0]), ".test")
	var b strings.Builder
	for _, r := range strings.ToLower(base) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		}
	}
	if b.Len() == 0 {
		return "pkg"
	}
	return b.String()
}

// schemaPath finds db/schema.sql relative to this source file.
func schemaPath() string {
	_, file, _, _ := runtime.Caller(0)
	return filepath.Join(filepath.Dir(file), "..", "..", "db", "schema.sql")
}
