package mobility

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/finance"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
)

// reservationCode is core.ids.reservation_code ("KB-0042").
func reservationCode() string {
	n, _ := rand.Int(rand.Reader, big.NewInt(10_000))
	return fmt.Sprintf("KB-%04d", n.Int64())
}

// cancelReservation is lifecycle.cancel_reservation (idempotent on terminal
// states): release the hold, booking discount and pack; notify the owner;
// abort any bay session it started.
func cancelReservation(ctx context.Context, q *db.Queries, id uuid.UUID, who *events.Actor, reason string) (db.MobilityReservation, error) {
	r, err := q.ReservationForUpdate(ctx, id)
	if err != nil {
		return r, err
	}
	switch r.Status {
	case "USED", "CANCELLED", "EXPIRED":
		return r, nil
	}
	acct, account, err := acctOf(ctx, q, r.AccountID)
	if err != nil {
		return r, err
	}
	if r.HoldAmountKobo > 0 {
		if _, err := finance.Release(ctx, q, acct, r.HoldAmountKobo, r.Code); err != nil {
			return r, err
		}
		r.HoldAmountKobo = 0
	}
	if r.DiscountCode != "" {
		if err := releaseDiscount(ctx, q, r); err != nil {
			return r, err
		}
	}
	if r.BatteryID != nil {
		if err := q.SetBatteryAvailable(ctx, *r.BatteryID); err != nil {
			return r, err
		}
	}
	r.Status = "CANCELLED"
	if err := saveReservation(ctx, q, r); err != nil {
		return r, err
	}
	ev := events.Event{Action: "reservation.cancelled", SubjectType: "reservation", SubjectID: r.ID.String(),
		SubjectLabel: r.Code, Actor: who}
	if reason != "" {
		ev.Metadata = events.Map{"reason": truncate(reason, 200)}
	}
	body := reason
	if body == "" {
		body = "Your battery reservation was cancelled and any hold was released."
	}
	ev.Notify = []events.NotifySpec{{UserID: account.OwnerUserID, Title: "Reservation cancelled",
		Body: truncate(body, 200), Source: "Reservations", LinkPath: "/swap", TemplateCode: "reservation.cancelled",
		DedupeKey: "reservation.cancelled:" + r.ID.String()}}
	if err := events.Emit(ctx, q, ev); err != nil {
		return r, err
	}
	return r, abortLinkedOpenSwap(ctx, q, r.ID, "abandoned:hold_cancelled", who)
}

// expireReservation is lifecycle.expire_reservation.
func expireReservation(ctx context.Context, q *db.Queries, id uuid.UUID) (db.MobilityReservation, error) {
	r, err := q.ReservationForUpdate(ctx, id)
	if err != nil {
		return r, err
	}
	if (r.Status != "PENDING" && r.Status != "CONFIRMED") || r.ExpiresAt.After(time.Now()) {
		return r, nil
	}
	if r.HoldAmountKobo > 0 {
		acct, _, err := acctOf(ctx, q, r.AccountID)
		if err == nil {
			_, err = finance.Release(ctx, q, acct, r.HoldAmountKobo, r.Code)
		}
		if err != nil {
			return r, err
		}
		r.HoldAmountKobo = 0
	}
	if r.DiscountCode != "" {
		if err := releaseDiscount(ctx, q, r); err != nil {
			return r, err
		}
	}
	if r.BatteryID != nil {
		if err := q.SetBatteryAvailable(ctx, *r.BatteryID); err != nil {
			return r, err
		}
	}
	r.Status = "EXPIRED"
	if err := saveReservation(ctx, q, r); err != nil {
		return r, err
	}
	if err := events.Emit(ctx, q, events.Event{Action: "reservation.expired", SubjectType: "reservation",
		SubjectID: r.ID.String(), SubjectLabel: r.Code}); err != nil {
		return r, err
	}
	return r, abortLinkedOpenSwap(ctx, q, r.ID, "abandoned:hold_expired", nil)
}

// ensureFresh is lifecycle.ensure_fresh (expire a lapsed live hold).
func ensureFresh(ctx context.Context, q *db.Queries, r db.MobilityReservation) (db.MobilityReservation, error) {
	if (r.Status == "PENDING" || r.Status == "CONFIRMED") && !r.ExpiresAt.After(time.Now()) {
		return expireReservation(ctx, q, r.ID)
	}
	return r, nil
}

// extendReservation is lifecycle.extend_reservation (re-issues the QR).
func (b *Bay) extendReservation(ctx context.Context, q *db.Queries, id uuid.UUID, minutes int64, who *events.Actor,
	reason string) error {
	pol, err := holdPolicy(ctx, q)
	if err != nil {
		return err
	}
	if minutes < 1 || minutes > int64(pol.MaxExtendMinutes) {
		return apperr.New("VALIDATION_ERROR", fmt.Sprintf("Extend minutes must be 1–%d.", pol.MaxExtendMinutes)).
			WithDetails(apperr.Details{"max_extend_minutes": pol.MaxExtendMinutes})
	}
	r, err := q.ReservationForUpdate(ctx, id)
	if err == nil {
		r, err = ensureFresh(ctx, q, r)
	}
	if err != nil {
		return err
	}
	if r.Status != "PENDING" && r.Status != "CONFIRMED" {
		return apperr.Conflict("INVALID_TRANSITION", fmt.Sprintf("Cannot extend reservation in status %s.", r.Status))
	}
	r.ExpiresAt = r.ExpiresAt.Add(time.Duration(minutes) * time.Minute)
	if err := b.issueQR(&r); err != nil {
		return err
	}
	if err := saveReservation(ctx, q, r); err != nil {
		return err
	}
	return events.Emit(ctx, q, events.Event{Action: "reservation.extended", SubjectType: "reservation",
		SubjectID: r.ID.String(), SubjectLabel: r.Code, Actor: who,
		Metadata: events.Map{"minutes": minutes, "reason": truncate(reason, 200)}})
}

// sourceChannel is discount_apply.channel_for_source.
func sourceChannel(source string) string {
	switch strings.ToUpper(source) {
	case "APP", "":
		return "App"
	case "USSD":
		return "USSD"
	}
	return "Hub"
}
