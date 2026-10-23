package rbac

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
)

// Service is RoleService.
type Service struct {
	pool *pgxpool.Pool
	q    *db.Queries
}

func NewService(pool *pgxpool.Pool) *Service { return &Service{pool: pool, q: db.New(pool)} }

// Detail loads a role with its grants (404 like get_object_or_404).
func (s *Service) Detail(ctx context.Context, q *db.Queries, id uuid.UUID) (RoleDetailDTO, error) {
	r, err := q.GetRole(ctx, id)
	if database.IsNoRows(err) {
		return RoleDetailDTO{}, apperr.NotFound("No Role matches the given query.")
	}
	if err != nil {
		return RoleDetailDTO{}, err
	}
	perms, err := q.RolePermissions(ctx, id)
	if err != nil {
		return RoleDetailDTO{}, err
	}
	return toRoleDetail(r, perms), nil
}

// checkPermissionIDs mirrors PrimaryKeyRelatedField: every id must exist.
func checkPermissionIDs(ctx context.Context, q *db.Queries, idsIn []uuid.UUID) error {
	if len(idsIn) == 0 {
		return nil
	}
	found, err := q.ExistingPermissionIDs(ctx, idsIn)
	if err != nil {
		return err
	}
	have := map[uuid.UUID]bool{}
	for _, id := range found {
		have[id] = true
	}
	for _, id := range idsIn {
		if !have[id] {
			return apperr.Validation(apperr.Details{"permission_ids": []string{
				fmt.Sprintf("Invalid pk \"%s\" - object does not exist.", id)}})
		}
	}
	return nil
}

// Create mirrors create_role (code upper-cased, custom + active).
func (s *Service) Create(ctx context.Context, actor *events.Actor, code, name, desc string, permIDs []uuid.UUID) (RoleDetailDTO, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	var out RoleDetailDTO
	err := database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		if err := checkPermissionIDs(ctx, q, permIDs); err != nil {
			return err
		}
		if taken, err := q.RoleCodeExists(ctx, code); err != nil {
			return err
		} else if taken {
			return apperr.New("VALIDATION_ERROR", "Role code already exists.").
				WithDetails(apperr.Details{"code": []string{"unique"}})
		}
		id := ids.New()
		if err := q.InsertRole(ctx, db.InsertRoleParams{ID: id, Code: code,
			Name: strings.TrimSpace(name), Description: desc}); err != nil {
			return err
		}
		if len(permIDs) > 0 {
			if err := q.AddRolePermissions(ctx, db.AddRolePermissionsParams{RoleID: id, Ids: permIDs}); err != nil {
				return err
			}
		}
		var err error
		if out, err = s.Detail(ctx, q, id); err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "role.created", SubjectType: "role",
			SubjectID: id.String(), SubjectLabel: code, Actor: actor,
			After: events.Map{"code": code, "name": out.Name, "permission_count": len(out.Permissions)}})
	})
	return out, err
}

// Patch is a partial update (nil = unchanged).
type Patch struct {
	Name, Description *string
	IsActive          *bool
	PermissionIDs     *[]uuid.UUID
}

// Update mirrors update_role (audit before/after incl. permission ids).
func (s *Service) Update(ctx context.Context, actor *events.Actor, id uuid.UUID, p Patch) (RoleDetailDTO, error) {
	var out RoleDetailDTO
	err := database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		cur, err := s.Detail(ctx, q, id)
		if err != nil {
			return err
		}
		if p.PermissionIDs != nil {
			if err := checkPermissionIDs(ctx, q, *p.PermissionIDs); err != nil {
				return err
			}
		}
		beforeIDs, err := q.RolePermissionIDs(ctx, id)
		if err != nil {
			return err
		}
		name, desc, active := cur.Name, cur.Description, cur.IsActive
		if p.Name != nil {
			name = strings.TrimSpace(*p.Name)
		}
		if p.Description != nil {
			desc = *p.Description
		}
		if p.IsActive != nil {
			active = *p.IsActive
		}
		if err := q.UpdateRole(ctx, db.UpdateRoleParams{ID: id, Name: name, Description: desc, IsActive: active}); err != nil {
			return err
		}
		if p.PermissionIDs != nil {
			if err := q.ClearRolePermissions(ctx, id); err != nil {
				return err
			}
			if err := q.AddRolePermissions(ctx, db.AddRolePermissionsParams{RoleID: id, Ids: *p.PermissionIDs}); err != nil {
				return err
			}
		}
		afterIDs, err := q.RolePermissionIDs(ctx, id)
		if err != nil {
			return err
		}
		if out, err = s.Detail(ctx, q, id); err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "role.updated", SubjectType: "role",
			SubjectID: id.String(), SubjectLabel: cur.Code, Actor: actor,
			Before: events.Map{"name": cur.Name, "description": cur.Description, "is_active": cur.IsActive,
				"permission_ids": idStrings(beforeIDs)},
			After: events.Map{"name": name, "description": desc, "is_active": active,
				"permission_ids": idStrings(afterIDs)}})
	})
	return out, err
}

// SetActive refuses to deactivate system roles.
func (s *Service) SetActive(ctx context.Context, actor *events.Actor, id uuid.UUID, active bool) (RoleDetailDTO, error) {
	cur, err := s.Detail(ctx, s.q, id)
	if err != nil {
		return RoleDetailDTO{}, err
	}
	if cur.IsSystem && !active {
		return RoleDetailDTO{}, apperr.New("VALIDATION_ERROR", "System roles cannot be deactivated.")
	}
	return s.Update(ctx, actor, id, Patch{IsActive: &active})
}

func idStrings(in []uuid.UUID) []string {
	out := make([]string, len(in))
	for i, id := range in {
		out[i] = id.String()
	}
	return out
}
