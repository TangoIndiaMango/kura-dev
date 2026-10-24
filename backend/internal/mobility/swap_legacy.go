package mobility

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/finance"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
)

// legacyIn is SwapCompleteRequestSerializer.
type legacyIn struct {
	ReservationID  *uuid.UUID   `json:"reservation_id"`
	HubID          uuid.UUID    `json:"hub_id" validate:"required"`
	VehicleID      uuid.UUID    `json:"vehicle_id" validate:"required"`
	DriverID       uuid.UUID    `json:"driver_id" validate:"required"`
	AccountID      uuid.UUID    `json:"account_id" validate:"required"`
	ReturnedSerial *string      `json:"returned_battery_serial"`
	IssuedSerial   string       `json:"issued_battery_serial" validate:"required"`
	ReturnedCharge *int64       `json:"returned_charge_pct"`
	IssuedCharge   *int64       `json:"issued_charge_pct"`
	Amount         *int64       `json:"amount_kobo"`
	Mode           *string      `json:"payment_mode" validate:"omitempty,oneof=PLAN WALLET CREDIT CASH"`
	Code           string       `json:"discount_code" validate:"max=40"`
	PinGrant       string       `json:"rider_pin_grant"`
	Override       *overrideReq `json:"override"`
}

func or64(p *int64, d int64) int32 {
	if p == nil {
		return int32(d)
	}
	return int32(*p)
}

// completeLegacy is SwapService.complete_swap: one-shot return + issue +
// settle (older clients). Velocity is checked by the caller first.
func (b *Bay) completeLegacy(ctx context.Context, q *db.Queries, in legacyIn, who *events.Actor) (uuid.UUID, settled, error) {
	hub, err := q.HubRow(ctx, in.HubID)
	if database.IsNoRows(err) {
		return uuid.Nil, settled{}, apperr.NotFound("Hub not found.")
	}
	if err != nil {
		return uuid.Nil, settled{}, err
	}
	v, err := q.VehicleForUpdate(ctx, in.VehicleID)
	if database.IsNoRows(err) {
		return uuid.Nil, settled{}, apperr.NotFound("Vehicle not found.")
	}
	if err != nil {
		return uuid.Nil, settled{}, err
	}
	model, err := q.VehicleModelByID(ctx, v.VehicleModelID)
	if err != nil {
		return uuid.Nil, settled{}, err
	}
	tariff, err := ppsKobo(ctx, q, model.VehicleType)
	if err != nil {
		return uuid.Nil, settled{}, err
	}
	first := v.CurrentBatteryID == nil
	var returned *db.MobilityBattery
	if serial := strings.TrimSpace(deref(in.ReturnedSerial)); serial != "" {
		rb, err := q.BatteryBySerialForUpdate(ctx, serial)
		if database.IsNoRows(err) {
			return uuid.Nil, settled{}, batteryNotFound("Returned", serial, 400)
		}
		if err != nil {
			return uuid.Nil, settled{}, err
		}
		returned = &rb
	} else if !first {
		return uuid.Nil, settled{}, apperr.Conflict("RETURN_REQUIRED", "This vehicle has a pack on it — scan the returned battery.")
	}
	issued, err := q.BatteryBySerialForUpdate(ctx, in.IssuedSerial)
	if database.IsNoRows(err) {
		return uuid.Nil, settled{}, batteryNotFound("Issued", in.IssuedSerial, 400)
	}
	if err != nil {
		return uuid.Nil, settled{}, err
	}
	mismatch := returned != nil && v.CurrentBatteryID != nil && *v.CurrentBatteryID != returned.ID
	var r *db.MobilityReservation
	if in.ReservationID != nil {
		row, err := q.ReservationForUpdate(ctx, *in.ReservationID)
		if database.IsNoRows(err) {
			return uuid.Nil, settled{}, apperr.NotFound("Reservation not found.")
		}
		if err == nil {
			row, err = ensureFresh(ctx, q, row)
		}
		if err != nil {
			return uuid.Nil, settled{}, err
		}
		switch row.Status {
		case "EXPIRED":
			return uuid.Nil, settled{}, apperr.Conflict("RESERVATION_EXPIRED", "This reservation has expired.")
		case "USED":
			return uuid.Nil, settled{}, apperr.Conflict("INVALID_TRANSITION", "Reservation already used.")
		case "CONFIRMED", "PENDING":
		default:
			return uuid.Nil, settled{}, apperr.Conflict("INVALID_TRANSITION", fmt.Sprintf("Reservation status %s cannot complete.", row.Status))
		}
		r = &row
	}
	mode := strings.ToUpper(firstNonEmptyStr(deref(in.Mode), resMode(r), "WALLET"))
	fee, held := swapFee(r, mode, in.Amount, tariff)
	base := v.ID.String()
	if r != nil {
		base = r.ID.String()
	}
	key := "swap-legacy:" + base + ":" + hub.ID.String()
	fee, discounted, err := swapDiscount(ctx, q, in.Code, r, held, mode, fee, tariff, in.AccountID, key)
	if err != nil {
		return uuid.Nil, settled{}, err
	}
	var vat int64
	if fee > 0 {
		_, vat = finance.SplitVAT(fee)
	}
	acct, err := q.AccountByID(ctx, in.AccountID)
	if err != nil {
		return uuid.Nil, settled{}, err
	}
	if mode == "WALLET" && fee > 0 && held <= 0 {
		if err := b.riderPin(acct, in.PinGrant); err != nil {
			return uuid.Nil, settled{}, err
		}
	}
	if err := flagGeoImpossible(ctx, q, v.ID, hub, &acct.ID, nil, model.VehicleType); err != nil {
		return uuid.Nil, settled{}, err
	}
	agent, err := b.agent(ctx, q, who)
	if err != nil {
		return uuid.Nil, settled{}, err
	}
	res, err := b.settle(ctx, q, settleIn{Mode: mode, Fee: fee, Reservation: r, Account: acct, Vehicle: v.ID, Hub: hub,
		Agent: agent, Actor: who})
	if err != nil {
		return uuid.Nil, res, err
	}
	source := "HUB_APP"
	if r != nil {
		r.Status, r.HoldAmountKobo = "USED", 0
		if err := saveReservation(ctx, q, *r); err != nil {
			return uuid.Nil, res, err
		}
		if err := releaseBattery(ctx, q, *r, &issued.ID); err != nil {
			return uuid.Nil, res, err
		}
		source = r.Source
	}
	now := time.Now()
	s := db.MobilitySwap{ID: ids.New(), ReturnedChargePct: or64(in.ReturnedCharge, 15), IssuedChargePct: or64(in.IssuedCharge, 100),
		PaymentMode: mode, AmountKobo: max(fee, 0), VatKobo: vat, MismatchFlag: mismatch, Status: "COMPLETED",
		AccountID: in.AccountID, AgentID: actorID(who), DriverID: in.DriverID, HubID: hub.ID, IssuedBatteryID: &issued.ID,
		ReservationID: idOf(r), VehicleID: v.ID, Source: source, CompletedAt: &now, StartedAt: &now,
		PaymentID: res.Payment, SubscriptionID: res.Subscription}
	if returned != nil {
		s.ReturnedBatteryID = &returned.ID
	}
	if err := q.InsertSwap(ctx, db.InsertSwapParams{ID: s.ID, ReturnedChargePct: s.ReturnedChargePct,
		IssuedChargePct: s.IssuedChargePct, PaymentMode: mode, AmountKobo: s.AmountKobo, VatKobo: vat, MismatchFlag: mismatch,
		Status: "COMPLETED", AccountID: s.AccountID, AgentID: s.AgentID, DriverID: s.DriverID, HubID: s.HubID,
		IssuedBatteryID: s.IssuedBatteryID, ReservationID: s.ReservationID, ReturnedBatteryID: s.ReturnedBatteryID,
		VehicleID: s.VehicleID, Source: source, CompletedAt: &now, StartedAt: &now, PaymentID: s.PaymentID,
		SubscriptionID: s.SubscriptionID}); err != nil {
		return uuid.Nil, res, err
	}
	if discounted && res.Payment != nil {
		if err := q.LinkRedemptionPayment(ctx, db.LinkRedemptionPaymentParams{IdempotencyKey: &key, PaymentID: res.Payment}); err != nil {
			return uuid.Nil, res, err
		}
	}
	at := bayCtx{hub: hub.ID, vehicle: v.ID, swap: s.ID, agent: actorID(who)}
	var returnedSerial *string
	if returned != nil {
		returnedSerial = &returned.Serial
		if err := returnCustody(ctx, q, at, &v, *returned, s.ReturnedChargePct, mismatch); err != nil {
			return uuid.Nil, res, err
		}
	}
	// Re-read the issued pack: the return above may have touched slots.
	fresh, err := q.BatteryForUpdate(ctx, issued.ID)
	if err != nil {
		return uuid.Nil, res, err
	}
	firstSwap := first && returned == nil
	if err := issueCustody(ctx, q, at, &v, fresh, s.IssuedChargePct, firstSwap); err != nil {
		return uuid.Nil, res, err
	}
	return s.ID, res, b.finalize(ctx, q, finalizeIn{Swap: s, Plate: v.RegistrationPlate, Hub: hub, Returned: returnedSerial,
		Issued: issued.Serial, Mismatch: mismatch, First: firstSwap, Fee: fee, Mode: mode, Rider: acct.OwnerUserID,
		Override: in.Override, Agent: agent, Actor: who})
}

// reverseSwap is swap.reverse.reverse_swap: COMPLETED → REVERSED within 24h.
func reverseSwap(ctx context.Context, q *db.Queries, id uuid.UUID, reason string, who *events.Actor) error {
	note := strings.TrimSpace(reason)
	if note == "" {
		return apperr.New("VALIDATION_ERROR", "A reason is required to reverse a swap.").
			WithDetails(apperr.Details{"reason": []string{"required"}})
	}
	s, err := q.SwapForUpdate(ctx, id)
	if err != nil {
		return err
	}
	if s.Status != "COMPLETED" {
		return apperr.Conflict("INVALID_TRANSITION", fmt.Sprintf("Only COMPLETED swaps can be reversed (got %s).", s.Status))
	}
	if s.CompletedAt == nil || time.Since(*s.CompletedAt) > 24*time.Hour {
		return apperr.Conflict("INVALID_TRANSITION", "Swap reverse is only allowed within 24 hours of completion.")
	}
	before := events.Map{"status": s.Status, "amount_kobo": s.AmountKobo, "payment_mode": s.PaymentMode}
	v, err := q.VehicleForUpdate(ctx, s.VehicleID)
	if err != nil {
		return err
	}
	at := bayCtx{hub: s.HubID, vehicle: v.ID, swap: s.ID, agent: actorID(who)}
	if s.IssuedBatteryID != nil {
		if err := rollbackIssue(ctx, q, at, &v, *s.IssuedBatteryID); err != nil {
			return err
		}
	}
	if s.ReturnedBatteryID != nil {
		if err := remountReturned(ctx, q, at, &v, *s.ReturnedBatteryID); err != nil {
			return err
		}
	}
	if err := reverseMoney(ctx, q, s); err != nil {
		return err
	}
	s.Status = "REVERSED"
	if err := saveSwap(ctx, q, s); err != nil {
		return err
	}
	return events.Emit(ctx, q, events.Event{Action: "swap.reversed", SubjectType: "swap", SubjectID: s.ID.String(),
		Actor: who, Before: before, After: events.Map{"status": "REVERSED"},
		Metadata: events.Map{"reason": truncate(note, 400)}})
}

// reverseMoney is _reverse_money.
func reverseMoney(ctx context.Context, q *db.Queries, s db.MobilitySwap) error {
	mode := strings.ToUpper(s.PaymentMode)
	if mode == "PLAN" && s.SubscriptionID != nil {
		sub, err := q.SubscriptionForUpdate(ctx, *s.SubscriptionID)
		if err != nil || sub.SwapsUsed <= 0 {
			return ignoreNoRows(err)
		}
		return q.BumpSubscriptionSwaps(ctx, db.BumpSubscriptionSwapsParams{ID: sub.ID, SwapsUsed: -1})
	}
	if s.AmountKobo <= 0 {
		return nil
	}
	var pay *db.FinancePayment
	if s.PaymentID != nil {
		p, err := q.PaymentStatusForUpdate(ctx, *s.PaymentID)
		if err != nil && !database.IsNoRows(err) {
			return err
		}
		if err == nil {
			pay = &p
		}
	}
	switch mode {
	case "WALLET", "PAYSTACK": // Paystack swaps were captured from the balance too
		acct, _, err := acctOf(ctx, q, s.AccountID)
		if err != nil {
			return err
		}
		return finance.ReverseCapture(ctx, q, acct, s.AmountKobo, s.ID.String()[:20], pay)
	case "CASH":
		if pay != nil && pay.Status == "SUCCESS" {
			return q.SetPaymentStatus(ctx, db.SetPaymentStatusParams{ID: pay.ID, Status: "REVERSED"})
		}
	}
	return nil
}
