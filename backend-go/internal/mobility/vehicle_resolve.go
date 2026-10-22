package mobility

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/qr"
)

// vehicleSerializerDTO is catalogue.VehicleSerializer (resolve's answer).
// The battery serial / charge keys are left out when no pack is mounted
// (DRF skips a read-only dotted source through None).
func vehicleSerializerDTO(v db.VehicleRowsRow) map[string]any {
	out := map[string]any{"id": v.ID.String(), "account": v.AccountID.String(),
		"vehicle_model": v.VehicleModelID.String(), "make": v.Make, "model_name": v.Model,
		"vehicle_type": v.VehicleType, "registration_plate": v.RegistrationPlate,
		"current_battery": optID(v.CurrentBatteryID), "status": v.Status}
	if v.CurrentBatteryID != nil {
		out["current_battery_serial"], out["current_battery_charge"] = deref(v.BatterySerial), v.BatteryCharge
	}
	return out
}

// resolve is resolve_vehicle_qr: hull tag → vehicle.
func (h *VehicleHandler) resolve(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b resolveReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	v, err := resolveVehicleQR(ctx, h.pool, h.qr, b.Token)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows, err := h.q.VehicleRows(ctx, []uuid.UUID{v.ID})
	if err != nil || len(rows) == 0 {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, vehicleSerializerDTO(rows[0]))
}

// resolveVehicleQR is resolve_vehicle_qr: hull tag → vehicle (minting the
// QR secret on first use).
func resolveVehicleQR(ctx context.Context, pool *pgxpool.Pool, signer qr.Signer, token string) (db.MobilityVehicle, error) {
	q := db.New(pool)
	bad := func(msg string) error { return apperr.New("AUTH_INVALID", msg).WithStatus(http.StatusUnauthorized) }
	parts := strings.Split(strings.TrimSpace(token), ".")
	if len(parts) != 4 || parts[0] != "v1" {
		return db.MobilityVehicle{}, bad("Malformed vehicle QR.")
	}
	vid, err := uuid.Parse(parts[1])
	var v db.MobilityVehicle
	if err == nil {
		v, err = q.VehicleByIDPlain(ctx, vid)
	}
	if err != nil {
		if database.IsNoRows(err) || strings.Contains(err.Error(), "invalid UUID") {
			err = apperr.New("NOT_FOUND", "Vehicle not found.").WithStatus(http.StatusNotFound)
		}
		return v, err
	}
	if v.QrSecret == "" { // ensure_vehicle_qr_secret
		err = database.InTx(ctx, pool, func(tx pgx.Tx) error {
			q := db.New(tx)
			locked, err := q.VehicleForUpdate(ctx, v.ID)
			if err != nil || locked.QrSecret != "" {
				v.QrSecret = locked.QrSecret
				return err
			}
			locked.QrSecret = qr.NewSecret()
			v.QrSecret = locked.QrSecret
			return saveVehicle(ctx, q, locked)
		})
		if err != nil {
			return v, err
		}
	}
	exp, err := strconv.ParseInt(parts[2], 10, 64)
	switch {
	case err != nil:
		err = bad("Malformed vehicle QR.")
	case exp < time.Now().Unix():
		err = bad("Vehicle QR expired.")
	case !signer.Verify(v.QrSecret, parts[3], "veh", parts[1], strconv.FormatInt(exp, 10)):
		err = bad("Vehicle QR signature invalid.")
	case parts[1] != v.ID.String():
		err = bad("Vehicle QR mismatch.")
	}
	return v, err
}

// models is the vehicle model catalogue (vehicles:read or swaps:read).
func (h *VehicleHandler) models(w http.ResponseWriter, r *http.Request) {
	p := reqctx.User(r.Context())
	if !p.Can("vehicles:read") && !p.Can("swaps:read") {
		bareForbidden(w)
		return
	}
	rows, err := h.q.ListVehicleModels(r.Context(), db.ListVehicleModelsParams{Ord: "", Lim: 100000})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]VehicleModelDTO, len(rows))
	for i, m := range rows {
		out[i] = vehicleModelDTO(m)
	}
	respond.OK(w, out)
}
