package migrate

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"math/big"
	"net/url"
	"strings"
	"time"

	dbfs "github.com/TangoIndiaMango/kura-dev/backend/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
)

// BootstrapAdmin is the first super admin for a production database. Only the
// email is required; the person sets their own password from the link.
type BootstrapAdmin struct {
	Email, FirstName, LastName, Phone string
	Pepper                            []byte // OTP_PEPPER, else DJANGO_SECRET_KEY (same as the API)
	AdminURL                          string // FRONTEND_ADMIN_URL
}

// Must match the console's own invites (accounts.staff_service).
const (
	inviteTTL    = 72 * time.Hour
	codeAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
)

// Bootstrap loads the reference data (permissions, roles, grants — no demo
// users, riders, hubs or money) and, when admin.Email is set and no super
// admin exists yet, creates one and returns their one-time set-password link.
// Safe to run on every deploy.
func Bootstrap(ctx context.Context, conn *sql.DB, log *slog.Logger, admin BootstrapAdmin) (string, error) {
	tx, err := conn.BeginTx(ctx, nil)
	if err != nil {
		return "", err
	}
	defer tx.Rollback() //nolint:errcheck
	if _, err := tx.ExecContext(ctx, dbfs.Reference); err != nil {
		return "", fmt.Errorf("bootstrap: run `migrate up` first: %w", err)
	}
	link := ""
	if email := strings.ToLower(strings.TrimSpace(admin.Email)); email != "" {
		if link, err = firstAdmin(ctx, tx, log, admin, email); err != nil {
			return "", err
		}
	}
	if err := tx.Commit(); err != nil {
		return "", err
	}
	log.Info("bootstrap_loaded", "admin_invited", link != "")
	return link, nil
}

func firstAdmin(ctx context.Context, tx *sql.Tx, log *slog.Logger, a BootstrapAdmin, email string) (string, error) {
	var admins int
	if err := tx.QueryRowContext(ctx,
		"SELECT count(*) FROM accounts_user WHERE role = 'SUPER_ADMIN' AND is_active").Scan(&admins); err != nil {
		return "", err
	}
	if admins > 0 {
		log.Info("bootstrap_admin_skipped", "reason", "a super admin already exists; invite more from the console")
		return "", nil
	}
	var taken bool
	if err := tx.QueryRowContext(ctx, "SELECT EXISTS (SELECT 1 FROM accounts_user WHERE lower(email) = $1)",
		email).Scan(&taken); err != nil {
		return "", err
	}
	if taken {
		return "", fmt.Errorf("bootstrap: %s already has an account — make them super admin from the console", email)
	}
	if len(a.Pepper) == 0 || a.AdminURL == "" {
		return "", errors.New("bootstrap: set OTP_PEPPER (or DJANGO_SECRET_KEY) and FRONTEND_ADMIN_URL so the link works")
	}
	var roleID string
	if err := tx.QueryRowContext(ctx, "SELECT id FROM accounts_role WHERE code = 'SUPER_ADMIN'").Scan(&roleID); err != nil {
		return "", fmt.Errorf("bootstrap: SUPER_ADMIN role missing: %w", err)
	}
	userID, publicID := ids.New(), "ST-"+code(6)
	var phone any
	if p := strings.TrimSpace(a.Phone); p != "" {
		phone = p
	}
	// Same columns and defaults as the console's staff invite (InsertStaffUser).
	if _, err := tx.ExecContext(ctx, `INSERT INTO accounts_user (id, created_at, updated_at, password, is_superuser,
		email, phone, first_name, last_name, role, pin_hash, is_active, is_staff, assigned_role_id,
		pin_failed_attempts, onboarding_step, public_id, notification_prefs, session_version)
		VALUES ($1, clock_timestamp(), clock_timestamp(), $2, true, $3, $4, $5, $6, 'SUPER_ADMIN', '', true, true, $7,
		0, 'pin', $8, '{}'::jsonb, 0)`,
		userID, "!"+code(24), email, phone, strings.TrimSpace(a.FirstName), strings.TrimSpace(a.LastName),
		roleID, publicID); err != nil {
		return "", fmt.Errorf("bootstrap: create admin: %w", err)
	}
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	raw := base64.RawURLEncoding.EncodeToString(b)
	m := hmac.New(sha256.New, a.Pepper)
	m.Write([]byte(raw))
	if _, err := tx.ExecContext(ctx, `INSERT INTO accounts_passwordsetuptoken (id, created_at, updated_at, purpose,
		token_hash, expires_at, user_id) VALUES ($1, clock_timestamp(), clock_timestamp(), 'INVITE', $2, $3, $4)`,
		ids.New(), hex.EncodeToString(m.Sum(nil)), time.Now().Add(inviteTTL), userID); err != nil {
		return "", fmt.Errorf("bootstrap: setup link: %w", err)
	}
	log.Info("bootstrap_admin_created", "public_id", publicID)
	return strings.TrimRight(a.AdminURL, "/") + "/create-password?token=" + url.QueryEscape(raw) +
		"&email=" + url.QueryEscape(email), nil
}

func code(n int) string {
	out := make([]byte, n)
	for i := range out {
		k, err := rand.Int(rand.Reader, big.NewInt(int64(len(codeAlphabet))))
		if err != nil {
			panic(err) // crypto/rand failing is unrecoverable
		}
		out[i] = codeAlphabet[k.Int64()]
	}
	return string(out)
}
