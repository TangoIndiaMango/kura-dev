package mobility

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/media"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/qr"
)

type lookupReq struct {
	Token     string     `json:"token"`
	Code      string     `json:"code"`
	VehicleQR string     `json:"vehicle_qr"`
	HubID     *uuid.UUID `json:"hub_id"`
}

// lookupRow is lookup._resolve_row: a sealed QR token or a typed code, and
// an optional hull QR that must match the hold's vehicle.
func (b *Bay) lookupRow(ctx context.Context, in lookupReq) (db.MobilityReservation, error) {
	notFound := apperr.New("NOT_FOUND", "Hold not found.").WithStatus(http.StatusNotFound)
	var r db.MobilityReservation
	var err error
	switch {
	case in.Token != "":
		p, perr := qr.ParseReservation(in.Token)
		if perr != nil {
			return r, perr
		}
		id, perr := uuid.Parse(p.ReservationID)
		if perr != nil {
			return r, apperr.Validation(apperr.Details{"non_field_errors": []string{"“" + p.ReservationID + "” is not a valid UUID."}})
		}
		if r, err = b.q.ReservationByID(ctx, id); database.IsNoRows(err) {
			return r, notFound
		} else if err != nil {
			return r, err
		}
		if _, err := b.signer.VerifyReservation(in.Token, r.ID.String()); err != nil {
			return r, err
		}
		if stored := strings.TrimSpace(r.TokenHash); stored != "" && stored != qr.TokenHash(in.Token) {
			return r, apperr.New("AUTH_INVALID", "Reservation QR no longer valid.").WithStatus(http.StatusUnauthorized)
		}
	case in.Code != "":
		if r, err = b.q.ReservationByCode(ctx, strings.ToUpper(strings.TrimSpace(in.Code))); database.IsNoRows(err) {
			return r, notFound
		} else if err != nil {
			return r, err
		}
	default:
		return r, apperr.New("VALIDATION_ERROR", "Provide token or code.").WithDetails(apperr.Details{
			"token": []string{"required_without_code"}, "code": []string{"required_without_token"}})
	}
	if in.VehicleQR != "" {
		v, err := resolveVehicleQR(ctx, b.pool, b.signer, in.VehicleQR)
		if err != nil {
			return r, err
		}
		if v.ID != r.VehicleID {
			return r, apperr.Conflict("VALIDATION_ERROR", "Vehicle QR does not match this reservation.").
				WithDetails(apperr.Details{"vehicle_qr": []string{"mismatch"}})
		}
	}
	return r, nil
}

func (b *Bay) lookup(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var in lookupReq
	err := decode.JSON(r, &in)
	var res db.MobilityReservation
	if err == nil {
		res, err = b.lookupRow(ctx, in)
	}
	if err == nil {
		err = b.tx(ctx, func(q *db.Queries, _ *events.Actor) error {
			var err error
			res, err = ensureFresh(ctx, q, res)
			return err
		})
	}
	var row db.ReservationRowsRow
	if err == nil {
		row, err = b.reservationRow(ctx, res.ID)
	}
	if err == nil && in.HubID != nil && row.HubID != *in.HubID {
		err = apperr.Conflict("RESERVATION_HUB_MISMATCH", fmt.Sprintf("This hold is for %s, not the current bay.", row.HubCode)).
			WithDetails(apperr.Details{"reservation_hub_id": row.HubID.String(), "reservation_hub_code": row.HubCode,
				"presented_hub_id": in.HubID.String()})
	}
	var payload map[string]any
	if err == nil {
		payload, err = b.lookupPayload(ctx, row)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, payload)
}

// lookupPayload is the F4 bay envelope: hold + driver + vehicle + triage.
func (b *Bay) lookupPayload(ctx context.Context, row db.ReservationRowsRow) (map[string]any, error) {
	d, err := b.q.DriverPhoto(ctx, row.DriverID)
	if err != nil {
		return nil, err
	}
	name := strings.TrimSpace(strings.Join(nonEmpty(d.FirstName, d.LastName), " "))
	if name == "" {
		name = firstNonEmptyPtr(d.Phone, d.Email, "Rider")
	}
	var photo *string
	if d.Provider != nil {
		photo = b.cdn.DeliveryURL(&media.Asset{Provider: *d.Provider, StorageKey: deref(d.StorageKey),
			ResourceType: deref(d.ResourceType), Visibility: deref(d.Visibility)})
	}
	acct, err := b.q.AccountByID(ctx, row.AccountID)
	if err != nil {
		return nil, err
	}
	triage, reason, flags := "GREEN", "", []string{}
	switch {
	case row.Status == "EXPIRED" || row.Status == "CANCELLED" || row.Status == "USED":
		triage, reason, flags = "RED", "Reservation is "+row.Status+".", []string{row.Status}
	case acct.Status == "SUSPENDED":
		triage, reason, flags = "RED", "Account suspended.", []string{"ACCOUNT_SUSPENDED"}
	case acct.KycStatus == "REJECTED":
		triage, reason, flags = "RED", "KYC rejected.", []string{"KYC_REJECTED"}
	case acct.KycStatus != "VERIFIED":
		triage, reason, flags = "AMBER", "KYC not verified.", []string{"KYC_PENDING"}
	case photo == nil:
		triage, reason, flags = "AMBER", "No driver face on file.", []string{"NO_FACE_PHOTO"}
	case row.PaymentMode == "PLAN":
		reason = "Active plan hold."
	case row.PaymentMode == "WALLET":
		reason = "Wallet hold ₦" + nairaCommas(row.HoldAmountKobo) + "."
	default:
		reason = "Payment mode " + row.PaymentMode + "."
	}
	v, err := b.q.VehicleRows(ctx, []uuid.UUID{row.VehicleID})
	if err != nil || len(v) == 0 {
		return nil, err
	}
	model, err := b.q.VehicleModelByID(ctx, v[0].VehicleModelID)
	if err != nil {
		return nil, err
	}
	var btype any
	if bt, err := b.q.BatteryTypeByID(ctx, model.BatteryTypeID); err == nil {
		btype = bt.Name
	}
	return map[string]any{"reservation": b.reservationDTO(row),
		"driver": map[string]any{"name": name, "photo_url": photo},
		"vehicle": map[string]any{"id": row.VehicleID.String(), "registration": v[0].RegistrationPlate,
			"current_battery_serial": v[0].BatterySerial, "battery_type": btype},
		"triage": triage, "triage_reason": reason, "risk_flags": flags,
		"first_swap": v[0].CurrentBatteryID == nil}, nil
}

func nonEmpty(vals ...string) []string {
	out := []string{}
	for _, v := range vals {
		if v != "" {
			out = append(out, v)
		}
	}
	return out
}

func firstNonEmptyPtr(a, b *string, fallback string) string {
	for _, p := range []*string{a, b} {
		if p != nil && *p != "" {
			return *p
		}
	}
	return fallback
}

// nairaCommas is f"{kobo / 100:,.2f}".
func nairaCommas(kobo int64) string {
	return thousands(kobo/100) + fmt.Sprintf(".%02d", kobo%100)
}
