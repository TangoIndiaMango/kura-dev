package accounts

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/auth"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
)

var lagos = mustZone("Africa/Lagos")

func mustZone(name string) *time.Location {
	loc, err := time.LoadLocation(name)
	if err != nil {
		panic(err)
	}
	return loc
}

// wat formats a moment as riders and staff read it (Lagos time).
func wat(t time.Time) string { return t.In(lagos).Format("02 Jan 2006 · 15:04") }

// LoginResult is what login endpoints return besides the user body.
type LoginResult struct {
	Pair        auth.Pair
	User        db.AccountsUser
	DisplayName string
}

// StaffLogin mirrors AuthService.staff_login (email or phone + password).
func (s *AuthService) StaffLogin(ctx context.Context, identifier, password string) (LoginResult, error) {
	identifier = strings.TrimSpace(identifier)
	var user db.AccountsUser
	var err error
	if strings.Contains(identifier, "@") {
		user, err = s.q.GetUserByEmail(ctx, identifier)
	} else if phone, perr := NormalizeNGPhone(identifier); perr == nil {
		user, err = s.q.GetUserByPhone(ctx, &phone)
	} else {
		user, err = s.q.GetUserByPhone(ctx, &identifier)
	}
	invalid := apperr.New("AUTH_INVALID", "Invalid email/phone or password.").WithStatus(http.StatusUnauthorized)
	if database.IsNoRows(err) || (err == nil && !auth.CheckPassword(password, user.Password)) {
		return LoginResult{}, invalid
	}
	if err != nil {
		return LoginResult{}, err
	}
	if !user.IsActive {
		return LoginResult{}, apperr.New("AUTH_DISABLED", "This account is disabled.").WithStatus(http.StatusForbidden)
	}
	if !user.IsStaff && !user.IsSuperuser {
		return LoginResult{}, invalid
	}

	var out LoginResult
	err = database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		when, err := q.TouchLastLogin(ctx, user.ID)
		if err != nil {
			return err
		}
		label := firstNonEmpty(str(user.PublicID), str(user.Email), str(user.Phone), user.ID.String())
		display := firstNonEmpty(strings.TrimSpace(user.FirstName+" "+user.LastName), label)
		if err := events.Emit(ctx, q, events.Event{
			Action: "auth.staff_login", SubjectType: "user", SubjectID: user.ID.String(),
			SubjectLabel: label, Actor: actorOf(user),
			Metadata: events.Map{"channel": "staff", "email": str(user.Email)},
			Notify: []events.NotifySpec{{UserID: user.ID, Title: "Console sign-in",
				Body: display + " (" + label + ") signed in to the admin console at " +
					wat(*when) + " WAT.",
				Source: "System", Severity: events.Info, LinkPath: "/audit",
				TemplateCode: "auth.staff_login",
				Params: events.Map{"user_id": user.ID.String(), "public_id": str(user.PublicID),
					"email": str(user.Email), "channel": "staff", "at": when.Format(time.RFC3339Nano)}}},
		}); err != nil {
			return err
		}
		out.Pair, err = s.issueTokens(ctx, q, user.ID, int(user.SessionVersion))
		return err
	})
	out.User = user
	return out, err
}

// BeginLogin routes a phone to PIN (has one) or OTP — no SMS, no throttle burn.
func (s *AuthService) BeginLogin(ctx context.Context, phone, channel string) (map[string]any, error) {
	e164, err := NormalizeNGPhone(phone)
	if err != nil {
		return nil, err
	}
	user, err := s.q.GetUserByPhone(ctx, &e164)
	if err == nil && user.IsActive && user.PinHash != "" {
		name := strings.TrimSpace(user.FirstName + " " + user.LastName)
		if name == "" {
			name, _ = s.q.FirstAccountDisplayName(ctx, user.ID)
		}
		var display any
		if name != "" {
			display = name
		}
		return map[string]any{"status": "accepted", "next": "pin",
			"message": "Enter your PIN to continue.", "phone": e164, "purpose": "LOGIN",
			"channel": channel, "has_pin": true, "display_name": display}, nil
	}
	if err != nil && !database.IsNoRows(err) {
		return nil, err
	}
	return map[string]any{"status": "accepted", "next": "otp",
		"message": "We'll text a 6-digit code to this number.", "phone": e164,
		"purpose": "LOGIN", "channel": channel, "has_pin": false}, nil
}

func actorOf(u db.AccountsUser) *events.Actor {
	return &events.Actor{ID: u.ID, Email: str(u.Email), Phone: str(u.Phone), Role: u.Role}
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}
