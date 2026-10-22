package accounts

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
)

// StaffPatch is StaffUpdateSerializer's validated data (nil = not sent).
type StaffPatch struct {
	FirstName *string      `json:"first_name" validate:"omitempty,max=150"`
	LastName  *string      `json:"last_name" validate:"omitempty,max=150"`
	Phone     *string      `json:"phone" validate:"omitempty,max=30"`
	Role      *string      `json:"role" validate:"omitempty,max=50"`
	IsActive  *bool        `json:"is_active"`
	HubIDs    *[]uuid.UUID `json:"hub_ids"`
}

// Update mirrors UserService.update_staff. A role change or deactivation
// bumps session_version (signs the user out everywhere).
func (s *StaffService) Update(ctx context.Context, actor *events.Actor, id uuid.UUID, p StaffPatch) error {
	return database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		u, err := q.GetUserByIDForUpdate(ctx, id)
		if err != nil {
			return err
		}
		if !u.IsStaff {
			return apperr.New("VALIDATION_ERROR", "Only staff users can be managed here.")
		}
		before := events.Map{"first_name": u.FirstName, "last_name": u.LastName,
			"phone": optStr(u.Phone), "role": u.Role, "is_active": u.IsActive}
		next := u
		if p.FirstName != nil {
			next.FirstName = strings.TrimSpace(*p.FirstName)
		}
		if p.LastName != nil {
			next.LastName = strings.TrimSpace(*p.LastName)
		}
		if p.Phone != nil {
			next.Phone = nilIfBlank(*p.Phone)
		}
		if p.Role != nil {
			role, err := resolveStaffRole(ctx, q, *p.Role)
			if err != nil {
				return err
			}
			if u.ID == actor.ID && role.Code != u.Role {
				return apperr.New("VALIDATION_ERROR", "You cannot change your own role.")
			}
			next.Role, next.AssignedRoleID, next.IsSuperuser = role.Code, &role.ID, role.Code == "SUPER_ADMIN"
		}
		if p.IsActive != nil {
			if u.ID == actor.ID && !*p.IsActive {
				return apperr.New("VALIDATION_ERROR", "You cannot deactivate your own account.")
			}
			next.IsActive = *p.IsActive
		}
		roleChanged := u.Role != next.Role
		if roleChanged || (u.IsActive && !next.IsActive) {
			next.SessionVersion++
		}
		if err := q.UpdateStaffUser(ctx, db.UpdateStaffUserParams{ID: u.ID, FirstName: next.FirstName,
			LastName: next.LastName, Phone: next.Phone, Role: next.Role, AssignedRoleID: next.AssignedRoleID,
			IsSuperuser: next.IsSuperuser, IsActive: next.IsActive, SessionVersion: next.SessionVersion}); err != nil {
			return err
		}
		after := events.Map{"first_name": next.FirstName, "last_name": next.LastName,
			"phone": optStr(next.Phone), "role": next.Role, "is_active": next.IsActive}
		if p.HubIDs != nil {
			hubs, err := setHubMemberships(ctx, q, u.ID, next.Role, *p.HubIDs)
			if err != nil {
				return err
			}
			after["hub_ids"] = hubs
		}
		ev := events.Event{Action: "user.updated", SubjectType: "user", SubjectID: u.ID.String(),
			SubjectLabel: firstNonEmpty(str(u.PublicID), staffLabel(next)), Actor: actor,
			Before: before, After: after}
		if roleChanged {
			ev.Notify = []events.NotifySpec{{UserID: u.ID, Title: "Role changed",
				Body:   fmt.Sprintf("%s (%s): %s → %s.", staffLabel(next), pyNone(u.PublicID), u.Role, next.Role),
				Source: "Users", LinkPath: "/users/" + u.ID.String(), TemplateCode: "user.role_changed",
				DedupeKey: "user.role_changed:" + u.ID.String() + ":" + next.Role}}
		}
		return events.Emit(ctx, q, ev)
	})
}
