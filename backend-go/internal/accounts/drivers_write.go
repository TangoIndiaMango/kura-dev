package accounts

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
)

type attachReq struct {
	AccountID      *uuid.UUID `json:"account_id" validate:"required"`
	Phone          string     `json:"phone" validate:"required,max=20"`
	FirstName      string     `json:"first_name" validate:"max=80"`
	LastName       string     `json:"last_name" validate:"max=80"`
	LicenseNumber  string     `json:"license_number" validate:"max=50"`
	DailySwapLimit *int16     `json:"daily_swap_limit" validate:"omitempty,min=1"`
	DailySpendKobo *int64     `json:"daily_spend_kobo_limit" validate:"omitempty,min=0"`
}

// assertAccountManage: staff with accounts:manage, or the account owner.
func assertAccountManage(r *http.Request, owner uuid.UUID) error {
	p := reqctx.User(r.Context())
	if p.Can("accounts:manage") || owner.String() == p.UserID {
		return nil
	}
	return apperr.New("FORBIDDEN", "Only the account owner can manage fleet drivers.").WithStatus(http.StatusForbidden)
}

func (h *DriverHandler) attach(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b attachReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	acct, err := h.q.AccountByID(ctx, *b.AccountID)
	if database.IsNoRows(err) {
		respond.Error(w, r, apperr.New("NOT_FOUND", "Account not found.").WithStatus(http.StatusNotFound))
		return
	}
	if err == nil {
		err = assertAccountManage(r, acct.OwnerUserID)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	e164, err := NormalizeNGPhone(b.Phone)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	var driverID uuid.UUID
	err = database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		driverID, err = attachDriver(ctx, db.New(tx), acct, e164, b)
		return err
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	d, err := h.q.GetDriverRow(ctx, driverID)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.Created(w, driverDTO(d))
}

// attachDriver is DriverService.attach (create or re-attach, promote fleet).
func attachDriver(ctx context.Context, q *db.Queries, acct db.AccountsAccount, e164 string, b attachReq) (uuid.UUID, error) {
	who, err := actor.FromRequest(ctx, q)
	if err != nil {
		return uuid.Nil, err
	}
	user, err := q.GetUserByPhone(ctx, &e164)
	created := false
	if database.IsNoRows(err) {
		uid := ids.New()
		pub, err := uniquePublicID(ctx, q, "OP")
		if err != nil {
			return uuid.Nil, err
		}
		if err := q.InsertFleetDriverUser(ctx, db.InsertFleetDriverUserParams{ID: uid, Password: "!" + randomSuffix(),
			Phone: &e164, FirstName: strings.TrimSpace(b.FirstName), LastName: strings.TrimSpace(b.LastName),
			PublicID: &pub}); err != nil {
			return uuid.Nil, err
		}
		if user, err = q.GetUserByPhone(ctx, &e164); err != nil {
			return uuid.Nil, err
		}
		created = true
	} else if err != nil {
		return uuid.Nil, err
	} else if !operatorRoles[user.Role] {
		return uuid.Nil, apperr.Conflict("VALIDATION_ERROR", "Phone belongs to a staff user and cannot be a fleet driver.")
	}
	existing, err := q.DriverByUser(ctx, user.ID)
	has := err == nil
	if err != nil && !database.IsNoRows(err) {
		return uuid.Nil, err
	}
	if has && existing.AccountID != acct.ID {
		return uuid.Nil, apperr.Conflict("DRIVER_ON_OTHER_ACCOUNT", "This phone is already a driver on another account.")
	}
	var before events.Map
	action, id := "driver.attached", ids.New()
	swap, spend := b.DailySwapLimit, b.DailySpendKobo
	if has {
		id, action = existing.ID, "driver.reattached"
		before = events.Map{"status": existing.Status, "daily_swap_limit": existing.DailySwapLimit,
			"daily_spend_kobo_limit": existing.DailySpendKoboLimit}
		lic := truncate(firstNonEmpty(b.LicenseNumber, existing.LicenseNumber), 50)
		if swap == nil {
			swap = existing.DailySwapLimit
		}
		if spend == nil {
			spend = existing.DailySpendKoboLimit
		}
		err = q.ReattachDriver(ctx, db.ReattachDriverParams{ID: id, LicenseNumber: lic, DailySwapLimit: swap,
			DailySpendKoboLimit: spend})
	} else {
		err = q.InsertFleetDriver(ctx, db.InsertFleetDriverParams{ID: id, LicenseNumber: truncate(b.LicenseNumber, 50),
			AccountID: acct.ID, UserID: user.ID, DailySwapLimit: swap, DailySpendKoboLimit: spend})
	}
	if err != nil {
		return uuid.Nil, err
	}
	if err := maybePromoteFleet(ctx, q, acct.ID, who); err != nil {
		return uuid.Nil, err
	}
	ev := events.Event{Action: action, SubjectType: "driver", SubjectID: id.String(), SubjectLabel: e164,
		Actor: who, Before: before, After: events.Map{"account_id": acct.ID.String(), "user_id": user.ID.String(),
			"created_user": created, "daily_swap_limit": swap, "daily_spend_kobo_limit": spend}}
	if who == nil || who.ID != user.ID {
		ev.Notify = []events.NotifySpec{{UserID: user.ID, Title: "Added to fleet",
			Body:   fmt.Sprintf("You can swap on %s (%s).", acct.DisplayName, acct.KuraID),
			Source: "Fleet", Severity: events.Info, Channels: []string{events.InApp},
			TemplateCode: "driver.attached", LinkPath: "/", Params: events.Map{"account_id": acct.ID.String()},
			DedupeKey: "driver.attached:" + id.String() + ":" + acct.ID.String()}}
	}
	return id, events.Emit(ctx, q, ev)
}

// maybePromoteFleet is VehicleService._maybe_promote_fleet (2+ vehicles).
func maybePromoteFleet(ctx context.Context, q *db.Queries, accountID uuid.UUID, who *events.Actor) error {
	a, err := q.AccountForUpdate(ctx, accountID)
	if database.IsNoRows(err) || (err == nil && a.Kind == "FLEET") {
		return nil
	}
	if err != nil {
		return err
	}
	n, err := q.AccountVehicleCount(ctx, accountID)
	if err != nil || n < 2 {
		return err
	}
	if err := q.SetAccountKind(ctx, db.SetAccountKindParams{ID: accountID, Kind: "FLEET"}); err != nil {
		return err
	}
	return events.Emit(ctx, q, events.Event{Action: "account.promoted_fleet", SubjectType: "account",
		SubjectID: accountID.String(), SubjectLabel: a.DisplayName, Actor: who,
		Before: events.Map{"kind": a.Kind}, After: events.Map{"kind": "FLEET"},
		Metadata: events.Map{"reason": "vehicle_count_gte_2"}})
}

// patch updates soft limits; keys present with null clear a limit.
func (h *DriverHandler) patch(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	d, err := h.object(r)
	if err == nil {
		err = assertAccountManage(r, d.OwnerUserID)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	var raw map[string]json.RawMessage
	if err := decode.JSON(r, &raw); err != nil {
		respond.Error(w, r, err)
		return
	}
	swap, spend := d.DailySwapLimit, d.DailySpendKoboLimit
	_, hasSwap := raw["daily_swap_limit"]
	_, hasSpend := raw["daily_spend_kobo_limit"]
	if !hasSwap && !hasSpend {
		respond.Error(w, r, apperr.New("VALIDATION_ERROR", "Provide daily_swap_limit and/or daily_spend_kobo_limit."))
		return
	}
	if err := limitField(raw, "daily_swap_limit", 1, func(v *int64) { swap = int16Ptr(v) }); err != nil {
		respond.Error(w, r, err)
		return
	}
	if err := limitField(raw, "daily_spend_kobo_limit", 0, func(v *int64) { spend = v }); err != nil {
		respond.Error(w, r, err)
		return
	}
	err = database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		if err := q.SetDriverLimits(ctx, db.SetDriverLimitsParams{ID: d.ID, DailySwapLimit: swap,
			DailySpendKoboLimit: spend}); err != nil {
			return err
		}
		who, err := actor.FromRequest(ctx, q)
		if err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "driver.limits_updated", SubjectType: "driver",
			SubjectID: d.ID.String(), SubjectLabel: firstNonEmpty(str(d.Phone), d.ID.String()), Actor: who,
			Before: events.Map{"daily_swap_limit": d.DailySwapLimit, "daily_spend_kobo_limit": d.DailySpendKoboLimit},
			After:  events.Map{"daily_swap_limit": swap, "daily_spend_kobo_limit": spend}})
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.get(w, r)
}

// limitField applies an optional nullable integer field with a minimum
// (DRF IntegerField(min_value=..., allow_null=True)).
func limitField(raw map[string]json.RawMessage, key string, minV int64, set func(*int64)) error {
	v, ok := raw[key]
	if !ok {
		return nil
	}
	if strings.TrimSpace(string(v)) == "null" {
		set(nil)
		return nil
	}
	var n int64
	if err := json.Unmarshal(v, &n); err != nil {
		return apperr.Field(key, "A valid integer is required.")
	}
	if n < minV {
		return apperr.Field(key, fmt.Sprintf("Ensure this value is greater than or equal to %d.", minV))
	}
	set(&n)
	return nil
}

func int16Ptr(v *int64) *int16 {
	if v == nil {
		return nil
	}
	n := int16(*v)
	return &n
}
