package accounts

import (
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
)

// patch mirrors CooperativeService.update (404 before body validation).
func (h *CoopHandler) patch(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, r, apperr.NotFound("Not found."))
		return
	}
	if _, err := h.detail(r, h.q, id); err != nil {
		respond.Error(w, r, err)
		return
	}
	var b coopWrite
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	if b.Name != nil && *b.Name == "" {
		respond.Error(w, r, apperr.Field("name", "This field may not be blank."))
		return
	}
	var out CoopDTO
	err = database.InTx(r.Context(), h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		c, err := q.CooperativeForUpdate(r.Context(), id)
		if err != nil {
			return err
		}
		cur, err := q.GetCooperative(r.Context(), id)
		if err != nil {
			return err
		}
		before := events.Map{"name": cur.Name, "region": cur.Region, "status": cur.Status}
		name, region, status := cur.Name, cur.Region, cur.Status
		if b.Name != nil {
			if name = strings.TrimSpace(*b.Name); name == "" {
				return apperr.New("VALIDATION_ERROR", "Cooperative name is required.").
					WithDetails(apperr.Details{"name": []string{"required"}})
			}
		}
		if b.Region != nil {
			region = strings.TrimSpace(*b.Region)
		}
		if b.Status != nil && *b.Status != "" {
			status = *b.Status
		}
		if err := q.UpdateCooperative(r.Context(), db.UpdateCooperativeParams{ID: c.ID, Name: name,
			Region: region, Status: status}); err != nil {
			return err
		}
		who, err := actor.FromRequest(r.Context(), q)
		if err != nil {
			return err
		}
		if err := events.Emit(r.Context(), q, events.Event{Action: "cooperative.updated",
			SubjectType: "cooperative", SubjectID: id.String(), SubjectLabel: name, Actor: who,
			Before: before, After: events.Map{"name": name, "region": region, "status": status}}); err != nil {
			return err
		}
		out, err = h.detail(r, q, id)
		return err
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, out)
}
