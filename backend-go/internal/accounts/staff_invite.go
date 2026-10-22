package accounts

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
)

// InviteInput is StaffInviteSerializer's validated data.
type InviteInput struct {
	Email, Role, FirstName, LastName, Phone string
	CooperativeID                           *uuid.UUID
	HubIDs                                  []uuid.UUID
	BaseURL                                 string
}

// Invite mirrors invite_staff; returns the new user id and invite meta.
func (s *StaffService) Invite(ctx context.Context, actor *events.Actor, in InviteInput) (uuid.UUID, map[string]any, error) {
	email := strings.ToLower(strings.TrimSpace(in.Email))
	var userID uuid.UUID
	var raw string
	meta := map[string]any{"invite_email_sent": true, "expires_hours": int(inviteTTL.Hours())}
	err := database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		if taken, err := q.EmailTaken(ctx, email); err != nil {
			return err
		} else if taken {
			return apperr.New("VALIDATION_ERROR", "A user with this email already exists.").
				WithDetails(apperr.Details{"email": []string{"unique"}})
		}
		role, err := resolveStaffRole(ctx, q, in.Role)
		if err != nil {
			return err
		}
		var coop *db.CooperativeForUpdateRow
		if in.CooperativeID != nil {
			c, err := q.CooperativeForUpdate(ctx, *in.CooperativeID)
			if database.IsNoRows(err) {
				return apperr.New("VALIDATION_ERROR", "Unknown cooperative.").
					WithDetails(apperr.Details{"cooperative_id": []string{"invalid"}})
			}
			if err != nil {
				return err
			}
			if role.Code != "COOPERATIVE_CHAIRMAN" {
				return apperr.New("VALIDATION_ERROR", "cooperative_id is only valid when inviting a Cooperative Chairman.").
					WithDetails(apperr.Details{"cooperative_id": []string{"role_mismatch"}})
			}
			coop = &c
		}
		if len(in.HubIDs) > 0 && role.Code != "HUB_AGENT" {
			return apperr.New("VALIDATION_ERROR", "hub_ids is only valid when inviting a Hub Agent.").
				WithDetails(apperr.Details{"hub_ids": []string{"role_mismatch"}})
		}
		userID = ids.New()
		publicID, err := uniquePublicID(ctx, q, "ST")
		if err != nil {
			return err
		}
		if err := q.InsertStaffUser(ctx, db.InsertStaffUserParams{ID: userID, Password: "!" + randomSuffix(),
			IsSuperuser: role.Code == "SUPER_ADMIN", Email: &email, Phone: nilIfBlank(in.Phone),
			FirstName: strings.TrimSpace(in.FirstName), LastName: strings.TrimSpace(in.LastName),
			Role: role.Code, AssignedRoleID: &role.ID, PublicID: &publicID}); err != nil {
			return err
		}
		after := events.Map{"public_id": publicID, "email": email, "role": role.Code, "invite_email_sent": true}
		if coop != nil {
			if err := q.SetCooperativeChairman(ctx, db.SetCooperativeChairmanParams{ID: coop.ID, ChairmanUserID: &userID}); err != nil {
				return err
			}
			prev := ""
			if coop.ChairmanUserID != nil {
				prev = coop.ChairmanUserID.String()
			}
			if err := events.Emit(ctx, q, events.Event{Action: "cooperative.chairman_assigned",
				SubjectType: "cooperative", SubjectID: coop.ID.String(), SubjectLabel: coop.Name, Actor: actor,
				Before: events.Map{"chairman_user_id": prev}, After: events.Map{"chairman_user_id": userID.String()}}); err != nil {
				return err
			}
			after["cooperative_id"], meta["cooperative_id"] = coop.ID.String(), coop.ID.String()
		}
		if role.Code == "HUB_AGENT" && in.HubIDs != nil {
			hubs, err := setHubMemberships(ctx, q, userID, role.Code, in.HubIDs)
			if err != nil {
				return err
			}
			if len(hubs) > 0 {
				after["hub_ids"], meta["hub_ids"] = hubs, hubs
			}
		}
		if raw, err = s.issueSetupToken(ctx, q, userID); err != nil {
			return err
		}
		label := firstNonEmpty(strings.TrimSpace(in.FirstName+" "+in.LastName), email)
		return events.Emit(ctx, q, events.Event{Action: "user.invited", SubjectType: "user",
			SubjectID: userID.String(), SubjectLabel: publicID, Actor: actor, After: after,
			Notify: []events.NotifySpec{{UserID: actor.ID, Title: "Staff invite emailed",
				Body: fmt.Sprintf("%s (%s) invited as %s. Setup link expires in %dh.",
					label, publicID, role.Code, int(inviteTTL.Hours())),
				Source: "Users", LinkPath: "/users/" + userID.String(), TemplateCode: "user.invited",
				DedupeKey: "user.invited:" + userID.String()}}})
	})
	if err != nil {
		return uuid.Nil, nil, err
	}
	s.sendInvite(ctx, userID, raw, in.BaseURL)
	return userID, meta, nil
}

// ResendInvite mirrors resend_invite (only for staff who haven't signed in).
func (s *StaffService) ResendInvite(ctx context.Context, actor *events.Actor, id uuid.UUID, baseURL string) (map[string]any, error) {
	var raw string
	err := database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		u, err := q.GetUserByIDForUpdate(ctx, id)
		if err != nil {
			return err
		}
		switch {
		case !u.IsStaff:
			return apperr.New("VALIDATION_ERROR", "Only staff users can receive console invites.")
		case u.Email == nil || *u.Email == "":
			return apperr.New("VALIDATION_ERROR", "User has no email address.")
		case !strings.HasPrefix(u.Password, "!") && u.LastLogin != nil:
			return apperr.New("VALIDATION_ERROR",
				"This user already activated their account. Use password reset instead.").WithStatus(http.StatusConflict)
		}
		if raw, err = s.issueSetupToken(ctx, q, u.ID); err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "user.invite_resent", SubjectType: "user",
			SubjectID: u.ID.String(), SubjectLabel: firstNonEmpty(str(u.PublicID), staffLabel(u)), Actor: actor,
			Metadata: events.Map{"expires_hours": int(inviteTTL.Hours())}})
	})
	if err != nil {
		return nil, err
	}
	s.sendInvite(ctx, id, raw, baseURL)
	return map[string]any{"invite_email_sent": true, "expires_hours": int(inviteTTL.Hours())}, nil
}

// randomSuffix makes the unusable-password marker unique like Django's
// set_unusable_password ("!" + 40 random chars).
func randomSuffix() string { return kuraID("X", 40)[2:] }
