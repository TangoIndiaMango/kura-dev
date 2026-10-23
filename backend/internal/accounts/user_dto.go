package accounts

import (
	"context"
	"encoding/json"
	"strconv"
	"strings"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
)

// UserDTO is the JSON contract of Django's accounts.serializers.UserSerializer.
type UserDTO struct {
	ID               string          `json:"id"`
	PublicID         *string         `json:"public_id"`
	Email            *string         `json:"email"`
	Phone            *string         `json:"phone"`
	FirstName        string          `json:"first_name"`
	LastName         string          `json:"last_name"`
	Name             string          `json:"name"`
	Role             string          `json:"role"`
	AssignedRoleCode *string         `json:"assigned_role_code"`
	AssignedRoleName *string         `json:"assigned_role_name"`
	HubIDs           []string        `json:"hub_ids"`
	IsActive         bool            `json:"is_active"`
	IsStaff          bool            `json:"is_staff"`
	LastLogin        *jsontime.Field `json:"last_login"`
	CreatedAt        jsontime.Field  `json:"created_at"`
	UpdatedAt        jsontime.Field  `json:"updated_at"`
}

// loadUserDTO fetches the user, its role and hub memberships.
func loadUserDTO(ctx context.Context, q *db.Queries, id uuid.UUID) (UserDTO, error) {
	u, err := q.GetUserByID(ctx, id)
	if err != nil {
		return UserDTO{}, err
	}
	hubs, err := q.HubIDsForUser(ctx, id)
	if err != nil {
		return UserDTO{}, err
	}
	return UserDTO{
		ID: u.ID.String(), PublicID: u.PublicID, Email: u.Email, Phone: u.Phone,
		FirstName: u.FirstName, LastName: u.LastName,
		Name: displayName(u.FirstName, u.LastName, u.Phone, u.Email),
		Role: u.Role, AssignedRoleCode: u.AssignedRoleCode, AssignedRoleName: u.AssignedRoleName,
		HubIDs: hubs, IsActive: u.IsActive, IsStaff: u.IsStaff,
		LastLogin: jsontime.FieldPtr(u.LastLogin),
		CreatedAt: jsontime.Field(u.CreatedAt), UpdatedAt: jsontime.Field(u.UpdatedAt),
	}, nil
}

// displayName is UserSerializer.get_name: "First Last", else phone, email, "User".
func displayName(first, last string, phone, email *string) string {
	if name := strings.TrimSpace(first + " " + last); name != "" {
		return name
	}
	if phone != nil && *phone != "" {
		return *phone
	}
	if email != nil && *email != "" {
		return *email
	}
	return "User"
}

// str dereferences an optional string.
func str(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func itoa(n int) string { return strconv.Itoa(n) }

// jsonRoundTrip turns a DTO into a generic map (to merge extra keys).
func jsonRoundTrip(v any) (map[string]any, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}
	var out map[string]any
	return out, json.Unmarshal(b, &out)
}
