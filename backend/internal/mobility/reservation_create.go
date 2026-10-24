package mobility

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/credit"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/finance"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platformcfg"
)

// CreateIn is ReservationService.create_reservation's arguments.
type CreateIn struct {
	Account      db.AccountsAccount
	Vehicle      db.MobilityVehicle
	Driver       db.AccountsDriver
	Hub          db.MobilityHub
	Mode, Source string
	Code         string
}

// createReservation is ReservationService.create_reservation: one live hold
// per vehicle, a RESERVED pack, sealed QR, optional booking discount and the
// wallet hold. Returns the reservation id (an existing live hold is reused).
func (b *Bay) createReservation(ctx context.Context, q *db.Queries, in CreateIn) (uuid.UUID, error) {
	mode := strings.ToUpper(in.Mode)
	if mode == "" {
		mode = "WALLET"
	}
	model, err := q.VehicleModelByID(ctx, in.Vehicle.VehicleModelID)
	if err != nil {
		return uuid.Nil, err
	}
	pol, err := holdPolicy(ctx, q)
	if err != nil {
		return uuid.Nil, err
	}
	var fee, list int64
	if mode != "PLAN" {
		if list, err = ppsKobo(ctx, q, model.VehicleType); err != nil {
			return uuid.Nil, err
		}
		fee = list
	}
	if r, err := q.LiveReservationForVehicle(ctx, in.Vehicle.ID); err == nil {
		return r.ID, nil
	} else if !database.IsNoRows(err) {
		return uuid.Nil, err
	}
	source := strings.ToUpper(in.Source)
	if source == "" {
		source = "APP"
	}
	vehicles, err := q.AccountVehicleTotal(ctx, in.Account.ID)
	if err != nil {
		return uuid.Nil, err
	}
	code := strings.ToUpper(strings.TrimSpace(in.Code))
	var quote *Quote
	if code != "" && mode != "PLAN" {
		qt, err := quoteDiscount(ctx, q, code, list, "swap", sourceChannel(source), nil, vehicles)
		if err != nil {
			return uuid.Nil, err
		}
		quote, fee = &qt, qt.Due
	}
	if in.Account.Status != "ACTIVE" {
		return uuid.Nil, apperr.Conflict("ACCOUNT_RESTRICTED", "Account cannot reserve while not ACTIVE.")
	}
	driverUser := &events.Actor{ID: in.Driver.UserID}
	if err := assertMayUse(&in.Driver.ID, in.Vehicle); err != nil {
		return uuid.Nil, err
	}
	if err := assertWithinLimits(ctx, q, in.Driver.ID, fee); err != nil {
		return uuid.Nil, err
	}
	if err := b.clearIncomplete(ctx, q, in.Vehicle.ID, driverUser); err != nil {
		return uuid.Nil, err
	}
	if err := assertVehicleNotOverdue(ctx, q, in.Vehicle.ID); err != nil {
		return uuid.Nil, err
	}
	if err := assertHubOpen(in.Hub); err != nil {
		return uuid.Nil, err
	}
	if mode == "PLAN" {
		if _, err := planCovers(ctx, q, in.Vehicle.ID); err != nil {
			return uuid.Nil, err
		}
	}
	if mode == "CREDIT" {
		if err := platformcfg.RequireEnabled(ctx, q, "credit"); err != nil {
			return uuid.Nil, err
		}
		available, err := credit.ActiveSwapCredit(ctx, q, in.Account.ID)
		if err != nil {
			return uuid.Nil, err
		}
		if available < fee {
			return uuid.Nil, apperr.Conflict("CREDIT_INSUFFICIENT", "Swap credit remaining is less than the swap fee.").
				WithDetails(map[string]any{"available_kobo": available, "shortfall_kobo": fee - available})
		}
	}
	slot, err := q.ReadySlotForUpdate(ctx, db.ReadySlotForUpdateParams{Hub: in.Hub.ID, BatteryType: &model.BatteryTypeID})
	if database.IsNoRows(err) {
		return uuid.Nil, apperr.Conflict("NO_BATTERY_AVAILABLE", "No ready battery of this vehicle’s type at this hub.")
	}
	if err != nil {
		return uuid.Nil, err
	}
	bat, err := q.BatteryForUpdate(ctx, slot.BatteryID)
	if err != nil {
		return uuid.Nil, err
	}
	bat.Status = "RESERVED"
	if err := q.SetBatteryStatus(ctx, db.SetBatteryStatusParams{ID: bat.ID, Status: "RESERVED"}); err != nil {
		return uuid.Nil, err
	}
	if err := recordBatteryEvent(ctx, q, bat, custodyEvent{Event: "RESERVED", Actor: &in.Driver.UserID, Hub: &in.Hub.ID,
		ToType: bat.CustodianType, ToID: bat.CustodianID, Source: "APP"}); err != nil {
		return uuid.Nil, err
	}
	r := db.MobilityReservation{ID: ids.New(), Status: "CONFIRMED", PaymentMode: mode, AccountID: in.Account.ID,
		BatteryID: &bat.ID, DriverID: in.Driver.ID, HubID: in.Hub.ID, VehicleID: in.Vehicle.ID, Source: source,
		ExpiresAt: time.Now().Add(time.Duration(pol.DefaultHoldMinutes) * time.Minute)}
	for i := 0; i < 8 && r.Code == ""; i++ {
		c := reservationCode()
		if taken, err := q.ReservationCodeTaken(ctx, c); err != nil {
			return uuid.Nil, err
		} else if !taken {
			r.Code = c
		}
	}
	if r.Code == "" {
		return uuid.Nil, apperr.New("RESERVATION_CODE_EXHAUSTED", "Could not allocate a unique reservation code.").
			WithStatus(503)
	}
	if err := q.InsertReservation(ctx, db.InsertReservationParams{ID: r.ID, Code: r.Code, PaymentMode: mode,
		ExpiresAt: r.ExpiresAt, AccountID: r.AccountID, BatteryID: r.BatteryID, DriverID: r.DriverID, HubID: r.HubID,
		VehicleID: r.VehicleID, Source: source}); err != nil {
		return uuid.Nil, err
	}
	if err := b.issueQR(&r); err != nil {
		return uuid.Nil, err
	}
	if quote != nil {
		key := "reservation:" + r.ID.String()
		if _, err := consumeDiscount(ctx, q, consumeIn{Code: quote.Code, Period: "swap", Channel: sourceChannel(source),
			Key: key, List: list, Account: in.Account.ID, Vehicles: vehicles}); err != nil {
			return uuid.Nil, err
		}
		r.ListPriceKobo, r.DiscountCode, r.DiscountKobo = list, quote.Code, quote.Discounted
	}
	if mode == "WALLET" && fee > 0 {
		if _, err := finance.Hold(ctx, q, finance.Account{ID: in.Account.ID, KuraID: in.Account.KuraID}, fee, r.Code); err != nil {
			return uuid.Nil, err
		}
		r.HoldAmountKobo = fee
	}
	if err := saveReservation(ctx, q, r); err != nil {
		return uuid.Nil, err
	}
	return r.ID, b.announceReservation(ctx, q, r, in, pol.DefaultHoldMinutes)
}

// announceReservation notifies the rider and the hub's on-duty staff and
// writes reservation.created.
func (b *Bay) announceReservation(ctx context.Context, q *db.Queries, r db.MobilityReservation, in CreateIn, mins int32) error {
	rider := in.Account.OwnerUserID
	notify := []events.NotifySpec{{UserID: rider, Title: "Hold confirmed",
		Body:   fmt.Sprintf("%s at %s · %d min to arrive.", r.Code, in.Hub.Name, mins),
		Source: "Swaps", Severity: events.Info, Channels: []string{events.InApp}, TemplateCode: "reservation.created",
		LinkPath: "/swap", Params: events.Map{"reservation_id": r.ID.String(), "code": r.Code, "hub_code": in.Hub.Code,
			"hold_minutes": mins},
		DedupeKey: "reservation.created:" + r.ID.String()}}
	plate := in.Vehicle.RegistrationPlate
	label := plate
	if label == "" {
		label = "vehicle"
	}
	agents, err := q.UsersForHub(ctx, in.Hub.ID)
	if err != nil {
		return err
	}
	for _, a := range agents {
		if a == rider {
			continue
		}
		notify = append(notify, events.NotifySpec{UserID: a, Title: "Incoming hold · " + in.Hub.Code,
			Body:   fmt.Sprintf("%s · %s · %d min · Attend at bay", r.Code, label, mins),
			Source: "Swaps", Severity: events.Info, Channels: []string{events.InApp},
			TemplateCode: "reservation.created.agent", LinkPath: "/hubs/" + in.Hub.ID.String() + "/swap?code=" + r.Code,
			Params: events.Map{"reservation_id": r.ID.String(), "code": r.Code, "hub_id": in.Hub.ID.String(),
				"hub_code": in.Hub.Code, "vehicle_plate": plate, "hold_minutes": mins},
			DedupeKey: "reservation.created:" + r.ID.String() + ":agent:" + a.String()})
	}
	return events.Emit(ctx, q, events.Event{Action: "reservation.created", SubjectType: "reservation",
		SubjectID: r.ID.String(), SubjectLabel: r.Code, Actor: &events.Actor{ID: in.Driver.UserID},
		Metadata: events.Map{"code": r.Code, "hub": in.Hub.Code, "payment_mode": r.PaymentMode,
			"hold_amount_kobo": r.HoldAmountKobo, "hold_minutes": mins, "list_price_kobo": r.ListPriceKobo,
			"discount_code": r.DiscountCode, "discount_kobo": r.DiscountKobo},
		Notify: notify})
}
