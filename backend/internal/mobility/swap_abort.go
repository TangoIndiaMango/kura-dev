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
)

func saveSwap(ctx context.Context, q *db.Queries, s db.MobilitySwap) error {
	return q.SaveSwap(ctx, db.SaveSwapParams{ID: s.ID, ReturnedChargePct: s.ReturnedChargePct,
		IssuedChargePct: s.IssuedChargePct, PaymentMode: s.PaymentMode, AmountKobo: s.AmountKobo, VatKobo: s.VatKobo,
		MismatchFlag: s.MismatchFlag, Status: s.Status, AgentID: s.AgentID, IssuedBatteryID: s.IssuedBatteryID,
		ReturnedBatteryID: s.ReturnedBatteryID, CompletedAt: s.CompletedAt, MismatchReason: s.MismatchReason,
		PaymentID: s.PaymentID, SubscriptionID: s.SubscriptionID})
}

func saveReservation(ctx context.Context, q *db.Queries, r db.MobilityReservation) error {
	return q.SaveReservation(ctx, db.SaveReservationParams{ID: r.ID, Status: r.Status, HoldAmountKobo: r.HoldAmountKobo,
		ExpiresAt: r.ExpiresAt, TokenHash: r.TokenHash, TokenCiphertext: r.TokenCiphertext,
		ListPriceKobo: r.ListPriceKobo, DiscountCode: r.DiscountCode, DiscountKobo: r.DiscountKobo})
}

func acctOf(ctx context.Context, q *db.Queries, id uuid.UUID) (finance.Account, db.AccountsAccount, error) {
	a, err := q.AccountByID(ctx, id)
	return finance.Account{ID: a.ID, KuraID: a.KuraID}, a, err
}

// releaseDiscount is DiscountService.release_reservation.
func releaseDiscount(ctx context.Context, q *db.Queries, r db.MobilityReservation) error {
	key := "reservation:" + r.ID.String()
	id, err := q.ReleaseRedemptionForReservation(ctx, &key)
	if database.IsNoRows(err) {
		return nil
	}
	if err != nil {
		return err
	}
	return q.DecrementRedemptions(ctx, id)
}

// releaseBattery is release_reservation_battery (keep = the pack being issued).
func releaseBattery(ctx context.Context, q *db.Queries, r db.MobilityReservation, keep *uuid.UUID) error {
	if r.BatteryID == nil || (keep != nil && *keep == *r.BatteryID) {
		return nil
	}
	return q.ReleaseReservedBattery(ctx, *r.BatteryID)
}

// abortSwap is abort_swap: → FAILED, roll back an issued pack, release the
// hold (EXPIRED / CANCELLED) and its booking-time discount.
func abortSwap(ctx context.Context, q *db.Queries, id uuid.UUID, reason string, agent *uuid.UUID, who *events.Actor) error {
	s, err := q.SwapForUpdate(ctx, id)
	if err != nil {
		return err
	}
	switch s.Status {
	case "COMPLETED", "FAILED", "REVERSED":
		return apperr.Conflict("INVALID_TRANSITION", fmt.Sprintf("Cannot abort swap in status %s.", s.Status))
	}
	if s.Status == "ISSUED" && s.IssuedBatteryID != nil {
		v, err := q.VehicleForUpdate(ctx, s.VehicleID)
		if err != nil {
			return err
		}
		if err := rollbackIssue(ctx, q, bayCtx{hub: s.HubID, vehicle: v.ID, swap: s.ID, agent: agent}, &v,
			*s.IssuedBatteryID); err != nil {
			return err
		}
		s.IssuedBatteryID = nil
		if err := saveSwap(ctx, q, s); err != nil {
			return err
		}
	}
	if s.ReservationID != nil {
		r, err := q.ReservationForUpdate(ctx, *s.ReservationID)
		if err != nil {
			return err
		}
		live := r.Status == "PENDING" || r.Status == "CONFIRMED"
		if r.HoldAmountKobo > 0 && r.PaymentMode == "WALLET" {
			acct, _, err := acctOf(ctx, q, r.AccountID)
			if err == nil {
				_, err = finance.Release(ctx, q, acct, r.HoldAmountKobo, r.Code)
			}
			if err != nil {
				return err
			}
		}
		r.HoldAmountKobo = 0
		switch {
		case r.Status == "EXPIRED":
		case live && !r.ExpiresAt.After(time.Now()):
			r.Status = "EXPIRED"
		default:
			r.Status = "CANCELLED"
		}
		if err := saveReservation(ctx, q, r); err != nil {
			return err
		}
		if live {
			if err := releaseBattery(ctx, q, r, nil); err != nil {
				return err
			}
			if r.DiscountCode != "" {
				if err := releaseDiscount(ctx, q, r); err != nil {
					return err
				}
			}
		}
	}
	s.Status = "FAILED"
	if err := saveSwap(ctx, q, s); err != nil {
		return err
	}
	return events.Emit(ctx, q, events.Event{Action: "swap.aborted", SubjectType: "swap", SubjectID: s.ID.String(),
		Actor: who, Metadata: events.Map{"reason": truncate(strings.TrimSpace(reason), 200)}})
}

// abortLinkedOpenSwap is abort_linked_open_swap (an INVALID_TRANSITION is
// swallowed).
func abortLinkedOpenSwap(ctx context.Context, q *db.Queries, reservation uuid.UUID, reason string, who *events.Actor) error {
	s, err := q.OpenSwapForReservation(ctx, &reservation)
	if database.IsNoRows(err) {
		return nil
	}
	if err != nil {
		return err
	}
	err = abortSwap(ctx, q, s.ID, reason, actorID(who), who)
	if e, ok := apperr.As(err); ok && e.Code == "INVALID_TRANSITION" {
		return nil
	}
	return err
}

// clearIncomplete is clear_incomplete_swaps_for_vehicle: abort stale open
// sessions on rebook, refuse while a live one is open.
func (b *Bay) clearIncomplete(ctx context.Context, q *db.Queries, vehicle uuid.UUID, who *events.Actor) error {
	open, err := q.OpenSwapsForVehicle(ctx, vehicle)
	if err != nil {
		return err
	}
	for _, id := range open {
		rows, err := q.SwapRows(ctx, []uuid.UUID{id})
		if err != nil || len(rows) == 0 {
			return err
		}
		ui := uiStatus(rows[0])
		if ui == "INCOMPLETE" {
			if err := abortSwap(ctx, q, id, "abandoned:rebook_clear", actorID(who), who); err != nil {
				return err
			}
			continue
		}
		return apperr.Conflict("SWAP_IN_PROGRESS", "This vehicle already has a swap open at the hub. "+
			"Ask the hub agent to finish or abort it, or wait for the session to clear.").
			WithDetails(apperr.Details{"swap_id": id.String(), "ui_status": ui, "status": rows[0].Status})
	}
	return nil
}
