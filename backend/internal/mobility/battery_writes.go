package mobility

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/qr"
)

// batteryWriteReq is BatteryWriteSerializer (every field optional).
type batteryWriteReq struct {
	Serial         *string      `json:"serial" validate:"omitempty,notblank,max=50"`
	BatteryTypeID  *uuid.UUID   `json:"battery_type_id"`
	CurrentHubID   *uuid.UUID   `json:"current_hub_id"`
	Status         *string      `json:"status" validate:"omitempty,oneof=AVAILABLE RESERVED ISSUED RETURNED CHARGING UNAVAILABLE FAULTED LOST RETIRED"`
	ChargePct      *int         `json:"charge_pct" validate:"omitempty,min=0,max=100"`
	ChargeSource   *string      `json:"charge_source" validate:"omitempty,oneof=MANUAL BMS TELEMETRY"`
	HealthPct      *int         `json:"health_pct" validate:"omitempty,min=0,max=100"`
	CycleCount     *int         `json:"cycle_count" validate:"omitempty,min=0"`
	ManufacturedAt *decode.Date `json:"manufactured_at"`
}

// manufactured is the DateField value as a DB date (null → NULL).
func manufactured(d *decode.Date) pgtype.Date {
	if d == nil {
		return pgtype.Date{}
	}
	return pgtype.Date{Time: d.Time, Valid: true}
}

func (h *BatteryHandler) reloaded(w http.ResponseWriter, r *http.Request, id uuid.UUID) {
	b, err := h.load(r.Context(), id)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, batteryDetailDTO(b))
}

// create is BatteryService.create (commission a pack).
func (h *BatteryHandler) create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b batteryWriteReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	serial := ""
	if b.Serial != nil {
		serial = strings.TrimSpace(*b.Serial)
	}
	if serial == "" || b.BatteryTypeID == nil {
		respond.JSON(w, http.StatusBadRequest, map[string]string{"detail": "serial and battery_type_id are required."})
		return
	}
	status := "AVAILABLE"
	if b.Status != nil && *b.Status != "" {
		status = *b.Status
	}
	bat := db.MobilityBattery{ID: ids.New(), Serial: serial, BatteryTypeID: *b.BatteryTypeID, Status: status,
		ChargePct: 100, HealthPct: 100, ChargeSource: "MANUAL", QrSecret: qr.NewSecret()}
	if b.ChargePct != nil {
		bat.ChargePct = int32(*b.ChargePct)
	}
	if b.HealthPct != nil {
		bat.HealthPct = int32(*b.HealthPct)
	}
	if b.CycleCount != nil {
		bat.CycleCount = int32(*b.CycleCount)
	}
	err := database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		if taken, err := q.SerialTaken(ctx, db.SerialTakenParams{Serial: serial, Exclude: uuid.Nil}); err != nil {
			return err
		} else if taken {
			return apperr.New("CONFLICT", "Battery serial already exists.")
		}
		if _, err := q.BatteryTypeByID(ctx, bat.BatteryTypeID); database.IsNoRows(err) {
			return apperr.New("NOT_FOUND", "Battery type not found.")
		} else if err != nil {
			return err
		}
		if b.CurrentHubID != nil {
			if err := hubOrErr(ctx, q, b.CurrentHubID); err != nil {
				return err
			}
		}
		if status != "AVAILABLE" && status != "CHARGING" && status != "FAULTED" && status != "UNAVAILABLE" {
			return apperr.New("VALIDATION_ERROR",
				"New batteries may only be AVAILABLE, CHARGING, FAULTED, or UNAVAILABLE.")
		}
		if b.CurrentHubID != nil {
			custodian(&bat, "TRANSIT", b.CurrentHubID, b.CurrentHubID, false)
		} else {
			custodian(&bat, "NONE", nil, nil, true)
		}
		if err := q.InsertBattery(ctx, db.InsertBatteryParams{ID: bat.ID, Serial: bat.Serial, Status: bat.Status,
			ChargePct: bat.ChargePct, HealthPct: bat.HealthPct, CycleCount: bat.CycleCount,
			BatteryTypeID: bat.BatteryTypeID, CurrentHubID: bat.CurrentHubID, CustodianID: bat.CustodianID,
			CustodianType: bat.CustodianType, QrSecret: bat.QrSecret, ChargeSource: bat.ChargeSource}); err != nil {
			if _, dup := database.IsUniqueViolation(err); dup {
				return apperr.New("CONFLICT", "Battery serial already exists.")
			}
			return err
		}
		who, err := actor.FromRequest(ctx, q)
		if err != nil {
			return err
		}
		if err := recordBatteryEvent(ctx, q, bat, custodyEvent{Event: "RECEIVED", Actor: actorID(who),
			Hub: b.CurrentHubID, ToType: bat.CustodianType, ToID: bat.CustodianID,
			Meta: map[string]any{"serial": serial}, Source: "APP"}); err != nil {
			return err
		}
		return emitService(ctx, q, who, bat, nil, "battery.commissioned", "")
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out, err := h.load(ctx, bat.ID)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.Created(w, batteryDetailDTO(out))
}

// patch is BatteryService.update: specs only — moves and status changes go
// through the custody verbs.
func (h *BatteryHandler) patch(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cur, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	keys := decode.Keys(r)
	var b batteryWriteReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	mfg := manufactured(b.ManufacturedAt)
	err = h.custodyTx(ctx, cur.ID, func(q *db.Queries, bat db.MobilityBattery, who *events.Actor) error {
		switch {
		case bat.Status == "RETIRED":
			return apperr.Conflict("CONFLICT", "Retired batteries are immutable.")
		case swapOnly[bat.Status]:
			return apperr.Conflict("CONFLICT", "Cannot PATCH while status is "+bat.Status+"; use swap or transfer.")
		case keys["current_hub_id"]:
			return apperr.New("FORBIDDEN", "Move batteries via POST /batteries/{id}/transfer/.").WithStatus(403)
		case b.Status != nil && *b.Status != bat.Status:
			return apperr.New("FORBIDDEN", "Change status via transfer/fault/found/retire actions.").WithStatus(403)
		}
		before := batterySnap(bat, true)
		if b.BatteryTypeID != nil {
			if _, err := q.BatteryTypeByID(ctx, *b.BatteryTypeID); database.IsNoRows(err) {
				return apperr.New("NOT_FOUND", "Battery type not found.")
			} else if err != nil {
				return err
			}
			bat.BatteryTypeID = *b.BatteryTypeID
		}
		if b.ChargePct != nil {
			bat.ChargePct = int32(*b.ChargePct)
		}
		if b.HealthPct != nil {
			bat.HealthPct = int32(*b.HealthPct)
		}
		if b.CycleCount != nil {
			bat.CycleCount = int32(*b.CycleCount)
		}
		if b.ChargeSource != nil {
			bat.ChargeSource = *b.ChargeSource
		}
		if keys["manufactured_at"] {
			bat.ManufacturedAt = mfg
		}
		if b.Serial != nil && *b.Serial != "" {
			serial := strings.TrimSpace(*b.Serial)
			if taken, err := q.SerialTaken(ctx, db.SerialTakenParams{Serial: serial, Exclude: bat.ID}); err != nil {
				return err
			} else if taken {
				return apperr.New("CONFLICT", "Battery serial already exists.")
			}
			bat.Serial = serial
		}
		if err := saveBattery(ctx, q, bat); err != nil {
			return err
		}
		return emitService(ctx, q, who, bat, before, "battery.updated", "")
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.reloaded(w, r, cur.ID)
}

type batteryStatusReq struct {
	Status       *string    `json:"status" validate:"required,oneof=AVAILABLE RESERVED ISSUED RETURNED CHARGING UNAVAILABLE FAULTED LOST RETIRED"`
	Note         string     `json:"note"`
	CurrentHubID *uuid.UUID `json:"current_hub_id"`
}

type batteryTransferReq struct {
	Destination *string    `json:"destination" validate:"required,oneof=hub workshop transit"`
	HubID       *uuid.UUID `json:"hub_id"`
	Note        string     `json:"note"`
}

type batteryNoteReq struct {
	Note string `json:"note"`
}

// action validates the body, then loads the battery (DRF order), runs fn
// and answers with the reloaded detail.
func batteryAction[T any](h *BatteryHandler, fn func(ctx context.Context, b db.BatteryRowsRow, body T, keys map[string]bool) error) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		keys := decode.Keys(r)
		var body T
		if err := decode.JSON(r, &body); err != nil {
			respond.Error(w, r, err)
			return
		}
		b, err := h.object(r)
		if err == nil {
			err = fn(r.Context(), b, body, keys)
		}
		if err != nil {
			respond.Error(w, r, err)
			return
		}
		h.reloaded(w, r, b.ID)
	}
}

func (h *BatteryHandler) status() http.HandlerFunc {
	return batteryAction(h, func(ctx context.Context, b db.BatteryRowsRow, body batteryStatusReq, keys map[string]bool) error {
		return h.setStatus(ctx, b, *body.Status, body.Note, body.CurrentHubID, keys["current_hub_id"])
	})
}

func (h *BatteryHandler) transfer() http.HandlerFunc {
	return batteryAction(h, func(ctx context.Context, b db.BatteryRowsRow, body batteryTransferReq, _ map[string]bool) error {
		return h.transferTx(ctx, b.ID, *body.Destination, body.HubID, body.Note)
	})
}

func (h *BatteryHandler) noteAction(fn func(*BatteryHandler, context.Context, uuid.UUID, string) error) http.HandlerFunc {
	return batteryAction(h, func(ctx context.Context, b db.BatteryRowsRow, body batteryNoteReq, _ map[string]bool) error {
		return fn(h, ctx, b.ID, body.Note)
	})
}
