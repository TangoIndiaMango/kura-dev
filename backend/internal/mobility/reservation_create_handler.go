package mobility

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
)

// rawBody reads request.data as a loose object (no serializer in the view).
func rawBody(r *http.Request) map[string]any {
	raw, _ := io.ReadAll(r.Body)
	m := map[string]any{}
	_ = json.Unmarshal(raw, &m)
	return m
}

func uuidArg(m map[string]any, k string) (*uuid.UUID, error) {
	v, ok := m[k]
	if !ok || v == nil {
		return nil, nil
	}
	s := pyStr(v)
	id, err := uuid.Parse(s)
	if err != nil {
		return nil, apperr.Validation(apperr.Details{"non_field_errors": []string{"“" + s + "” is not a valid UUID."}})
	}
	return &id, nil
}

// createReservationHandler is ReservationViewSet.create (reads request.data
// directly). Django 500s on a missing driver / vehicle / hub; Go answers
// 400 / 404.
func (b *Bay) createReservationHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	data := rawBody(r)
	uid, _ := uuid.Parse(reqctx.User(ctx).UserID)
	in := CreateIn{Mode: "WALLET", Source: "APP"}
	if m, ok := data["payment_mode"]; ok && m != nil {
		in.Mode = pyStr(m)
	}
	if c, ok := data["discount_code"].(string); ok {
		in.Code = c
	}
	d, err := b.q.DriverRowByUser(ctx, uid)
	if database.IsNoRows(err) {
		var acct *uuid.UUID
		if acct, err = uuidArg(data, "account"); err == nil && acct != nil {
			d, err = b.q.FirstDriverRow(ctx, *acct)
		} else if err == nil {
			err = pgx.ErrNoRows
		}
		if database.IsNoRows(err) {
			err = apperr.New("VALIDATION_ERROR", "No driver for this account.")
		}
	}
	var vid, hid *uuid.UUID
	if err == nil {
		in.Driver = d
		if vid, err = uuidArg(data, "vehicle"); err == nil {
			hid, err = uuidArg(data, "hub")
		}
	}
	if err == nil && vid == nil {
		err = apperr.NotFound("Vehicle not found.")
	} else if err == nil {
		if in.Vehicle, err = b.q.VehicleByIDPlain(ctx, *vid); database.IsNoRows(err) {
			err = apperr.NotFound("Vehicle not found.")
		}
	}
	if err == nil && hid == nil {
		err = apperr.NotFound("Hub not found.")
	} else if err == nil {
		if in.Hub, err = b.q.HubRow(ctx, *hid); database.IsNoRows(err) {
			err = apperr.NotFound("Hub not found.")
		}
	}
	if err == nil {
		in.Account, err = b.q.AccountByID(ctx, d.AccountID)
	}
	var id uuid.UUID
	if err == nil {
		err = b.tx(ctx, func(q *db.Queries, _ *events.Actor) error {
			var err error
			id, err = b.createReservation(ctx, q, in)
			return err
		})
	}
	var row db.ReservationRowsRow
	if err == nil {
		row, err = b.reservationRow(ctx, id)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	dto := b.reservationDTO(row)
	if row.PaymentMode != "PAYSTACK" || row.Status != "PENDING" {
		respond.JSON(w, http.StatusCreated, dto)
		return
	}
	// Pay at booking: hand back the Paystack checkout for the in-app popup. If
	// Paystack can't be reached the hold is released rather than left unpaid.
	c, cerr := b.bookingCheckout(ctx, row.ID, false)
	if cerr != nil {
		_ = b.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			_, err := cancelReservation(ctx, q, row.ID, who, "Payment could not be started — please try again.")
			return err
		})
		respond.Error(w, r, cerr)
		return
	}
	out := structMap(dto)
	out["checkout"] = bookingCheckoutJSON(c)
	respond.JSON(w, http.StatusCreated, out)
}
