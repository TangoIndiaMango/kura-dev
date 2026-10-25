package mobility

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/risk"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/scope"
)

// startIn is SwapStartRequestSerializer.
type startIn struct {
	HubID         uuid.UUID  `json:"hub_id" validate:"required"`
	ClientEventID string     `json:"client_event_id" validate:"required,max=100"`
	ReservationID *uuid.UUID `json:"reservation_id"`
	VehicleID     *uuid.UUID `json:"vehicle_id"`
	VehicleQR     string     `json:"vehicle_qr"`
	DriverID      *uuid.UUID `json:"driver_id"`
	AccountID     *uuid.UUID `json:"account_id"`
}

func needVehicle() error {
	return apperr.New("VALIDATION_ERROR", "Provide reservation_id or vehicle_id / vehicle_qr.")
}

// peek is _peek_vehicle_account (velocity needs the vehicle before the tx).
func (b *Bay) peek(ctx context.Context, in startIn) (uuid.UUID, *uuid.UUID, error) {
	switch {
	case in.ReservationID != nil:
		r, err := b.q.ReservationByID(ctx, *in.ReservationID)
		if database.IsNoRows(err) {
			return uuid.Nil, nil, apperr.NotFound("Reservation not found.")
		}
		return r.VehicleID, &r.AccountID, err
	case in.VehicleQR != "":
		v, err := resolveVehicleQR(ctx, b.pool, b.signer, in.VehicleQR)
		return v.ID, b.knownAccount(ctx, in.AccountID), err
	case in.VehicleID != nil:
		return *in.VehicleID, b.knownAccount(ctx, in.AccountID), nil
	}
	return uuid.Nil, nil, needVehicle()
}

func (b *Bay) knownAccount(ctx context.Context, id *uuid.UUID) *uuid.UUID {
	if id == nil {
		return nil
	}
	if _, err := b.q.AccountByID(ctx, *id); err != nil {
		return nil
	}
	return id
}

// startSwap is start_swap: idempotent on client_event_id; an open session
// for the reservation or the walk-in vehicle at this hub is resumed (resumed
// = true) rather than duplicated; velocity is checked (committed) first.
func (b *Bay) startSwap(ctx context.Context, in startIn) (uuid.UUID, bool, error) {
	cid := strings.TrimSpace(in.ClientEventID)
	if cid == "" {
		return uuid.Nil, false, apperr.New("VALIDATION_ERROR", "client_event_id is required.").
			WithDetails(apperr.Details{"client_event_id": []string{"required"}})
	}
	hubs, err := scope.HubsFor(ctx, b.q, reqctx.User(ctx))
	if err != nil {
		return uuid.Nil, false, err
	}
	if !hubs.All && !contains(hubs.IDs, in.HubID) {
		return uuid.Nil, false, apperr.NotFound("Hub not found.")
	}
	if s, err := b.q.SwapByClientEvent(ctx, cid); err == nil {
		return s.ID, false, nil // the same start, retried
	} else if !database.IsNoRows(err) {
		return uuid.Nil, false, err
	}
	vehicle, account, err := b.peek(ctx, in)
	if err != nil {
		return uuid.Nil, false, err
	}
	// Picking up this vehicle's open session here is not a new swap: skip the
	// velocity check (startTx re-checks the session under the vehicle lock).
	if open, err := b.q.OpenSwapForVehicle(ctx, vehicle); err != nil || open.HubID != in.HubID {
		if err := risk.AssertSwapVelocity(ctx, b.pool, vehicle, account); err != nil {
			return uuid.Nil, false, err
		}
	}
	var id uuid.UUID
	var resumed bool
	err = b.tx(ctx, func(q *db.Queries, who *events.Actor) error {
		var err error
		id, resumed, err = b.startTx(ctx, q, in, cid, who)
		return err
	})
	if _, dup := database.IsUniqueViolation(err); dup {
		if s, gerr := b.q.SwapByClientEvent(ctx, cid); gerr == nil {
			return s.ID, false, nil
		}
		return uuid.Nil, false, apperr.Conflict("INVALID_TRANSITION", "Could not start swap (conflict).")
	}
	return id, resumed, err
}

func (b *Bay) startTx(ctx context.Context, q *db.Queries, in startIn, cid string, who *events.Actor) (uuid.UUID, bool, error) {
	if s, err := q.SwapByClientEvent(ctx, cid); err == nil {
		return s.ID, false, nil
	} else if !database.IsNoRows(err) {
		return uuid.Nil, false, err
	}
	hub, err := q.HubForUpdate(ctx, in.HubID)
	if database.IsNoRows(err) {
		return uuid.Nil, false, apperr.NotFound("No Hub matches the given query.")
	}
	if err != nil {
		return uuid.Nil, false, err
	}
	var res *db.MobilityReservation
	var v db.MobilityVehicle
	driverID, accountID := in.DriverID, in.AccountID
	if in.ReservationID != nil {
		r, err := q.ReservationForUpdate(ctx, *in.ReservationID)
		if database.IsNoRows(err) {
			return uuid.Nil, false, apperr.NotFound("Reservation not found.")
		}
		if err == nil {
			r, err = ensureFresh(ctx, q, r)
		}
		if err != nil {
			return uuid.Nil, false, err
		}
		if r.Status == "USED" {
			return uuid.Nil, false, apperr.Conflict("INVALID_TRANSITION", "Reservation already used.")
		}
		if r.Status != "CONFIRMED" && r.Status != "PENDING" {
			return uuid.Nil, false, apperr.Conflict("INVALID_TRANSITION", fmt.Sprintf("Reservation status %s cannot start.", r.Status))
		}
		if open, err := q.OpenSwapForReservation(ctx, &r.ID); err == nil {
			return open.ID, true, nil
		} else if !database.IsNoRows(err) {
			return uuid.Nil, false, err
		}
		if done, err := q.ReservationHasCompletedSwap(ctx, &r.ID); err != nil || done {
			if err == nil {
				err = apperr.Conflict("INVALID_TRANSITION", "Reservation already has a completed swap.")
			}
			return uuid.Nil, false, err
		}
		if r.HubID != hub.ID {
			rh, _ := q.HubRow(ctx, r.HubID)
			return uuid.Nil, false, apperr.Conflict("RESERVATION_HUB_MISMATCH", fmt.Sprintf("This hold is for %s, not the current bay.", rh.Code))
		}
		if v, err = q.VehicleForUpdate(ctx, r.VehicleID); err != nil {
			return uuid.Nil, false, err
		}
		res, driverID, accountID = &r, &r.DriverID, &r.AccountID
	} else {
		vid := in.VehicleID
		if in.VehicleQR != "" {
			qv, err := resolveVehicleQR(ctx, b.pool, b.signer, in.VehicleQR)
			if err != nil {
				return uuid.Nil, false, err
			}
			vid = &qv.ID
		} else if vid == nil {
			return uuid.Nil, false, needVehicle()
		}
		if v, err = q.VehicleForUpdate(ctx, *vid); database.IsNoRows(err) {
			return uuid.Nil, false, apperr.NotFound("Vehicle not found.")
		} else if err != nil {
			return uuid.Nil, false, err
		}
		if driverID == nil || accountID == nil {
			return uuid.Nil, false, apperr.New("VALIDATION_ERROR", "driver_id and account_id are required for walk-in start.")
		}
	}
	// One bay session per vehicle (the vehicle row is locked above): pick up
	// the open one instead of starting a second.
	if open, err := q.OpenSwapForVehicle(ctx, v.ID); err == nil {
		switch {
		case open.HubID != hub.ID:
			return uuid.Nil, false, apperr.Conflict("SWAP_IN_PROGRESS", fmt.Sprintf(
				"%s has a swap in progress at %s — finish or cancel it there first.", v.RegistrationPlate, open.HubCode)).
				WithDetails(apperr.Details{"swap_id": open.ID.String(), "hub": open.HubCode})
		case res != nil:
			return uuid.Nil, false, apperr.Conflict("SWAP_IN_PROGRESS", fmt.Sprintf(
				"%s already has a walk-in session in progress here — continue or cancel it first.", v.RegistrationPlate)).
				WithDetails(apperr.Details{"swap_id": open.ID.String(), "hub": open.HubCode})
		}
		return open.ID, true, nil
	} else if !database.IsNoRows(err) {
		return uuid.Nil, false, err
	}
	if err := assertMayUse(driverID, v); err != nil {
		return uuid.Nil, false, err
	}
	// A walk-in pays with Paystack at the bay unless a plan covers it (the
	// desk can still settle another way at Complete).
	mode, source := "PAYSTACK", "HUB_APP"
	if res != nil {
		mode, source = res.PaymentMode, res.Source
	} else if _, err := planCovers(ctx, q, v.ID); err == nil {
		mode = "PLAN"
	} else if _, isApp := apperr.As(err); !isApp {
		return uuid.Nil, false, err
	}
	agent := actorID(who)
	id, now := ids.New(), time.Now()
	if err := q.InsertSwap(ctx, db.InsertSwapParams{ID: id, ReturnedChargePct: 15, IssuedChargePct: 100,
		PaymentMode: mode, Status: "STARTED", ClientEventID: cid,
		AccountID: *accountID, AgentID: agent, DriverID: *driverID, HubID: hub.ID, ReservationID: idOf(res),
		VehicleID: v.ID, Source: source, StartedAt: &now}); err != nil {
		return uuid.Nil, false, err
	}
	return id, false, events.Emit(ctx, q, events.Event{Action: "swap.started", SubjectType: "swap", SubjectID: id.String(),
		Actor: who, Metadata: events.Map{"hub": hub.Code, "vehicle": v.RegistrationPlate, "client_event_id": cid,
			"first_swap": v.CurrentBatteryID == nil}})
}

func idOf(r *db.MobilityReservation) *uuid.UUID {
	if r == nil {
		return nil
	}
	return &r.ID
}
