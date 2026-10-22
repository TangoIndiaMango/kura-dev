package mobility

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/risk"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/scope"
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

// startSwap is start_swap: idempotent on client_event_id; a reservation's
// open session is resumed; velocity is checked (committed) first.
func (b *Bay) startSwap(ctx context.Context, in startIn) (uuid.UUID, error) {
	cid := strings.TrimSpace(in.ClientEventID)
	if cid == "" {
		return uuid.Nil, apperr.New("VALIDATION_ERROR", "client_event_id is required.").
			WithDetails(apperr.Details{"client_event_id": []string{"required"}})
	}
	hubs, err := scope.HubsFor(ctx, b.q, reqctx.User(ctx))
	if err != nil {
		return uuid.Nil, err
	}
	if !hubs.All && !contains(hubs.IDs, in.HubID) {
		return uuid.Nil, apperr.NotFound("Hub not found.")
	}
	if s, err := b.q.SwapByClientEvent(ctx, cid); err == nil {
		return s.ID, nil
	} else if !database.IsNoRows(err) {
		return uuid.Nil, err
	}
	vehicle, account, err := b.peek(ctx, in)
	if err != nil {
		return uuid.Nil, err
	}
	if err := risk.AssertSwapVelocity(ctx, b.pool, vehicle, account); err != nil {
		return uuid.Nil, err
	}
	var id uuid.UUID
	err = b.tx(ctx, func(q *db.Queries, who *events.Actor) error {
		var err error
		id, err = b.startTx(ctx, q, in, cid, who)
		return err
	})
	if _, dup := database.IsUniqueViolation(err); dup {
		if s, gerr := b.q.SwapByClientEvent(ctx, cid); gerr == nil {
			return s.ID, nil
		}
		return uuid.Nil, apperr.Conflict("INVALID_TRANSITION", "Could not start swap (conflict).")
	}
	return id, err
}

func (b *Bay) startTx(ctx context.Context, q *db.Queries, in startIn, cid string, who *events.Actor) (uuid.UUID, error) {
	if s, err := q.SwapByClientEvent(ctx, cid); err == nil {
		return s.ID, nil
	} else if !database.IsNoRows(err) {
		return uuid.Nil, err
	}
	hub, err := q.HubForUpdate(ctx, in.HubID)
	if database.IsNoRows(err) {
		return uuid.Nil, apperr.NotFound("No Hub matches the given query.")
	}
	if err != nil {
		return uuid.Nil, err
	}
	var res *db.MobilityReservation
	var v db.MobilityVehicle
	driverID, accountID := in.DriverID, in.AccountID
	if in.ReservationID != nil {
		r, err := q.ReservationForUpdate(ctx, *in.ReservationID)
		if database.IsNoRows(err) {
			return uuid.Nil, apperr.NotFound("Reservation not found.")
		}
		if err == nil {
			r, err = ensureFresh(ctx, q, r)
		}
		if err != nil {
			return uuid.Nil, err
		}
		if r.Status == "USED" {
			return uuid.Nil, apperr.Conflict("INVALID_TRANSITION", "Reservation already used.")
		}
		if r.Status != "CONFIRMED" && r.Status != "PENDING" {
			return uuid.Nil, apperr.Conflict("INVALID_TRANSITION", fmt.Sprintf("Reservation status %s cannot start.", r.Status))
		}
		if open, err := q.OpenSwapForReservation(ctx, &r.ID); err == nil {
			return open.ID, nil
		} else if !database.IsNoRows(err) {
			return uuid.Nil, err
		}
		if done, err := q.ReservationHasCompletedSwap(ctx, &r.ID); err != nil || done {
			if err == nil {
				err = apperr.Conflict("INVALID_TRANSITION", "Reservation already has a completed swap.")
			}
			return uuid.Nil, err
		}
		if r.HubID != hub.ID {
			rh, _ := q.HubRow(ctx, r.HubID)
			return uuid.Nil, apperr.Conflict("RESERVATION_HUB_MISMATCH", fmt.Sprintf("This hold is for %s, not the current bay.", rh.Code))
		}
		if v, err = q.VehicleByIDPlain(ctx, r.VehicleID); err != nil {
			return uuid.Nil, err
		}
		res, driverID, accountID = &r, &r.DriverID, &r.AccountID
	} else {
		vid := in.VehicleID
		if in.VehicleQR != "" {
			qv, err := resolveVehicleQR(ctx, b.pool, b.signer, in.VehicleQR)
			if err != nil {
				return uuid.Nil, err
			}
			vid = &qv.ID
		} else if vid == nil {
			return uuid.Nil, needVehicle()
		}
		if v, err = q.VehicleForUpdate(ctx, *vid); database.IsNoRows(err) {
			return uuid.Nil, apperr.NotFound("Vehicle not found.")
		} else if err != nil {
			return uuid.Nil, err
		}
		if driverID == nil || accountID == nil {
			return uuid.Nil, apperr.New("VALIDATION_ERROR", "driver_id and account_id are required for walk-in start.")
		}
	}
	if err := assertMayUse(driverID, v); err != nil {
		return uuid.Nil, err
	}
	mode, source := "WALLET", "HUB_APP"
	if res != nil {
		mode, source = res.PaymentMode, res.Source
	}
	agent := actorID(who)
	id, now := ids.New(), time.Now()
	if err := q.InsertSwap(ctx, db.InsertSwapParams{ID: id, ReturnedChargePct: 15, IssuedChargePct: 100,
		PaymentMode: mode, Status: "STARTED", ClientEventID: cid,
		AccountID: *accountID, AgentID: agent, DriverID: *driverID, HubID: hub.ID, ReservationID: idOf(res),
		VehicleID: v.ID, Source: source, StartedAt: &now}); err != nil {
		return uuid.Nil, err
	}
	return id, events.Emit(ctx, q, events.Event{Action: "swap.started", SubjectType: "swap", SubjectID: id.String(),
		Actor: who, Metadata: events.Map{"hub": hub.Code, "vehicle": v.RegistrationPlate, "client_event_id": cid,
			"first_swap": v.CurrentBatteryID == nil}})
}

func idOf(r *db.MobilityReservation) *uuid.UUID {
	if r == nil {
		return nil
	}
	return &r.ID
}
