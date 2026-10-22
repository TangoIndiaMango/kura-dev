// Package approval ports accounts.helpers.maker_checker: dual control where
// the approver must differ from the creator, unless they are a Super Admin.
package approval

import (
	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
)

// CanBypass is can_bypass_maker_checker: superuser, SUPER_ADMIN role, or an
// assigned SUPER_ADMIN role.
func CanBypass(u db.GetUserByIDRow) bool {
	return u.IsSuperuser || u.Role == "SUPER_ADMIN" ||
		(u.AssignedRoleCode != nil && *u.AssignedRoleCode == "SUPER_ADMIN")
}

// AssertNotSelf is assert_not_self_approve (APPROVAL_FORBIDDEN, 403).
func AssertNotSelf(actor db.GetUserByIDRow, createdBy *uuid.UUID, message string) error {
	if createdBy == nil || *createdBy != actor.ID || CanBypass(actor) {
		return nil
	}
	return apperr.New("APPROVAL_FORBIDDEN", message).WithStatus(403)
}

// Metadata is self_approve_audit_metadata.
func Metadata(actor db.GetUserByIDRow, createdBy *uuid.UUID) events.Map {
	self := createdBy != nil && *createdBy == actor.ID
	return events.Map{"self_approved": self, "maker_checker_bypass": self && CanBypass(actor)}
}
