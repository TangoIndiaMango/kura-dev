package accounts

import (
	"context"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
)

// UserDTO is the JSON contract of Django's accounts.serializers.UserSerializer.
type UserDTO struct {
	ID               string     `json:"id"`
	PublicID         *string    `json:"public_id"`
	Email            *string    `json:"email"`
	Phone            *string    `json:"phone"`
	FirstName        string     `json:"first_name"`
	LastName         string     `json:"last_name"`
	Name             string     `json:"name"`
	Role             string     `json:"role"`
	AssignedRoleCode *string    `json:"assigned_role_code"`
	AssignedRoleName *string    `json:"assigned_role_name"`
	HubIDs           []string   `json:"hub_ids"`
	IsActive         bool       `json:"is_active"`
	IsStaff          bool       `json:"is_staff"`
	LastLogin        *time.Time `json:"last_login"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
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
		HubIDs: hubs, IsActive: u.IsActive, IsStaff: u.IsStaff, LastLogin: u.LastLogin,
		CreatedAt: u.CreatedAt, UpdatedAt: u.UpdatedAt,
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
