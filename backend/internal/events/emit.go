package events

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
)

// Event is one auditable mutation plus who should hear about it.
type Event struct {
	Action       string // e.g. "auth.staff_login"
	SubjectType  string // e.g. "user" (lower-cased on write)
	SubjectID    string
	SubjectLabel string
	Actor        *Actor
	Before       Map
	After        Map
	Metadata     Map
	Notify       []NotifySpec
}

// Emit records the audit row then notifications. Pass the transaction-bound
// queries (db.New(tx)) so everything commits or rolls back with the caller.
func Emit(ctx context.Context, q *db.Queries, ev Event) error {
	if err := record(ctx, q, ev); err != nil {
		return err
	}
	for _, spec := range ev.Notify {
		if spec.UserID == uuid.Nil {
			continue
		}
		if err := notify(ctx, q, spec); err != nil {
			return err
		}
	}
	return nil
}

// EmitTx emits in its own transaction, for callers outside one (Django's
// emit_event in autocommit). The audit chain lock must span lock → tip →
// insert, so Emit never runs on a bare pool.
func EmitTx(ctx context.Context, pool *pgxpool.Pool, ev Event) error {
	return database.InTx(ctx, pool, func(tx pgx.Tx) error { return Emit(ctx, db.New(tx), ev) })
}

// Notify sends one notification without an audit row (NotificationService.notify).
func Notify(ctx context.Context, q *db.Queries, spec NotifySpec) error { return notify(ctx, q, spec) }
