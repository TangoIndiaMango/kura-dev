package mobility

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/finance"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
)

// Pay at booking: a PAYSTACK booking is created PENDING with the battery held
// for bookingPayWindow; Paystack confirming the payment makes it CONFIRMED
// (the usual hold starts then). Unpaid, it lapses like any hold. Paid but not
// swapped (lapsed, cancelled, cancelled at the bay), the payment is refunded
// after a finance review.
const bookingPayWindow = 10 * time.Minute

// Booking payments confirm the hold wherever they settle — the API (popup,
// status checks, webhook) and the worker's payment sweep — so the hook is
// registered when the package loads, not when the HTTP module is built.
func init() { finance.ReservationPaid = (&Bay{}).confirmPaidReservation }

// bookingDue is what the booking costs: the tariff, or the booking-discount price.
func bookingDue(ctx context.Context, q *db.Queries, r db.MobilityReservation) (int64, error) {
	v, err := q.VehicleByIDPlain(ctx, r.VehicleID)
	if err != nil {
		return 0, err
	}
	model, err := q.VehicleModelByID(ctx, v.VehicleModelID)
	if err != nil {
		return 0, err
	}
	tariff, err := ppsKobo(ctx, q, model.VehicleType)
	if err != nil {
		return 0, err
	}
	fee, _ := swapFee(&r, "PAYSTACK", nil, tariff)
	return fee, nil
}

// bookingCheckout returns the booking's Paystack checkout: the paid one, a
// pending one still usable, or a new one (renew forces a new link).
func (b *Bay) bookingCheckout(ctx context.Context, id uuid.UUID, renew bool) (db.FinanceWalletcheckout, error) {
	c, err := b.q.LatestReservationCheckout(ctx, &id)
	if err == nil {
		if c, err = finance.VerifyAndSettle(ctx, b.pool, b.checkout, c); err != nil || c.Status == "SUCCESS" {
			return c, err
		}
	} else if !database.IsNoRows(err) {
		return c, err
	}
	r, err := b.q.ReservationByID(ctx, id)
	if err != nil {
		return c, err
	}
	if r.PaymentMode != "PAYSTACK" || r.Status != "PENDING" || !r.ExpiresAt.After(time.Now()) {
		return c, apperr.Conflict("BOOKING_NOT_PAYABLE", "This booking can no longer be paid — book again.")
	}
	due, err := bookingDue(ctx, b.q, r)
	if err != nil {
		return c, err
	}
	if !renew && c.Status == "PENDING" && c.AmountKobo == due {
		return c, nil
	}
	acct, err := b.q.AccountByID(ctx, r.AccountID)
	if err != nil {
		return c, err
	}
	return finance.StartCheckout(ctx, b.q, b.checkout, finance.CheckoutIn{Account: acct, Amount: due,
		Purpose: "RESERVATION", Booking: &r.ID, Return: "/"})
}

// confirmPaidReservation is finance.ReservationPaid: a live PENDING booking
// becomes CONFIRMED (hold restarts) and is announced; anything else — lapsed,
// cancelled, used, or already paid — returns false so the payment is refunded.
func (b *Bay) confirmPaidReservation(ctx context.Context, q *db.Queries, id, _ uuid.UUID) (bool, error) {
	r, err := q.ReservationForUpdate(ctx, id)
	if err != nil {
		return false, err
	}
	if r, err = ensureFresh(ctx, q, r); err != nil || r.Status != "PENDING" {
		return false, err
	}
	pol, err := holdPolicy(ctx, q)
	if err != nil {
		return false, err
	}
	r.Status, r.ExpiresAt = "CONFIRMED", time.Now().Add(time.Duration(pol.DefaultHoldMinutes)*time.Minute)
	if err := saveReservation(ctx, q, r); err != nil {
		return false, err
	}
	in, err := bookingAnnounceIn(ctx, q, r)
	if err != nil {
		return false, err
	}
	return true, b.announceReservation(ctx, q, r, in, pol.DefaultHoldMinutes)
}

func bookingAnnounceIn(ctx context.Context, q *db.Queries, r db.MobilityReservation) (CreateIn, error) {
	var in CreateIn
	var err error
	if in.Account, err = q.AccountByID(ctx, r.AccountID); err != nil {
		return in, err
	}
	if in.Hub, err = q.HubRow(ctx, r.HubID); err != nil {
		return in, err
	}
	if in.Vehicle, err = q.VehicleByIDPlain(ctx, r.VehicleID); err != nil {
		return in, err
	}
	in.Driver, err = q.DriverRowByID(ctx, r.DriverID)
	return in, err
}

func bookingCheckoutJSON(c db.FinanceWalletcheckout) map[string]any {
	body := finance.CheckoutBody(c)
	body["paid"] = c.Status == "SUCCESS"
	return body
}

// reservationCheckoutStart is POST /reservations/{id}/checkout/ {renew?}: the
// rider's Paystack checkout for a booking awaiting payment.
func (b *Bay) reservationCheckoutStart(w http.ResponseWriter, r *http.Request) {
	renew, _ := rawBody(r)["renew"].(bool)
	row, err := b.reservation(r)
	var c db.FinanceWalletcheckout
	if err == nil {
		c, err = b.bookingCheckout(r.Context(), row.ID, renew)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.JSON(w, http.StatusCreated, bookingCheckoutJSON(c))
}

// reservationCheckoutStatus is GET /reservations/{id}/checkout/: the latest
// checkout, re-verified with Paystack while pending.
func (b *Bay) reservationCheckoutStatus(w http.ResponseWriter, r *http.Request) {
	row, err := b.reservation(r)
	var c db.FinanceWalletcheckout
	if err == nil {
		c, err = b.q.LatestReservationCheckout(r.Context(), &row.ID)
		if database.IsNoRows(err) {
			err = apperr.NotFound("No payment for this booking yet.")
		}
	}
	if err == nil {
		c, err = finance.VerifyAndSettle(r.Context(), b.pool, b.checkout, c)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, bookingCheckoutJSON(c))
}
