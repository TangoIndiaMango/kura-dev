package mobility

import (
	"context"
	"net/http"
	"strings"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
)

type vehicleNoteReq struct {
	Note string `json:"note" validate:"max=500"`
}

// retire is VehicleService.retire: refuse with a mounted pack, mark RETIRED
// and cancel the active plan (no automatic credit) in one transaction.
func (h *VehicleHandler) retire() http.HandlerFunc {
	return vehicleAction(h, func(ctx context.Context, cur db.VehicleRowsRow, b vehicleNoteReq, _ map[string]bool) error {
		return h.vehicleTx(ctx, cur.ID, func(q *db.Queries, v db.MobilityVehicle, who *events.Actor) error {
			if v.CurrentBatteryID != nil {
				return apperr.Conflict("VEHICLE_HAS_BATTERY", "Remove or return the mounted pack before retiring this vehicle.")
			}
			before := v.Status
			v.Status = "RETIRED"
			if err := saveVehicle(ctx, q, v); err != nil {
				return err
			}
			if s, err := q.ActiveSubscriptionForVehicle(ctx, v.ID); err == nil {
				if err := cancelSubscription(ctx, q, s.ID, who, "vehicle_retired"); err != nil {
					return err
				}
			} else if !database.IsNoRows(err) {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "vehicle.retired", SubjectType: "vehicle",
				SubjectID: v.ID.String(), SubjectLabel: v.RegistrationPlate, Actor: who,
				Before: events.Map{"status": before}, After: events.Map{"status": v.Status},
				Metadata: events.Map{"note": truncate(strings.TrimSpace(b.Note), 400)}})
		})
	})
}
