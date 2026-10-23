package mobility

import (
	"context"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/qr"
)

// labelPayload is battery_label_payload (mints a QR secret if missing).
func (h *BatteryHandler) labelPayload(ctx context.Context, q *db.Queries, id uuid.UUID) (map[string]string, error) {
	b, err := q.BatteryForUpdate(ctx, id)
	if err != nil {
		return nil, err
	}
	t, err := q.BatteryTypeByID(ctx, b.BatteryTypeID)
	if err != nil {
		return nil, err
	}
	scheme := firstOf(t.QrScheme, "SIGNED")
	if scheme == "BMS_AUTH" || scheme == "NFC_SUN" {
		return nil, apperr.New("UNSUPPORTED_SCHEME", scheme+" requires OEM hardware.").WithStatus(501)
	}
	if b.QrSecret == "" {
		b.QrSecret = qr.NewSecret()
		if err := saveBattery(ctx, q, b); err != nil {
			return nil, err
		}
	}
	payload := b.Serial
	if scheme != "PRINTED" {
		payload = h.qr.BatteryToken(b.Serial, b.QrSecret)
	}
	return map[string]string{"serial": b.Serial, "qr_scheme": scheme, "payload": payload}, nil
}

func (h *BatteryHandler) label(w http.ResponseWriter, r *http.Request) {
	b, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	var out map[string]string
	err = database.InTx(r.Context(), h.pool, func(tx pgx.Tx) error {
		out, err = h.labelPayload(r.Context(), db.New(tx), b.ID)
		return err
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, out)
}

// rotateQR is rotate_battery_qr.
func (h *BatteryHandler) rotateQR(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cur, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	var out map[string]string
	err = h.custodyTx(ctx, cur.ID, func(q *db.Queries, b db.MobilityBattery, who *events.Actor) error {
		b.QrSecret = qr.NewSecret()
		if err := saveBattery(ctx, q, b); err != nil {
			return err
		}
		if err := recordBatteryEvent(ctx, q, b, custodyEvent{Event: "TRIAGED", Actor: actorID(who),
			Meta: map[string]any{"action": "qr_rotated"}}); err != nil {
			return err
		}
		if err := events.Emit(ctx, q, events.Event{Action: "battery.qr_rotated", SubjectType: "battery",
			SubjectID: b.ID.String(), SubjectLabel: b.Serial, Actor: who}); err != nil {
			return err
		}
		out, err = h.labelPayload(ctx, q, b.ID)
		return err
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, out)
}

type resolveReq struct {
	Token string `json:"token" validate:"required"`
}

// resolve is resolve_battery_qr: scan → battery.
func (h *BatteryHandler) resolve(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b resolveReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	parsed, err := qr.ParseBattery(b.Token)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	bat, err := h.q.BatteryBySerial(ctx, parsed.Serial)
	if database.IsNoRows(err) {
		err = apperr.New("BATTERY_NOT_FOUND", "Battery not found.").WithStatus(http.StatusNotFound)
	}
	if err == nil {
		err = h.qr.VerifyBattery(b.Token, bat.Serial, bat.QrSecret, firstOf(bat.QrScheme, "SIGNED"))
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.reloaded(w, r, bat.ID)
}
