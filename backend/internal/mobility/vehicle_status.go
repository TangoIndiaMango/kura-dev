package mobility

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
)

// vehicleTx locks the vehicle row and runs fn as the acting user.
func (h *VehicleHandler) vehicleTx(ctx context.Context, id uuid.UUID,
	fn func(q *db.Queries, v db.MobilityVehicle, who *events.Actor) error) error {
	return database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		v, err := q.VehicleForUpdate(ctx, id)
		if err != nil {
			return err
		}
		who, err := actor.FromRequest(ctx, q)
		if err != nil {
			return err
		}
		return fn(q, v, who)
	})
}

func saveVehicle(ctx context.Context, q *db.Queries, v db.MobilityVehicle) error {
	return q.SaveVehicle(ctx, db.SaveVehicleParams{ID: v.ID, RegistrationPlate: v.RegistrationPlate, Status: v.Status,
		AccountID: v.AccountID, VehicleModelID: v.VehicleModelID, HardwareID: v.HardwareID, Vin: v.Vin,
		AssignedDriverID: v.AssignedDriverID, QrSecret: v.QrSecret, IotApiKeyHash: v.IotApiKeyHash})
}

// vehicleAction validates the body, loads the vehicle (DRF order) and
// answers with the reloaded detail.
func vehicleAction[T any](h *VehicleHandler, fn func(ctx context.Context, v db.VehicleRowsRow, body T, keys map[string]bool) error) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		keys := decode.Keys(r)
		var body T
		if err := decode.JSON(r, &body); err != nil {
			respond.Error(w, r, err)
			return
		}
		v, err := h.object(r)
		if err == nil {
			err = fn(r.Context(), v, body, keys)
		}
		if err != nil {
			respond.Error(w, r, err)
			return
		}
		h.detail(w, r, v.ID)
	}
}

func vehicleSnap(v db.MobilityVehicle) events.Map {
	return events.Map{"registration_plate": v.RegistrationPlate, "status": v.Status,
		"vehicle_model_id": v.VehicleModelID.String()}
}

type vehicleStatusReq struct {
	Status *string `json:"status" validate:"required,oneof=ACTIVE PENDING SUSPENDED RETIRED"`
}

func (h *VehicleHandler) status() http.HandlerFunc {
	return vehicleAction(h, func(ctx context.Context, cur db.VehicleRowsRow, b vehicleStatusReq, _ map[string]bool) error {
		return h.vehicleTx(ctx, cur.ID, func(q *db.Queries, v db.MobilityVehicle, who *events.Actor) error {
			before := v.Status
			v.Status = *b.Status
			if err := saveVehicle(ctx, q, v); err != nil {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "vehicle.status_changed", SubjectType: "vehicle",
				SubjectID: v.ID.String(), SubjectLabel: v.RegistrationPlate, Actor: who,
				Before: events.Map{"status": before}, After: events.Map{"status": v.Status}})
		})
	})
}

type assignReq struct {
	DriverID *uuid.UUID `json:"driver_id"`
	Note     string     `json:"note" validate:"max=255"`
}

// assignDriver is VehicleAssignmentService.assign (null driver clears).
func (h *VehicleHandler) assignDriver() http.HandlerFunc {
	return vehicleAction(h, func(ctx context.Context, cur db.VehicleRowsRow, b assignReq, _ map[string]bool) error {
		return h.vehicleTx(ctx, cur.ID, func(q *db.Queries, v db.MobilityVehicle, who *events.Actor) error {
			before := events.Map{"assigned_driver_id": optID(v.AssignedDriverID)}
			now := time.Now()
			if err := q.CloseOpenAssignments(ctx, db.CloseOpenAssignmentsParams{VehicleID: v.ID, EndsAt: &now}); err != nil {
				return err
			}
			note := strings.TrimSpace(b.Note)
			if b.DriverID == nil {
				v.AssignedDriverID = nil
				if err := saveVehicle(ctx, q, v); err != nil {
					return err
				}
				return events.Emit(ctx, q, events.Event{Action: "vehicle.assignment_cleared", SubjectType: "vehicle",
					SubjectID: v.ID.String(), SubjectLabel: v.RegistrationPlate, Actor: who, Before: before,
					After: events.Map{"assigned_driver_id": nil}, Metadata: events.Map{"note": truncate(note, 200)}})
			}
			d, err := q.DriverRowByID(ctx, *b.DriverID)
			if database.IsNoRows(err) {
				return apperr.New("NOT_FOUND", "Driver not found.").WithStatus(http.StatusNotFound)
			}
			if err != nil {
				return err
			}
			if d.AccountID != v.AccountID {
				return apperr.New("VALIDATION_ERROR", "Driver must belong to the same account as the vehicle.")
			}
			if d.Status != "ACTIVE" {
				return apperr.Conflict("VALIDATION_ERROR", "Only ACTIVE drivers can be assigned.")
			}
			v.AssignedDriverID = &d.ID
			if err := saveVehicle(ctx, q, v); err != nil {
				return err
			}
			if err := q.InsertAssignment(ctx, db.InsertAssignmentParams{ID: ids.New(), StartsAt: now,
				Note: truncate(note, 255), DriverID: d.ID, VehicleID: v.ID}); err != nil {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "vehicle.assigned", SubjectType: "vehicle",
				SubjectID: v.ID.String(), SubjectLabel: v.RegistrationPlate, Actor: who, Before: before,
				After: events.Map{"assigned_driver_id": d.ID.String()}, Metadata: events.Map{"note": truncate(note, 200)}})
		})
	})
}

// iotKeyHash is hash_iot_api_key.
func iotKeyHash(raw string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(raw)))
	return hex.EncodeToString(sum[:])
}
