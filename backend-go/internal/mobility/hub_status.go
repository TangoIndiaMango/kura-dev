package mobility

import (
	"net/http"
	"strings"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
)

// hubStatus is HubService.set_status: going OFFLINE / MAINTENANCE / CLOSED
// cancels the hub's live holds and pages its on-duty staff.
func (h *HubHandler) hubStatus(b *Bay) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		var in hubStatusIn
		err := decode.JSON(r, &in)
		var row db.HubRowsRow
		if err == nil {
			row, err = h.object(r)
		}
		if err == nil {
			err = b.tx(ctx, func(q *db.Queries, who *events.Actor) error {
				hub, err := q.HubForUpdate(ctx, row.ID)
				if err != nil {
					return err
				}
				before := hub.Status
				if err := q.SetHubStatus(ctx, db.SetHubStatusParams{ID: hub.ID, Status: in.Status}); err != nil {
					return err
				}
				down := in.Status == "OFFLINE" || in.Status == "MAINTENANCE" || in.Status == "CLOSED"
				changed := down && before != in.Status
				cancelled := 0
				if changed {
					live, err := q.LiveReservationsAtHub(ctx, hub.ID)
					if err != nil {
						return err
					}
					reason := hub.Name + " is temporarily " + strings.ToLower(in.Status) + "."
					for _, id := range live {
						if _, err := cancelReservation(ctx, q, id, who, reason); err != nil {
							return err
						}
						cancelled++
					}
				}
				if err := q.TouchHubSync(ctx, hub.ID); err != nil {
					return err
				}
				if err := events.Emit(ctx, q, events.Event{Action: "hub.status_changed", SubjectType: "hub",
					SubjectID: hub.ID.String(), SubjectLabel: hub.Code, Actor: who,
					Before: events.Map{"status": before}, After: events.Map{"status": in.Status},
					Metadata: events.Map{"note": in.Note, "cancelled_reservations": cancelled}}); err != nil {
					return err
				}
				if !changed {
					return nil
				}
				staff, err := q.UsersForHub(ctx, hub.ID)
				if err != nil {
					return err
				}
				body := in.Note
				if body == "" {
					body = hub.Name + " set to " + in.Status
				}
				for _, u := range staff {
					if err := events.Emit(ctx, q, events.Event{Action: "hub.status_operator_notified", SubjectType: "hub",
						SubjectID: hub.ID.String(), SubjectLabel: hub.Code, Actor: who,
						Metadata: events.Map{"status": in.Status},
						Notify: []events.NotifySpec{{UserID: u, Title: "Hub " + hub.Code + " → " + in.Status,
							Body: truncate(body, 200), Source: "Hubs", Severity: events.Warning,
							LinkPath: "/hubs/" + hub.ID.String(), TemplateCode: "hub.status_changed",
							DedupeKey: "hub.status:" + hub.ID.String() + ":" + in.Status + ":" + u.String()}}}); err != nil {
						return err
					}
				}
				return nil
			})
		}
		var d HubDetailDTO
		if err == nil {
			d, err = h.detail(ctx, row.ID)
		}
		if err != nil {
			respond.Error(w, r, err)
			return
		}
		respond.OK(w, d)
	}
}
