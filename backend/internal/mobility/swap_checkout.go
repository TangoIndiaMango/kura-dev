package mobility

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/finance"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/mail"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
)

// A pending link is reused while it's this fresh (and for the same amount).
const checkoutReuse = 20 * time.Minute

// openSwap reports whether a swap can still be paid for.
func openSwap(status string) bool {
	return status == "STARTED" || status == "RETURN_RECORDED" || status == "ISSUED"
}

// swapDue is what a Paystack payment for this swap must be: the tariff, or
// the booking-time discounted price. Plans and wallet holds owe nothing here.
func (b *Bay) swapDue(ctx context.Context, s db.SwapRowsRow) (int64, error) {
	var r *db.MobilityReservation
	if s.ReservationID != nil {
		row, err := b.q.ReservationByID(ctx, *s.ReservationID)
		if err != nil {
			return 0, err
		}
		r = &row
	}
	if m := strings.ToUpper(firstNonEmptyStr(resMode(r), s.PaymentMode)); m == "PLAN" || (r != nil && r.HoldAmountKobo > 0) {
		return 0, apperr.Conflict("NOTHING_DUE", "This swap is covered by a plan or wallet hold.")
	}
	tariff, err := ppsKobo(ctx, b.q, s.VehicleType)
	if err != nil {
		return 0, err
	}
	fee, _ := swapFee(r, "PAYSTACK", nil, tariff)
	if fee <= 0 {
		return 0, apperr.Conflict("NOTHING_DUE", "Nothing to pay for this swap.")
	}
	return fee, nil
}

// swapCheckout returns a usable Paystack checkout for the swap: the paid
// one, a fresh pending one for the same amount, or a new one.
func (b *Bay) swapCheckout(ctx context.Context, s db.SwapRowsRow) (db.FinanceWalletcheckout, error) {
	c, err := b.q.LatestSwapCheckout(ctx, &s.ID)
	if err == nil {
		if c, err = finance.VerifyAndSettle(ctx, b.pool, b.checkout, c); err != nil {
			return c, err
		}
		if c.Status == "SUCCESS" {
			return c, nil
		}
	} else if !database.IsNoRows(err) {
		return c, err
	}
	if !openSwap(s.Status) {
		return c, apperr.Conflict("INVALID_TRANSITION", "Swap is "+s.Status+"; it can no longer be paid for.")
	}
	due, err := b.swapDue(ctx, s)
	if err != nil {
		return c, err
	}
	if c.Status == "PENDING" && c.AmountKobo == due && time.Since(c.CreatedAt) < checkoutReuse {
		return c, nil
	}
	acct, err := b.q.AccountByID(ctx, s.AccountID)
	if err != nil {
		return c, err
	}
	if s.PaymentMode != "PAYSTACK" { // the rider's app shows the Pay prompt for PAYSTACK swaps
		if err := b.q.SetSwapPaymentMode(ctx, db.SetSwapPaymentModeParams{ID: s.ID, PaymentMode: "PAYSTACK"}); err != nil {
			return c, err
		}
	}
	return finance.StartCheckout(ctx, b.q, b.checkout, finance.CheckoutIn{Account: acct, Amount: due, Purpose: "SWAP",
		Swap: &s.ID, Return: "/"})
}

func checkoutJSON(c db.FinanceWalletcheckout, emailed bool) map[string]any {
	body := finance.CheckoutBody(c)
	body["paid"], body["emailed"] = c.Status == "SUCCESS", emailed
	return body
}

// swapCheckoutStart is POST /swaps/{id}/checkout/ {send_email?}: the rider
// (or desk staff) gets a Paystack checkout for the swap fee — access_code
// for the in-app popup, authorization_url as a shareable link.
func (b *Bay) swapCheckoutStart(w http.ResponseWriter, r *http.Request) {
	var in struct {
		SendEmail bool `json:"send_email"`
	}
	err := decode.JSON(r, &in)
	var s db.SwapRowsRow
	if err == nil {
		s, err = b.swap(r)
	}
	var c db.FinanceWalletcheckout
	if err == nil {
		c, err = b.swapCheckout(r.Context(), s)
	}
	emailed := false
	if err == nil && in.SendEmail && c.Status == "PENDING" {
		emailed, err = b.emailPayLink(r.Context(), s, c)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.JSON(w, http.StatusCreated, checkoutJSON(c, emailed))
}

// swapCheckoutStatus is GET /swaps/{id}/checkout/: the latest checkout,
// re-verified with Paystack while pending.
func (b *Bay) swapCheckoutStatus(w http.ResponseWriter, r *http.Request) {
	s, err := b.swap(r)
	var c db.FinanceWalletcheckout
	if err == nil {
		c, err = b.q.LatestSwapCheckout(r.Context(), &s.ID)
		if database.IsNoRows(err) {
			err = apperr.NotFound("No payment started for this swap.")
		}
	}
	if err == nil {
		c, err = finance.VerifyAndSettle(r.Context(), b.pool, b.checkout, c)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, checkoutJSON(c, false))
}

// emailPayLink sends the rider the hosted Paystack link.
func (b *Bay) emailPayLink(ctx context.Context, s db.SwapRowsRow, c db.FinanceWalletcheckout) (bool, error) {
	u, err := b.q.GetUserByID(ctx, s.OwnerUserID)
	if err != nil {
		return false, err
	}
	if u.Email == nil || strings.TrimSpace(*u.Email) == "" {
		return false, apperr.Conflict("NO_EMAIL", "The rider has no email on file — share the link instead.")
	}
	if b.mailer == nil {
		return false, nil
	}
	ok := b.mailer.Send(ctx, mail.Message{To: []string{*u.Email}, Subject: "Pay for your Kura swap at " + s.HubName,
		Template: "swap_payment", Context: map[string]any{"first_name": u.FirstName, "hub_name": s.HubName,
			"vehicle": s.VehiclePlate, "amount": finance.FormatNaira(c.AmountKobo), "pay_url": c.AuthorizationUrl}})
	return ok, nil
}

// paidWithPaystack settles a PAYSTACK swap: the rider's Paystack payment for
// this swap (confirmed by the webhook or a status check) is in their balance;
// the fee is taken from it and recorded as that card / transfer payment.
func paidWithPaystack(ctx context.Context, q *db.Queries, in settleIn, acct finance.Account) (settled, error) {
	id, err := uuid.Parse(in.SwapKey)
	if err != nil {
		return settled{}, apperr.Conflict("PAYMENT_MODE_UNSUPPORTED", "Paystack payment needs a started swap session.")
	}
	c, err := q.PaidSwapCheckout(ctx, &id)
	if database.IsNoRows(err) {
		return settled{}, apperr.Conflict("PAYMENT_REQUIRED",
			"Waiting for the rider's Paystack payment of "+finance.FormatNaira(in.Fee)+".")
	}
	if err != nil {
		return settled{}, err
	}
	p, err := finance.CaptureSwapPayment(ctx, q, acct, c, in.Fee, &in.Hub.ID)
	if ae, ok := apperr.As(err); ok && (ae.Code == "WALLET_INSUFFICIENT" || ae.Code == "WALLET_HOLD_MISSING") {
		return settled{}, apperr.Conflict("PAYMENT_SHORT", "The rider's Paystack payment no longer covers "+
			finance.FormatNaira(in.Fee)+" — take the difference with a new link or cash.")
	}
	return settled{Payment: &p.ID}, err
}
