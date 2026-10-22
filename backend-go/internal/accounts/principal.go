// Package accounts ports Django's accounts app: users, auth flows, accounts,
// roles and capabilities.
package accounts

import (
	"context"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/auth"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
)

// PrincipalLoader resolves a token's user into a Principal with live
// capabilities. Implements auth.PrincipalLoader.
type PrincipalLoader struct{ q db.Querier }

func NewPrincipalLoader(q db.Querier) *PrincipalLoader { return &PrincipalLoader{q: q} }

// LoadPrincipal returns (nil, false, nil) for unknown ids so the middleware
// answers 401 rather than 500.
func (l *PrincipalLoader) LoadPrincipal(ctx context.Context, userID string) (*reqctx.Principal, bool, error) {
	id, err := uuid.Parse(userID)
	if err != nil {
		return nil, false, nil
	}
	row, err := l.q.GetPrincipalUser(ctx, id)
	if database.IsNoRows(err) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}

	var assigned *auth.AssignedRole
	if row.AssignedCode != nil {
		codes, err := l.q.RolePermissionCodes(ctx, id)
		if err != nil {
			return nil, false, err
		}
		assigned = &auth.AssignedRole{
			Code: *row.AssignedCode, IsActive: row.AssignedActive != nil && *row.AssignedActive,
			DBCodes: codes,
		}
	}
	return &reqctx.Principal{
		UserID:         row.ID.String(),
		Role:           row.Role,
		IsStaff:        row.IsStaff,
		SessionVersion: int(row.SessionVersion),
		Capabilities:   auth.ResolveCapabilities(row.Role, row.IsSuperuser, assigned),
	}, row.IsActive, nil
}
