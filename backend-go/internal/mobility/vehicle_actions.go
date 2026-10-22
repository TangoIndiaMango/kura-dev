package mobility

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/qr"
)

type assignmentDTO struct {
	ID          string          `json:"id"`
	DriverID    string          `json:"driver_id"`
	DriverName  string          `json:"driver_name"`
	DriverPhone *string         `json:"driver_phone"`
	StartsAt    jsontime.Field  `json:"starts_at"`
	EndsAt      *jsontime.Field `json:"ends_at"`
	Note        string          `json:"note"`
}

func (h *VehicleHandler) assignments(w http.ResponseWriter, r *http.Request) {
	v, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows, err := h.q.VehicleAssignments(r.Context(), v.ID)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]assignmentDTO, len(rows))
	for i, a := range rows {
		name := strings.TrimSpace(a.FirstName + " " + a.LastName)
		out[i] = assignmentDTO{ID: a.ID.String(), DriverID: a.DriverID.String(),
			DriverName: firstOf(name, deref(a.Phone), a.DriverID.String()[:8]), DriverPhone: a.Phone,
			StartsAt: jsontime.Field(a.StartsAt), EndsAt: jsontime.FieldPtr(a.EndsAt), Note: a.Note}
	}
	respond.OK(w, out)
}

func (h *VehicleHandler) commands(w http.ResponseWriter, r *http.Request) {
	v, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows, err := h.q.VehicleCommands(r.Context(), v.ID)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	type cmd struct {
		ID        string        `json:"id"`
		Kind      string        `json:"kind"`
		Status    string        `json:"status"`
		Note      string        `json:"note"`
		Error     string        `json:"error"`
		CreatedAt jsontime.DRF  `json:"created_at"`
		AckedAt   *jsontime.DRF `json:"acked_at"`
	}
	out := make([]cmd, len(rows))
	for i, c := range rows {
		out[i] = cmd{c.ID.String(), c.Kind, c.Status, c.Note, c.Error, jsontime.DRF(c.CreatedAt), jsontime.DRFPtr(c.AckedAt)}
	}
	respond.OK(w, out)
}

type commandReq struct {
	Kind *string `json:"kind" validate:"required,oneof=ENABLE_DRIVING DISABLE_DRIVING REQUEST_STATE UNLOCK_BATTERY DRAW_ATTENTION"`
	Note string  `json:"note" validate:"max=255"`
}

// command is VehicleCommandService.enqueue (soft VCU queue, SENT when the
// vehicle has an IoT key).
func (h *VehicleHandler) command(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b commandReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	v, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	if v.Status == "RETIRED" {
		respond.Error(w, r, apperr.Conflict("INVALID_TRANSITION", "Cannot command a retired vehicle."))
		return
	}
	id, status, note := ids.New(), "QUEUED", truncate(strings.TrimSpace(b.Note), 255)
	err = h.vehicleTx(ctx, v.ID, func(q *db.Queries, locked db.MobilityVehicle, who *events.Actor) error {
		if locked.IotApiKeyHash != "" {
			status = "SENT"
		}
		if err := q.InsertVehicleCommand(ctx, db.InsertVehicleCommandParams{ID: id, Kind: *b.Kind, Status: status,
			Note: note, RequestedByID: actorID(who), VehicleID: locked.ID}); err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "vehicle.command_queued", SubjectType: "vehicle",
			SubjectID: locked.ID.String(), SubjectLabel: locked.RegistrationPlate, Actor: who,
			After:    events.Map{"command_id": id.String(), "kind": *b.Kind, "status": status},
			Metadata: events.Map{"note": truncate(note, 200)}})
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, map[string]string{"id": id.String(), "kind": *b.Kind, "status": status, "note": note})
}

// vehicleToken is build_vehicle_token.
func (h *VehicleHandler) vehicleToken(id string, exp int64, secret string) string {
	return fmt.Sprintf("v1.%s.%d.%s", id, exp, h.qr.Sign(secret, "veh", id, strconv.FormatInt(exp, 10)))
}

// qrPayload is vehicle_qr_payload (mints a QR secret if missing; 24h TTL).
func (h *VehicleHandler) qrPayload(ctx context.Context, q *db.Queries, id uuid.UUID) (map[string]any, error) {
	v, err := q.VehicleForUpdate(ctx, id)
	if err != nil {
		return nil, err
	}
	if v.QrSecret == "" {
		v.QrSecret = qr.NewSecret()
		if err := saveVehicle(ctx, q, v); err != nil {
			return nil, err
		}
	}
	exp := time.Now().Unix() + 24*3600
	return map[string]any{"vehicle_id": v.ID.String(), "registration_plate": v.RegistrationPlate,
		"qr": h.vehicleToken(v.ID.String(), exp, v.QrSecret), "expires_at": exp}, nil
}

func (h *VehicleHandler) qrTx(w http.ResponseWriter, r *http.Request, rotate bool) {
	ctx := r.Context()
	v, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	var out map[string]any
	err = h.vehicleTx(ctx, v.ID, func(q *db.Queries, locked db.MobilityVehicle, who *events.Actor) error {
		if rotate {
			locked.QrSecret = qr.NewSecret()
			if err := saveVehicle(ctx, q, locked); err != nil {
				return err
			}
			if err := events.Emit(ctx, q, events.Event{Action: "vehicle.qr_rotated", SubjectType: "vehicle",
				SubjectID: locked.ID.String(), SubjectLabel: locked.RegistrationPlate, Actor: who}); err != nil {
				return err
			}
		}
		var err error
		out, err = h.qrPayload(ctx, q, locked.ID)
		return err
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, out)
}

func (h *VehicleHandler) qrCode(w http.ResponseWriter, r *http.Request)   { h.qrTx(w, r, false) }
func (h *VehicleHandler) rotateQR(w http.ResponseWriter, r *http.Request) { h.qrTx(w, r, true) }

// rotateIoTKey is TelemetryIotService.rotate_api_key: the plaintext is
// shown once, only its SHA-256 is stored.
func (h *VehicleHandler) rotateIoTKey(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	v, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		respond.Error(w, r, err)
		return
	}
	plain := base64.RawURLEncoding.EncodeToString(raw)
	err = h.vehicleTx(ctx, v.ID, func(q *db.Queries, locked db.MobilityVehicle, who *events.Actor) error {
		locked.IotApiKeyHash = iotKeyHash(plain)
		if err := saveVehicle(ctx, q, locked); err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "telemetry.iot_key_rotated", SubjectType: "vehicle",
			SubjectID: locked.ID.String(), SubjectLabel: locked.RegistrationPlate, Actor: who,
			After: events.Map{"hardware_id": deref(locked.HardwareID)}})
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, map[string]string{"vehicle_id": v.ID.String(), "hardware_id": deref(v.HardwareID),
		"api_key": plain, "hint": "Store once — plaintext is not recoverable."})
}
