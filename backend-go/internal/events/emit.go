package events

import (
	"context"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
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
