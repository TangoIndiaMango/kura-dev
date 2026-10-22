// Package scope ports accounts.selectors.scope: which hubs a staff member is
// limited to, and the accounts those hubs touch.
package scope

import (
	"context"
	"slices"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
)

// Hubs is a hub scope: All=true means unrestricted; otherwise only IDs
// (possibly none — an agent with no stations sees nothing).
type Hubs struct {
	All bool
	IDs []uuid.UUID
}

// HubsFor mirrors hub_ids_for. Superusers hold every capability, so the
// hubs:manage check covers them.
func HubsFor(ctx context.Context, q *db.Queries, p *reqctx.Principal) (Hubs, error) {
	if p == nil {
		return Hubs{}, nil
	}
	if p.Can("hubs:manage") {
		return Hubs{All: true}, nil
	}
	uid, err := uuid.Parse(p.UserID)
	if err != nil {
		return Hubs{}, nil
	}
	rows, err := q.MembershipHubIDs(ctx, uid)
	if err != nil {
		return Hubs{}, err
	}
	if len(rows) > 0 {
		out := Hubs{}
		for _, h := range rows {
			if h == "*" {
				return Hubs{All: true}, nil
			}
			if id, err := uuid.Parse(h); err == nil {
				out.IDs = append(out.IDs, id)
			}
		}
		return out, nil
	}
	shifts, err := q.OpenShiftHubIDs(ctx, uid)
	if err != nil {
		return Hubs{}, err
	}
	if len(shifts) > 0 {
		return Hubs{IDs: shifts}, nil
	}
	if p.Role == "HUB_AGENT" {
		return Hubs{}, nil
	}
	return Hubs{All: true}, nil
}

// AccountsTouching mirrors account_ids_touching_hubs.
func AccountsTouching(ctx context.Context, q *db.Queries, hubs []uuid.UUID) ([]uuid.UUID, error) {
	if len(hubs) == 0 {
		return nil, nil
	}
	return q.AccountIDsTouchingHubs(ctx, hubs)
}

// OwnAccounts is the "own rows" set used by *_for selectors: the driver's
// account first, then accounts the user owns (newest first), de-duplicated.
func OwnAccounts(ctx context.Context, q *db.Queries, user uuid.UUID) ([]uuid.UUID, error) {
	out := []uuid.UUID{}
	if d, err := q.DriverRowByUser(ctx, user); err == nil {
		out = append(out, d.AccountID)
	} else if !database.IsNoRows(err) {
		return nil, err
	}
	owned, err := q.OwnedAccountIDs(ctx, user)
	if err != nil {
		return nil, err
	}
	for _, id := range owned {
		if !slices.Contains(out, id) {
			out = append(out, id)
		}
	}
	return out, nil
}
