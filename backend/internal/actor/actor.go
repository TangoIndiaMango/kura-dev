// Package actor resolves the signed-in caller into an audit actor.
package actor

import (
	"context"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
)

// FromRequest loads the caller (email/phone/role) for audit rows. nil when
// anonymous.
func FromRequest(ctx context.Context, q *db.Queries) (*events.Actor, error) {
	p := reqctx.User(ctx)
	if p == nil {
		return nil, nil
	}
	id, err := uuid.Parse(p.UserID)
	if err != nil {
		return nil, nil
	}
	u, err := q.GetUserByID(ctx, id)
	if err != nil {
		return nil, err
	}
	a := &events.Actor{ID: u.ID, Role: u.Role}
	if u.Email != nil {
		a.Email = *u.Email
	}
	if u.Phone != nil {
		a.Phone = *u.Phone
	}
	return a, nil
}
