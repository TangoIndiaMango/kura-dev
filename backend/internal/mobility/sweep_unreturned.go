package mobility

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/mail"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/risk"
)

func userActor(u db.AccountsUser) *events.Actor {
	email := ""
	if u.Email != nil {
		email = *u.Email
	}
	phone := ""
	if u.Phone != nil {
		phone = *u.Phone
	}
	return &events.Actor{ID: u.ID, Email: email, Phone: phone, Role: u.Role}
}

// FlagUnreturned handles packs not brought back:
//   - 48 h (UNRETURNED_48H, flagOverdue): flagged once; booking for that
//     vehicle is paused (reservation guard) and the owner / chairman told.
//     Other vehicles on the account keep booking; a walk-in swap returns it.
//   - 7 days (UNRETURNED_7D, flagOne): the pack goes LOST, the chairman (or
//     owner) is told and emailed, and an ACTIVE account is suspended.
func FlagUnreturned(ctx context.Context, pool *pgxpool.Pool, mailer *mail.Mailer, limit int) (map[string]any, error) {
	flagged, err := flagOverdue(ctx, pool, mailer, limit)
	if err != nil {
		return nil, err
	}
	due, err := db.New(pool).LostBatteryIDs(ctx, int32(limit))
	if err != nil {
		return nil, err
	}
	processed, suspended := 0, 0
	for _, id := range due {
		var email *mail.Message
		var done, susp bool
		err := database.InTx(ctx, pool, func(tx pgx.Tx) error {
			var err error
			done, susp, email, err = flagOne(ctx, db.New(tx), id)
			return err
		})
		if err != nil {
			return nil, err
		}
		if email != nil && mailer != nil {
			go mailer.Send(context.WithoutCancel(ctx), *email)
		}
		if done {
			processed++
		}
		if susp {
			suspended++
		}
	}
	return map[string]any{"overdue_flagged": flagged, "processed": processed, "suspended": suspended}, nil
}

func flagOne(ctx context.Context, q *db.Queries, id uuid.UUID) (bool, bool, *mail.Message, error) {
	b, err := q.IssuedBatteryForUpdate(ctx, id)
	if database.IsNoRows(err) {
		return false, false, nil, nil
	}
	if err != nil {
		return false, false, nil, err
	}
	var acct *db.AccountsAccount
	if v, err := q.MountedVehicle(ctx, &b.ID); err == nil {
		a, err := q.AccountByID(ctx, v.AccountID)
		if err != nil {
			return false, false, nil, err
		}
		acct = &a
	} else if !database.IsNoRows(err) {
		return false, false, nil, err
	}
	var acctID *uuid.UUID
	if acct != nil {
		acctID = &acct.ID
	}
	if _, err := risk.Emit(ctx, q, risk.Event{RuleCode: "UNRETURNED_7D", SubjectType: "battery",
		SubjectID: b.ID.String(), AccountID: acctID, ActionTaken: "SUSPEND",
		Context: map[string]any{"serial": b.Serial}}); err != nil {
		return false, false, nil, err
	}
	fromType, fromID := b.CustodianType, b.CustodianID
	b.Status = "LOST"
	custodian(&b, "NONE", nil, nil, true)
	if err := saveBattery(ctx, q, b); err != nil {
		return false, false, nil, err
	}
	if err := recordBatteryEvent(ctx, q, b, custodyEvent{Event: "LOST", FromType: fromType, FromID: fromID,
		FromSet: true, ToType: "NONE", Meta: map[string]any{"reason": "UNRETURNED_7D"}, Source: "SYSTEM"}); err != nil {
		return false, false, nil, err
	}
	target, owner, err := unreturnedTargets(ctx, q, acct)
	if err != nil {
		return false, false, nil, err
	}
	var email *mail.Message
	if target != nil {
		var acctOut any
		if acct != nil {
			acctOut = acct.ID.String()
		}
		if err := events.Emit(ctx, q, events.Event{Action: "battery.unreturned", SubjectType: "battery",
			SubjectID: b.ID.String(), SubjectLabel: b.Serial, After: events.Map{"status": "LOST"},
			Metadata: events.Map{"account_id": acctOut, "notify_user_id": target.ID.String()},
			Notify: []events.NotifySpec{{UserID: target.ID, Title: "Battery " + b.Serial + " unreturned",
				Body:   "Pack out for more than 7 days — account suspended pending recovery.",
				Source: "Batteries", Severity: events.Warning, LinkPath: "/batteries/" + b.ID.String(),
				TemplateCode: "battery.unreturned", DedupeKey: "battery.unreturned:" + b.ID.String()}}}); err != nil {
			return false, false, nil, err
		}
		if acct != nil && target.Email != nil && *target.Email != "" {
			label := acct.KuraID
			if label == "" {
				label = acct.DisplayName
			}
			email = &mail.Message{To: []string{*target.Email}, Subject: "Unreturned battery " + b.Serial,
				Template: "battery_unreturned", Context: map[string]any{"first_name": target.FirstName,
					"serial": b.Serial, "account_label": label, "suspended": true}}
		}
	}
	susp := false
	if acct != nil && acct.Status == "ACTIVE" && owner != nil {
		if err := suspendForUnreturned(ctx, q, *acct, *owner, "UNRETURNED_7D battery "+b.Serial); err != nil {
			return false, false, nil, err
		}
		susp = true
	}
	return true, susp, email, nil
}

// unreturnedTargets is _notify_target: an active chairman, else the owner.
func unreturnedTargets(ctx context.Context, q *db.Queries, acct *db.AccountsAccount) (*db.AccountsUser, *db.AccountsUser, error) {
	if acct == nil {
		return nil, nil, nil
	}
	owner, err := q.GetUserRow(ctx, acct.OwnerUserID)
	if err != nil {
		return nil, nil, err
	}
	if acct.CooperativeID != nil {
		c, err := q.CooperativeByID(ctx, *acct.CooperativeID)
		if err == nil && c.ChairmanUserID != nil {
			chair, err := q.GetUserRow(ctx, *c.ChairmanUserID)
			if err == nil && chair.IsActive {
				return &chair, &owner, nil
			}
		}
	}
	return &owner, &owner, nil
}

// suspendForUnreturned is AccountService.suspend with the owner as actor.
func suspendForUnreturned(ctx context.Context, q *db.Queries, a db.AccountsAccount, owner db.AccountsUser, reason string) error {
	if err := q.SetAccountStatusOnly(ctx, db.SetAccountStatusOnlyParams{ID: a.ID, Status: "SUSPENDED"}); err != nil {
		return err
	}
	label := a.KuraID
	if label == "" {
		label = a.DisplayName
	}
	if label == "" {
		label = a.ID.String()
	}
	body := reason
	if r := []rune(body); len(r) > 120 {
		body = string(r[:120])
	}
	return events.Emit(ctx, q, events.Event{Action: "account.suspended", SubjectType: "account",
		SubjectID: a.ID.String(), SubjectLabel: label, Actor: userActor(owner),
		Before: events.Map{"status": a.Status}, After: events.Map{"status": "SUSPENDED"},
		Metadata: events.Map{"reason": reason},
		Notify: []events.NotifySpec{{UserID: owner.ID, Title: "Operator suspended", Body: label + " suspended: " + body,
			Source: "Users", LinkPath: "/operators/" + a.ID.String(), TemplateCode: "account.suspended",
			DedupeKey: "account.suspended:" + a.ID.String()}}})
}
