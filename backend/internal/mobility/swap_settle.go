package mobility

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/credit"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/finance"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/operations"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/risk"
)

func hexToken(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// settled is SettleResult (+ the cash deposit to email after commit).
type settled struct {
	Payment, Subscription *uuid.UUID
	Deposit               *uuid.UUID
}

// settleIn is settle_swap_payment's arguments.
type settleIn struct {
	Mode        string
	Fee         int64
	Reservation *db.MobilityReservation
	Account     db.AccountsAccount
	Vehicle     uuid.UUID
	Hub         db.MobilityHub
	Agent       *operations.Agent
	SwapKey     string
	Actor       *events.Actor
}

// settle is settle_swap_payment: plan allowance, wallet capture (of the
// hold, or a walk-in hold+capture), agent cash or swap credit.
func (b *Bay) settle(ctx context.Context, q *db.Queries, in settleIn) (settled, error) {
	acct := finance.Account{ID: in.Account.ID, KuraID: in.Account.KuraID}
	if in.Mode != "PAYSTACK" {
		// Settled another way: a Paystack payment already made for this swap
		// is refunded to the rider's card.
		if id, err := uuid.Parse(in.SwapKey); err == nil {
			if err := finance.RefundUnusedSwapPayments(ctx, q, id); err != nil {
				return settled{}, err
			}
		}
	}
	if in.Mode == "PLAN" {
		s, err := planCovers(ctx, q, in.Vehicle)
		if err != nil {
			return settled{}, err
		}
		if err := q.BumpSubscriptionSwaps(ctx, db.BumpSubscriptionSwapsParams{ID: s.ID, SwapsUsed: 1}); err != nil {
			return settled{}, err
		}
		return settled{Subscription: &s.ID}, nil
	}
	if in.Fee <= 0 {
		return settled{}, nil
	}
	r := in.Reservation
	if r != nil && r.HoldAmountKobo > 0 && in.Mode != "WALLET" {
		if _, err := finance.Release(ctx, q, acct, r.HoldAmountKobo, r.Code); err != nil {
			return settled{}, err
		}
	}
	switch in.Mode {
	case "WALLET":
		ref, amount := "", in.Fee
		if r != nil && r.HoldAmountKobo > 0 {
			ref, amount = r.Code, r.HoldAmountKobo
		} else {
			ref = "WALKIN-" + hexToken(8)
			if _, err := finance.Hold(ctx, q, acct, amount, ref); err != nil {
				return settled{}, err
			}
		}
		p, err := finance.Capture(ctx, q, acct, amount, ref, "SWAP", &in.Hub.ID)
		return settled{Payment: &p.ID}, err
	case "CASH":
		if in.Agent == nil {
			return settled{}, apperr.Conflict("SHIFT_REQUIRED", "Cash settlement requires a hub agent.")
		}
		key := ""
		switch {
		case in.SwapKey != "":
			key = "swap-cash:" + in.SwapKey
		case r != nil:
			key = fmt.Sprintf("swap-cash:%s:%d", r.ID, in.Fee)
		default:
			key = "walkin-cash:" + hexToken(16)
		}
		d, err := b.ops.Record(ctx, q, operations.DepositIn{Agent: *in.Agent, Hub: in.Hub, Account: in.Account,
			Amount: in.Fee, Purpose: "SWAP", IdemKey: truncate(key, 64), Actor: in.Actor})
		if err != nil {
			return settled{}, err
		}
		return settled{Payment: d.PaymentID, Deposit: &d.ID}, nil
	case "CREDIT":
		ref := "WALKIN-CREDIT-" + hexToken(6)
		if r != nil {
			ref = r.Code
		}
		p, err := credit.ConsumeSwapCredit(ctx, q, in.Account, in.Fee, ref, &in.Hub.ID)
		return settled{Payment: &p.ID}, err
	case "PAYSTACK":
		return paidWithPaystack(ctx, q, in, acct)
	}
	return settled{}, apperr.New("PAYMENT_MODE_UNSUPPORTED", "Unsupported payment mode "+in.Mode+".")
}

// flagGeoImpossible is flag_geo_impossible_if_needed (flag only).
func flagGeoImpossible(ctx context.Context, q *db.Queries, vehicle uuid.UUID, hub db.MobilityHub, account *uuid.UUID,
	swap *uuid.UUID, vehicleType string) error {
	p, err := risk.EnabledParams(ctx, q, "GEO_IMPOSSIBLE", map[string]float64{"MAX_SPEED_KMH": 80, "MAX_SPEED_KMH_BOAT": 40})
	if p == nil || err != nil {
		return err
	}
	exclude := uuid.Nil
	if swap != nil {
		exclude = *swap
	}
	prev, err := q.PrevCompletedSwap(ctx, db.PrevCompletedSwapParams{VehicleID: vehicle, Exclude: exclude})
	if err != nil || prev.CompletedAt == nil || prev.HubID == hub.ID {
		return ignoreNoRows(err)
	}
	dist := haversineKm(prev.Lat, prev.Lng, hub.Lat, hub.Lng)
	if dist < 0.05 {
		return nil
	}
	hours := time.Since(*prev.CompletedAt).Hours()
	speed := math.Inf(1)
	if hours > 0 {
		speed = dist / hours
	}
	limit := p["MAX_SPEED_KMH"]
	if vehicleType == "BOAT" {
		limit = p["MAX_SPEED_KMH_BOAT"]
	}
	if speed <= limit {
		return nil
	}
	var implied any
	if !math.IsInf(speed, 1) {
		implied = pyRound(speed, 1)
	}
	subjectType, subjectID := "vehicle", vehicle.String()
	if swap != nil {
		subjectType, subjectID = "swap", swap.String()
	}
	_, err = risk.Emit(ctx, q, risk.Event{RuleCode: "GEO_IMPOSSIBLE", SubjectType: subjectType, SubjectID: subjectID,
		AccountID: account, Severity: "HIGH", ActionTaken: "FLAG",
		Context: map[string]any{"from_hub": prev.Code, "to_hub": hub.Code, "distance_km": pyRound(dist, 2),
			"implied_kmh": implied, "limit_kmh": limit, "prev_completed_at": jsontime.FormatISO(*prev.CompletedAt)}})
	return err
}

// finalizeIn is finalize_completed_swap's arguments.
type finalizeIn struct {
	Swap            db.MobilitySwap
	Plate           string
	Hub             db.MobilityHub
	Returned        *string
	Issued          string
	Mismatch, First bool
	Fee             int64
	Mode            string
	Rider           uuid.UUID
	Override        *overrideReq
	Agent           *operations.Agent
	Actor           *events.Actor
}

type overrideReq struct {
	Reason   string `json:"reason" validate:"required,max=50"`
	Note     string `json:"note" validate:"required,max=2000"`
	PinGrant string `json:"agent_pin_grant" validate:"required"`
}

// finalize is finalize_completed_swap: rider notice + swap.completed audit,
// then the agent override (if any).
func (b *Bay) finalize(ctx context.Context, q *db.Queries, in finalizeIn) error {
	feeBit := ""
	if in.Fee > 0 {
		feeBit = " · " + finance.FormatNaira(in.Fee)
	}
	link := "/swap"
	if in.Swap.PaymentID != nil {
		link = "/receipt/" + in.Swap.PaymentID.String()
	}
	var returned any
	if in.Returned != nil {
		returned = *in.Returned
	}
	err := events.Emit(ctx, q, events.Event{Action: "swap.completed", SubjectType: "swap", SubjectID: in.Swap.ID.String(),
		Actor: in.Actor,
		Metadata: events.Map{"vehicle": in.Plate, "returned": returned, "issued": in.Issued, "mismatch": in.Mismatch,
			"amount_kobo": in.Fee, "payment_mode": in.Mode, "first_swap": in.First},
		Notify: []events.NotifySpec{{UserID: in.Rider, Title: "Swap complete",
			Body:   fmt.Sprintf("%s issued at %s for %s%s.", in.Issued, in.Hub.Name, in.Plate, feeBit),
			Source: "Swaps", Severity: events.Info, Channels: []string{events.InApp, events.SMS},
			TemplateCode: "swap.completed", LinkPath: link,
			Params: events.Map{"swap_id": in.Swap.ID.String(), "hub_code": in.Hub.Code, "vehicle": in.Plate,
				"issued_serial": in.Issued, "returned_serial": returned, "amount_kobo": in.Fee, "payment_mode": in.Mode,
				"first_swap": in.First},
			DedupeKey: "swap.completed:" + in.Swap.ID.String()}}})
	if err != nil || in.Override == nil || in.Agent == nil {
		return err
	}
	_, err = b.ops.RecordOverride(ctx, q, operations.OverrideIn{Agent: *in.Agent, Reason: in.Override.Reason,
		Note: in.Override.Note, PinGrant: in.Override.PinGrant, Swap: &in.Swap.ID, Hub: &in.Hub.ID, Actor: in.Actor})
	return err
}
