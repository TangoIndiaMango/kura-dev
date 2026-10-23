package testkit

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/auth"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
)

// User describes a row for accounts_user. Zero values get sensible defaults.
type User struct {
	ID          uuid.UUID
	Email       string
	Phone       string
	Role        string // default DRIVER
	Password    string // raw; hashed with the Django-compatible hasher
	PIN         string // raw 4 digits; hashed
	IsStaff     bool
	IsSuperuser bool
	Inactive    bool
	FirstName   string
	LastName    string
	Onboarding  string // default "home"
	Prefs       string // JSON, default {}
}

// CreateUser inserts a user (Django sets no DB defaults, so every NOT NULL
// column is written here) and returns its id.
func CreateUser(t *testing.T, pool *pgxpool.Pool, u User) uuid.UUID {
	t.Helper()
	if u.ID == uuid.Nil {
		u.ID = ids.New()
	}
	password := "!" // Django's unusable password marker
	if u.Password != "" {
		password = mustHash(t, u.Password)
	}
	pin := ""
	if u.PIN != "" {
		pin = mustHash(t, u.PIN)
	}
	_, err := pool.Exec(context.Background(), `
		INSERT INTO accounts_user (id, created_at, updated_at, password, is_superuser,
			email, phone, first_name, last_name, role, pin_hash, is_active, is_staff,
			pin_failed_attempts, onboarding_step, notification_prefs, session_version)
		VALUES ($1, now(), now(), $2, $3, NULLIF($4,''), NULLIF($5,''), $6, $7, $8, $9,
			$10, $11, 0, $12, $13::jsonb, 0)`,
		u.ID, password, u.IsSuperuser, u.Email, u.Phone, u.FirstName, u.LastName,
		def(u.Role, "DRIVER"), pin, !u.Inactive, u.IsStaff, def(u.Onboarding, "home"),
		def(u.Prefs, "{}"))
	if err != nil {
		t.Fatalf("testkit: create user: %v", err)
	}
	return u.ID
}

// Count returns SELECT count(*) for a query (handy assertions).
func Count(t *testing.T, pool *pgxpool.Pool, sql string, args ...any) int {
	t.Helper()
	var n int
	if err := pool.QueryRow(context.Background(), sql, args...).Scan(&n); err != nil {
		t.Fatalf("testkit: count: %v", err)
	}
	return n
}

func mustHash(t *testing.T, raw string) string {
	t.Helper()
	h, err := auth.MakePassword(raw)
	if err != nil {
		t.Fatal(err)
	}
	return h
}

func def(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}
