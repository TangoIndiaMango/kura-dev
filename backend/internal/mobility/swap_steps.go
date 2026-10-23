package mobility

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/risk"
)

var mismatchReasons = map[string]bool{"OTHER_HUB_ISSUED": true, "REPLACED_BY_OPS": true, "UNKNOWN": true}

func batteryNotFound(kind, serial string, status int) error {
	return apperr.New("BATTERY_NOT_FOUND", fmt.Sprintf("%s battery %s not found.", kind, serial)).WithStatus(status)
}

// recordReturn is swap.return_.record_return: STARTED → RETURN_RECORDED.
func recordReturn(ctx context.Context, q *db.Queries, id uuid.UUID, serial string, charge int32, reason string,
	who *events.Actor) (bool, error) {
	serial = strings.TrimSpace(serial)
	if serial == "" {
		return false, apperr.New("VALIDATION_ERROR", "battery_serial is required.").
			WithDetails(apperr.Details{"battery_serial": []string{"required"}})
	}
	s, err := q.SwapForUpdate(ctx, id)
	if err != nil {
		return false, err
	}
	if s.Status != "STARTED" {
		return false, apperr.Conflict("INVALID_TRANSITION", "Cannot record return from status "+s.Status+".")
	}
	b, err := q.BatteryBySerialForUpdate(ctx, serial)
	if database.IsNoRows(err) {
		return false, batteryNotFound("Returned", serial, http.StatusNotFound)
	}
	if err != nil {
		return false, err
	}
	v, err := q.VehicleByIDPlain(ctx, s.VehicleID)
	if err != nil {
		return false, err
	}
	if v.CurrentBatteryID == nil {
		return false, apperr.Conflict("FIRST_SWAP_NO_RETURN", "This vehicle has no pack mounted — skip return and issue a charged pack.")
	}
	mismatch := *v.CurrentBatteryID != b.ID
	reason = strings.ToUpper(strings.TrimSpace(reason))
	if mismatch && !mismatchReasons[reason] {
		return false, apperr.Conflict("VALIDATION_ERROR", "Mismatch requires reason: OTHER_HUB_ISSUED | REPLACED_BY_OPS | UNKNOWN.").
			WithDetails(apperr.Details{"mismatch_reason": []string{"required"}})
	}
	at := bayCtx{hub: s.HubID, vehicle: v.ID, swap: s.ID, agent: actorID(who)}
	if err := returnCustody(ctx, q, at, &v, b, charge, mismatch); err != nil {
		return false, err
	}
	s.ReturnedBatteryID, s.ReturnedChargePct, s.MismatchFlag, s.Status = &b.ID, charge, mismatch, "RETURN_RECORDED"
	s.MismatchReason = ""
	if mismatch {
		s.MismatchReason = reason
	}
	if err := saveSwap(ctx, q, s); err != nil {
		return false, err
	}
	if mismatch {
		if _, err := risk.Emit(ctx, q, risk.Event{RuleCode: "BATTERY_MISMATCH", SubjectType: "swap", SubjectID: s.ID.String(),
			AccountID: &s.AccountID, Context: map[string]any{"reason": reason, "serial": serial}}); err != nil {
			return false, err
		}
	}
	var why any
	if mismatch {
		why = reason
	}
	return mismatch, events.Emit(ctx, q, events.Event{Action: "swap.return_recorded", SubjectType: "swap",
		SubjectID: s.ID.String(), Actor: who,
		Metadata: events.Map{"serial": serial, "mismatch": mismatch, "mismatch_reason": why}})
}

// issueBattery is swap.issue.issue_battery: → ISSUED (first swap may skip
// the return).
func issueBattery(ctx context.Context, q *db.Queries, id uuid.UUID, serial string, charge int32, who *events.Actor) error {
	serial = strings.TrimSpace(serial)
	if serial == "" {
		return apperr.New("VALIDATION_ERROR", "battery_serial is required.").
			WithDetails(apperr.Details{"battery_serial": []string{"required"}})
	}
	s, err := q.SwapForUpdate(ctx, id)
	if err != nil {
		return err
	}
	v, err := q.VehicleByIDPlain(ctx, s.VehicleID)
	if err != nil {
		return err
	}
	first := s.Status == "STARTED" && v.CurrentBatteryID == nil
	if s.Status == "STARTED" && !first {
		return apperr.Conflict("INVALID_TRANSITION", "Record the returned pack before issuing.")
	}
	if s.Status != "STARTED" && s.Status != "RETURN_RECORDED" {
		return apperr.Conflict("INVALID_TRANSITION", "Cannot issue from status "+s.Status+".")
	}
	b, err := q.BatteryBySerialForUpdate(ctx, serial)
	if database.IsNoRows(err) {
		return batteryNotFound("Issued", serial, http.StatusNotFound)
	}
	if err != nil {
		return err
	}
	if b.Status != "AVAILABLE" && b.Status != "RESERVED" {
		return apperr.Conflict("BATTERY_NOT_AVAILABLE", fmt.Sprintf("Battery %s is %s.", serial, b.Status)).
			WithDetails(apperr.Details{"status": b.Status, "custodian_type": b.CustodianType,
				"custodian_id": idOrEmpty(b.CustodianID)})
	}
	if b.Status == "RESERVED" {
		var own *uuid.UUID
		if s.ReservationID != nil {
			if r, err := q.ReservationByID(ctx, *s.ReservationID); err == nil {
				own = r.BatteryID
			}
		}
		if own == nil || *own != b.ID {
			return apperr.Conflict("BATTERY_NOT_AVAILABLE", fmt.Sprintf("Battery %s is held for another reservation.", serial)).
				WithDetails(apperr.Details{"status": b.Status})
		}
	}
	if b.CurrentHubID != nil && *b.CurrentHubID != s.HubID {
		return apperr.Conflict("BATTERY_NOT_AVAILABLE", fmt.Sprintf("Battery %s is not at this hub.", serial))
	}
	model, err := q.VehicleModelByID(ctx, v.VehicleModelID)
	if err != nil {
		return err
	}
	if b.BatteryTypeID != model.BatteryTypeID {
		return apperr.Conflict("BATTERY_TYPE_INCOMPATIBLE", fmt.Sprintf("Battery %s type does not match this vehicle.", serial)).
			WithDetails(apperr.Details{"expected": model.BatteryTypeID.String(), "got": b.BatteryTypeID.String()})
	}
	at := bayCtx{hub: s.HubID, vehicle: v.ID, swap: s.ID, agent: actorID(who)}
	if err := issueCustody(ctx, q, at, &v, b, charge, first); err != nil {
		return err
	}
	s.IssuedBatteryID, s.IssuedChargePct, s.Status = &b.ID, charge, "ISSUED"
	if err := saveSwap(ctx, q, s); err != nil {
		return err
	}
	return events.Emit(ctx, q, events.Event{Action: "swap.issued", SubjectType: "swap", SubjectID: s.ID.String(),
		Actor: who, Metadata: events.Map{"serial": serial, "first_swap": first}})
}

func idOrEmpty(id *uuid.UUID) string {
	if id == nil {
		return ""
	}
	return id.String()
}
