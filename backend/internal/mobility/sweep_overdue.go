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

// flagOverdue is stage 1 (48 h): each newly overdue pack gets one
// UNRETURNED_48H risk event and a notice to the owner (and chairman). The
// pack stays ISSUED on its vehicle so a walk-in swap can still return it;
// only that vehicle stops booking (assertVehicleNotOverdue).
func flagOverdue(ctx context.Context, pool *pgxpool.Pool, mailer *mail.Mailer, limit int) (int, error) {
	due, err := db.New(pool).OverdueBatteryIDs(ctx, int32(limit))
	if err != nil {
		return 0, err
	}
	n := 0
	for _, id := range due {
		var email *mail.Message
		var done bool
		err := database.InTx(ctx, pool, func(tx pgx.Tx) error {
			var err error
			done, email, err = flagOverdueOne(ctx, db.New(tx), id)
			return err
		})
		if err != nil {
			return n, err
		}
		if email != nil && mailer != nil {
			go mailer.Send(context.WithoutCancel(ctx), *email)
		}
		if done {
			n++
		}
	}
	return n, nil
}

func flagOverdueOne(ctx context.Context, q *db.Queries, id uuid.UUID) (bool, *mail.Message, error) {
	b, err := q.IssuedBatteryForUpdate(ctx, id)
	if database.IsNoRows(err) {
		return false, nil, nil
	}
	if err != nil {
		return false, nil, err
	}
	v, err := q.MountedVehicle(ctx, &b.ID)
	if database.IsNoRows(err) {
		// Not on a vehicle (custody elsewhere): just raise the flag.
		_, err = risk.Emit(ctx, q, risk.Event{RuleCode: "UNRETURNED_48H", SubjectType: "battery",
			SubjectID: b.ID.String(), ActionTaken: "FLAG", Context: map[string]any{"serial": b.Serial}})
		return err == nil, nil, err
	}
	if err != nil {
		return false, nil, err
	}
	acct, err := q.AccountByID(ctx, v.AccountID)
	if err != nil {
		return false, nil, err
	}
	if _, err := risk.Emit(ctx, q, risk.Event{RuleCode: "UNRETURNED_48H", SubjectType: "battery",
		SubjectID: b.ID.String(), AccountID: &acct.ID, ActionTaken: "BLOCK_VEHICLE",
		Context: map[string]any{"serial": b.Serial, "vehicle": v.RegistrationPlate}}); err != nil {
		return false, nil, err
	}
	target, owner, err := unreturnedTargets(ctx, q, &acct)
	if err != nil {
		return false, nil, err
	}
	body := "Pack " + b.Serial + " on " + v.RegistrationPlate + " is past the 48-hour return window. Booking for " +
		v.RegistrationPlate + " is paused — ride it to any Kura hub to swap. If it isn't back within 7 days the account is suspended."
	notify := []events.NotifySpec{{UserID: owner.ID, Title: "Battery overdue: " + v.RegistrationPlate, Body: body,
		Source: "Batteries", Severity: events.Warning, LinkPath: "/swap", TemplateCode: "battery.overdue",
		DedupeKey: "battery.overdue:" + b.ID.String() + ":" + owner.ID.String()}}
	if target.ID != owner.ID {
		notify = append(notify, events.NotifySpec{UserID: target.ID, Title: "Battery overdue: " + v.RegistrationPlate,
			Body: body, Source: "Batteries", Severity: events.Warning, LinkPath: "/batteries/" + b.ID.String(),
			TemplateCode: "battery.overdue", DedupeKey: "battery.overdue:" + b.ID.String() + ":" + target.ID.String()})
	}
	if err := events.Emit(ctx, q, events.Event{Action: "battery.overdue", SubjectType: "battery",
		SubjectID: b.ID.String(), SubjectLabel: b.Serial,
		Metadata: events.Map{"account_id": acct.ID.String(), "vehicle": v.RegistrationPlate},
		Notify:   notify}); err != nil {
		return false, nil, err
	}
	var email *mail.Message
	if target.Email != nil && *target.Email != "" {
		label := acct.KuraID
		if label == "" {
			label = acct.DisplayName
		}
		email = &mail.Message{To: []string{*target.Email}, Subject: "Battery overdue: " + b.Serial,
			Template: "battery_unreturned", Context: map[string]any{"first_name": target.FirstName,
				"serial": b.Serial, "plate": v.RegistrationPlate, "account_label": label}}
	}
	return true, email, nil
}
