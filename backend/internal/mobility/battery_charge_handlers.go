package mobility

import (
	"context"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
)

type batteryReceiveReq struct {
	HubID     *uuid.UUID `json:"hub_id"`
	SlotNo    *int32     `json:"slot_no" validate:"omitempty,min=1"`
	ChargePct *int32     `json:"charge_pct" validate:"required,min=0,max=100"`
	Note      string     `json:"note" validate:"max=300"`
}

type batteryChargeReq struct {
	ChargePct *int32 `json:"charge_pct" validate:"required,min=0,max=100"`
	Release   bool   `json:"release"`
	Note      string `json:"note" validate:"max=300"`
}

// receive: POST /batteries/{id}/receive/ — a pack that arrived goes into a bay.
func (h *BatteryHandler) receive() http.HandlerFunc {
	return batteryAction(h, func(ctx context.Context, b db.BatteryRowsRow, body batteryReceiveReq, _ map[string]bool) error {
		return h.receiveTx(ctx, b.ID, receiveIn{Hub: body.HubID, SlotNo: body.SlotNo, Pct: *body.ChargePct,
			Note: body.Note})
	})
}

// charge: POST /batteries/{id}/charge/ — one charge reading from the bay.
func (h *BatteryHandler) charge() http.HandlerFunc {
	return batteryAction(h, func(ctx context.Context, b db.BatteryRowsRow, body batteryChargeReq, _ map[string]bool) error {
		return h.custodyTx(ctx, b.ID, func(q *db.Queries, cur db.MobilityBattery, who *events.Actor) error {
			if cur.CurrentHubID != nil {
				if err := hubAllowed(ctx, q, *cur.CurrentHubID); err != nil {
					return err
				}
			}
			return applyCharge(ctx, q, cur, chargeIn{Pct: *body.ChargePct, Release: body.Release, Note: body.Note,
				Source: ChargeManual}, who)
		})
	})
}

type chargeReadingReq struct {
	BatteryID uuid.UUID `json:"battery_id" validate:"required"`
	ChargePct *int32    `json:"charge_pct" validate:"required,min=0,max=100"`
	Release   bool      `json:"release"`
}

type chargeReadingsReq struct {
	Readings []chargeReadingReq `json:"readings" validate:"required,min=1,max=64,dive"`
	Note     string             `json:"note" validate:"max=300"`
}

type chargeResult struct {
	BatteryID string  `json:"battery_id"`
	OK        bool    `json:"ok"`
	Status    string  `json:"status,omitempty"`
	Error     *string `json:"error,omitempty"`
}

// chargeReadings: POST /hubs/{id}/charge-readings/ — the bay walk: readings
// for many packs at once. Each pack saves on its own, so one bad entry never
// loses the rest; the answer says which ones didn't save and why.
func (h *HubHandler) chargeReadings(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var body chargeReadingsReq
	if err := decode.JSON(r, &body); err != nil {
		respond.Error(w, r, err)
		return
	}
	hub, err := h.object(r)
	if err == nil {
		err = hubAllowed(ctx, h.q, hub.ID)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]chargeResult, 0, len(body.Readings))
	saved := 0
	for _, rd := range body.Readings {
		res := chargeResult{BatteryID: rd.BatteryID.String()}
		err := database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
			q := db.New(tx)
			b, err := q.BatteryForUpdate(ctx, rd.BatteryID)
			if database.IsNoRows(err) || (err == nil && (b.CurrentHubID == nil || *b.CurrentHubID != hub.ID)) {
				return apperr.NotFound("This pack isn't at " + hub.Name + ".")
			}
			if err != nil {
				return err
			}
			who, err := actor.FromRequest(ctx, q)
			if err != nil {
				return err
			}
			if err := applyCharge(ctx, q, b, chargeIn{Pct: *rd.ChargePct, Release: rd.Release, Note: body.Note,
				Source: ChargeManual}, who); err != nil {
				return err
			}
			res.Status, err = q.BatteryStatusOf(ctx, b.ID)
			return err
		})
		if err != nil {
			msg := err.Error()
			if e, ok := apperr.As(err); ok {
				msg = e.Message
			}
			res.Error = &msg
		} else {
			res.OK = true
			saved++
		}
		out = append(out, res)
	}
	respond.OK(w, map[string]any{"saved": saved, "failed": len(out) - saved, "results": out})
}
