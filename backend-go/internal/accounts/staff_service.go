package accounts

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/mail"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/config"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
)

const inviteTTL = 72 * time.Hour

var operatorRoles = map[string]bool{"DRIVER": true, "FLEET_OWNER": true}

// roleLabels is User.Role display names (get_role_display).
var roleLabels = map[string]string{"SUPER_ADMIN": "Super Admin", "OPS_MANAGER": "Operations Manager",
	"HUB_AGENT": "Hub Agent", "COMMERCIAL_ADMIN": "Commercial Admin",
	"GOVERNMENT_VIEWER": "Government Viewer", "PARTNER_VIEWER": "Partner Viewer",
	"DRIVER": "Driver / Operator", "FLEET_OWNER": "Fleet Owner",
	"COOPERATIVE_CHAIRMAN": "Cooperative Chairman"}

// StaffService is UserService (staff directory) + staff_invite.
type StaffService struct {
	pool   *pgxpool.Pool
	q      *db.Queries
	cfg    config.Config
	mailer *mail.Mailer
	auth   *AuthService // setup-token hashing
}

func NewStaffService(pool *pgxpool.Pool, cfg config.Config, mailer *mail.Mailer, a *AuthService) *StaffService {
	return &StaffService{pool: pool, q: db.New(pool), cfg: cfg, mailer: mailer, auth: a}
}

// resolveStaffRole is resolve_assignable_staff_role.
func resolveStaffRole(ctx context.Context, q *db.Queries, code string) (db.RoleByCodeRow, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	bad := func(msg, why string) error {
		return apperr.New("VALIDATION_ERROR", msg).WithDetails(apperr.Details{"role": []string{why}})
	}
	if code == "" {
		return db.RoleByCodeRow{}, bad("Role is required.", "required")
	}
	if operatorRoles[code] {
		return db.RoleByCodeRow{}, bad("Rider / fleet roles cannot be assigned to staff users.", "invalid")
	}
	r, err := q.RoleByCode(ctx, code)
	if database.IsNoRows(err) {
		return r, bad("Unknown role.", "invalid")
	}
	if err != nil {
		return r, err
	}
	if !r.IsActive {
		return r, bad("This role is inactive.", "inactive")
	}
	return r, nil
}

// setHubMemberships replaces a hub agent's stations (set_hub_memberships).
func setHubMemberships(ctx context.Context, q *db.Queries, userID uuid.UUID, role string, hubs []uuid.UUID) ([]string, error) {
	if strings.ToUpper(role) != "HUB_AGENT" {
		if len(hubs) > 0 {
			return nil, apperr.New("VALIDATION_ERROR", "hub_ids is only valid for Hub Agent.").
				WithDetails(apperr.Details{"hub_ids": []string{"role_mismatch"}})
		}
		return []string{}, nil
	}
	seen, unique := map[uuid.UUID]bool{}, []uuid.UUID{}
	for _, h := range hubs {
		if !seen[h] {
			seen[h] = true
			unique = append(unique, h)
		}
	}
	if len(unique) > 0 {
		found, err := q.ExistingHubIDs(ctx, unique)
		if err != nil {
			return nil, err
		}
		have := map[uuid.UUID]bool{}
		for _, id := range found {
			have[id] = true
		}
		var missing []string
		for _, h := range unique {
			if !have[h] {
				missing = append(missing, h.String())
			}
		}
		if len(missing) > 0 {
			return nil, apperr.New("VALIDATION_ERROR", "Unknown hub.").WithDetails(apperr.Details{"hub_ids": missing})
		}
	}
	if err := q.ClearMemberships(ctx, userID); err != nil {
		return nil, err
	}
	out := make([]string, 0, len(unique))
	for _, h := range unique {
		if err := q.InsertMembership(ctx, db.InsertMembershipParams{ID: ids.New(), HubID: h.String(), UserID: userID}); err != nil {
			return nil, err
		}
		out = append(out, h.String())
	}
	return out, nil
}

// issueSetupToken invalidates open INVITE tokens and stores a new one; the
// raw token is returned once (issue_password_setup_token).
func (s *StaffService) issueSetupToken(ctx context.Context, q *db.Queries, userID uuid.UUID) (string, error) {
	if err := q.ConsumeOpenSetupTokens(ctx, db.ConsumeOpenSetupTokensParams{UserID: userID, Purpose: "INVITE"}); err != nil {
		return "", err
	}
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	raw := base64.RawURLEncoding.EncodeToString(b) // secrets.token_urlsafe(32)
	err := q.InsertSetupToken(ctx, db.InsertSetupTokenParams{ID: ids.New(), Purpose: "INVITE",
		TokenHash: s.auth.hashSetupToken(raw), ExpiresAt: time.Now().Add(inviteTTL), UserID: userID})
	return raw, err
}

// sendInvite emails the setup link (enqueue_staff_invite_email, after commit).
func (s *StaffService) sendInvite(ctx context.Context, userID uuid.UUID, raw, baseURL string) {
	u, err := s.q.GetUserByID(ctx, userID)
	if err != nil || u.Email == nil || *u.Email == "" {
		return
	}
	label := roleLabels[u.Role]
	if u.AssignedRoleName != nil {
		label = *u.AssignedRoleName
	} else if label == "" {
		label = u.Role
	}
	s.mailer.Send(ctx, mail.Message{To: []string{*u.Email}, Subject: "Set up your Kura console password",
		Template: "staff_invite", Context: map[string]any{"first_name": u.FirstName, "role_label": label,
			"setup_url": setupURL(firstNonEmpty(baseURL, s.cfg.FrontendAdminURL), raw, *u.Email),
			"expires_hours": int(inviteTTL.Hours())}})
}

// setupURL is admin_setup_url (token first, quote_plus like urlencode).
func setupURL(base, raw, email string) string {
	return strings.TrimRight(base, "/") + "/create-password?token=" + url.QueryEscape(raw) +
		"&email=" + url.QueryEscape(email)
}

func staffLabel(u db.AccountsUser) string {
	return firstNonEmpty(strings.TrimSpace(u.FirstName+" "+u.LastName), str(u.Email), str(u.Phone),
		str(u.PublicID), u.ID.String())
}

// SetActive mirrors UserService.set_active (deactivation revokes sessions).
func (s *StaffService) SetActive(ctx context.Context, actor *events.Actor, id uuid.UUID, active bool) error {
	return database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		u, err := q.GetUserByIDForUpdate(ctx, id)
		if err != nil {
			return err
		}
		if u.ID == actor.ID && !active {
			return apperr.New("VALIDATION_ERROR", "You cannot deactivate your own account.")
		}
		if !u.IsStaff {
			return apperr.New("VALIDATION_ERROR", "Only staff users can be managed here.")
		}
		before := u.IsActive
		sv := u.SessionVersion
		if !active {
			sv++
		}
		if err := q.UpdateStaffUser(ctx, db.UpdateStaffUserParams{ID: u.ID, FirstName: u.FirstName,
			LastName: u.LastName, Phone: u.Phone, Role: u.Role, AssignedRoleID: u.AssignedRoleID,
			IsSuperuser: u.IsSuperuser, IsActive: active, SessionVersion: sv}); err != nil {
			return err
		}
		action, title, word, bit := "user.activated", "User activated", "active", 1
		if !active {
			action, title, word, bit = "user.deactivated", "User deactivated", "suspended", 0
		}
		return events.Emit(ctx, q, events.Event{Action: action, SubjectType: "user",
			SubjectID: u.ID.String(), SubjectLabel: firstNonEmpty(str(u.PublicID), staffLabel(u)), Actor: actor,
			Before: events.Map{"is_active": before}, After: events.Map{"is_active": active},
			Notify: []events.NotifySpec{{UserID: u.ID, Title: title,
				Body:   fmt.Sprintf("%s (%s) is now %s.", staffLabel(u), pyNone(u.PublicID), word),
				Source: "Users", LinkPath: "/users/" + u.ID.String(), TemplateCode: action,
				DedupeKey: fmt.Sprintf("%s:%s:%d", action, u.ID, bit)}}})
	})
}

// pyNone renders an optional string the way an f-string shows None.
func pyNone(p *string) string {
	if p == nil {
		return "None"
	}
	return *p
}
