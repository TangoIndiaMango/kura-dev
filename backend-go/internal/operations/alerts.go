package operations

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

// AlertDTO is AlertListSerializer.
type AlertDTO struct {
	ID              string          `json:"id"`
	Kind            string          `json:"kind"`
	Severity        string          `json:"severity"`
	Status          string          `json:"status"`
	Message         string          `json:"message"`
	HubID           *string         `json:"hub_id"`
	HubCode         *string         `json:"hub_code"`
	HubName         *string         `json:"hub_name"`
	DeliveryChannel string          `json:"delivery_channel"`
	IsResolved      bool            `json:"is_resolved"`
	CreatedAt       jsontime.Field  `json:"created_at"`
	AcknowledgedAt  *jsontime.Field `json:"acknowledged_at"`
	ResolvedAt      *jsontime.Field `json:"resolved_at"`
}

// AlertDetailDTO is AlertDetailSerializer.
type AlertDetailDTO struct {
	AlertDTO
	ResolveNote      string         `json:"resolve_note"`
	AcknowledgedByID *string        `json:"acknowledged_by_id"`
	ResolvedByID     *string        `json:"resolved_by_id"`
	UpdatedAt        jsontime.Field `json:"updated_at"`
}

func alertDTO(a db.AlertRowsRow) AlertDTO {
	return AlertDTO{ID: a.ID.String(), Kind: a.Kind, Severity: a.Severity, Status: a.Status, Message: a.Message,
		HubID: idStr(a.HubID), HubCode: a.HubCode, HubName: a.HubName, DeliveryChannel: a.DeliveryChannel,
		IsResolved: a.IsResolved, CreatedAt: jsontime.Field(a.CreatedAt),
		AcknowledgedAt: jsontime.FieldPtr(a.AcknowledgedAt), ResolvedAt: jsontime.FieldPtr(a.ResolvedAt)}
}

func (h *Handler) alertFilter(r *http.Request) (db.AlertsPageParams, error) {
	qp := decode.Params(r)
	p := db.AlertsPageParams{Status: listq.Exact(r, "status"), Severity: listq.Exact(r, "severity"),
		Kind: listq.Exact(r, "kind"), Hub: qp.UUID("hub"), IsResolved: listq.NullBool(r, "is_resolved"),
		Q: listq.Search(r)}
	if d := qp.Date("start_date"); d != nil {
		p.FromAt = midnight(*d, 0)
	}
	if d := qp.Date("end_date"); d != nil {
		p.ToAt = midnight(*d, 1)
	}
	if err := qp.Err(); err != nil {
		return p, err
	}
	var err error
	p.AllHubs, p.Hubs, err = h.hubScope(r.Context())
	return p, err
}

func (h *Handler) alertRows(ctx context.Context, ids []uuid.UUID) ([]db.AlertRowsRow, error) {
	rows, err := h.q.AlertRows(ctx, ids)
	if err != nil {
		return nil, err
	}
	by := map[uuid.UUID]db.AlertRowsRow{}
	for _, a := range rows {
		by[a.ID] = a
	}
	out := make([]db.AlertRowsRow, 0, len(ids))
	for _, id := range ids {
		if a, ok := by[id]; ok {
			out = append(out, a)
		}
	}
	return out, nil
}

func (h *Handler) alerts(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p, err := h.alertFilter(r)
	var at *paginate.Key
	if err == nil {
		at, err = paginate.Cursor(r)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	size := paginate.Size(r)
	p.Lim = int32(size + 1)
	if at != nil {
		p.AfterAt, p.Back = &at.CreatedAt, at.Back
		p.AfterID, _ = uuid.Parse(at.ID)
	}
	ids, err := h.q.AlertsPage(ctx, p)
	var rows []db.AlertRowsRow
	if err == nil {
		rows, err = h.alertRows(ctx, paginate.Display(ids, size, p.Back))
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]AlertDTO, len(rows))
	for i, a := range rows {
		out[i] = alertDTO(a)
	}
	respond.OK(w, paginate.BuildCursorPage(r, out, size, at, func(a AlertDTO) paginate.Key {
		return paginate.Key{CreatedAt: time.Time(a.CreatedAt), ID: a.ID}
	}))
}

func (h *Handler) alert(r *http.Request) (db.AlertRowsRow, error) {
	ctx := r.Context()
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.AlertRowsRow{}, apperr.NotFound("Not found.")
	}
	all, hubs, err := h.hubScope(ctx)
	if err != nil {
		return db.AlertRowsRow{}, err
	}
	rows, err := h.q.AlertRows(ctx, []uuid.UUID{id})
	if err != nil {
		return db.AlertRowsRow{}, err
	}
	if len(rows) == 0 || (!all && (rows[0].HubID == nil || !contains(hubs, *rows[0].HubID))) {
		return db.AlertRowsRow{}, apperr.NotFound("No Alert matches the given query.")
	}
	return rows[0], nil
}

func (h *Handler) respondAlert(w http.ResponseWriter, r *http.Request, id uuid.UUID) {
	rows, err := h.q.AlertRows(r.Context(), []uuid.UUID{id})
	if err == nil && len(rows) == 0 {
		err = apperr.NotFound("No Alert matches the given query.")
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	a := rows[0]
	respond.OK(w, AlertDetailDTO{AlertDTO: alertDTO(a), ResolveNote: a.ResolveNote,
		AcknowledgedByID: idStr(a.AcknowledgedByID), ResolvedByID: idStr(a.ResolvedByID),
		UpdatedAt: jsontime.Field(a.UpdatedAt)})
}

func (h *Handler) getAlert(w http.ResponseWriter, r *http.Request) {
	a, err := h.alert(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondAlert(w, r, a.ID)
}

type alertNoteReq struct {
	Note string `json:"note"`
	Key  string `json:"idempotency_key"`
}

func alertState(a db.OperationsAlert) events.Map {
	return events.Map{"status": a.Status, "severity": a.Severity, "is_resolved": a.IsResolved}
}

func saveAlert(ctx context.Context, q *db.Queries, a db.OperationsAlert) error {
	return q.SaveAlert(ctx, db.SaveAlertParams{ID: a.ID, Status: a.Status, Severity: a.Severity,
		IsResolved: a.IsResolved, AcknowledgedAt: a.AcknowledgedAt, AcknowledgedByID: a.AcknowledgedByID,
		ResolvedAt: a.ResolvedAt, ResolvedByID: a.ResolvedByID, ResolveNote: a.ResolveNote})
}

// transition runs one AlertService step (ack / resolve / escalate).
func (h *Handler) transition(step func(a *db.OperationsAlert, me uuid.UUID, note string) (string, bool, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		var b alertNoteReq
		err := decode.JSON(r, &b)
		var cur db.AlertRowsRow
		if err == nil {
			cur, err = h.alert(r)
		}
		if err == nil {
			me, _ := uuid.Parse(reqctx.User(ctx).UserID)
			err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
				a, err := q.AlertForUpdate(ctx, cur.ID)
				if err != nil {
					return err
				}
				before := alertState(a)
				action, changed, err := step(&a, me, b.Note)
				if err != nil || !changed {
					return err
				}
				if err := saveAlert(ctx, q, a); err != nil {
					return err
				}
				ev := events.Event{Action: action, SubjectType: "alert", SubjectID: a.ID.String(), Actor: who,
					Before: before, After: alertState(a)}
				if action != "alert.acknowledged" && a.ResolveNote != "" {
					ev.Metadata = events.Map{"note": a.ResolveNote}
				}
				return events.Emit(ctx, q, ev)
			})
		}
		if err != nil {
			respond.Error(w, r, err)
			return
		}
		h.respondAlert(w, r, cur.ID)
	}
}

func ack(a *db.OperationsAlert, me uuid.UUID, _ string) (string, bool, error) {
	if a.Status == "RESOLVED" {
		return "", false, apperr.New("CONFLICT", "Resolved alerts cannot be acknowledged.")
	}
	if a.Status == "ACKNOWLEDGED" {
		return "", false, nil
	}
	now := time.Now()
	a.Status, a.AcknowledgedAt, a.AcknowledgedByID, a.IsResolved = "ACKNOWLEDGED", &now, &me, false
	return "alert.acknowledged", true, nil
}

func resolve(a *db.OperationsAlert, me uuid.UUID, note string) (string, bool, error) {
	if a.Status == "RESOLVED" {
		return "", false, nil
	}
	now := time.Now()
	a.Status, a.IsResolved, a.ResolvedAt, a.ResolvedByID = "RESOLVED", true, &now, &me
	a.ResolveNote = strings.TrimSpace(note)
	return "alert.resolved", true, nil
}

func escalate(a *db.OperationsAlert, _ uuid.UUID, note string) (string, bool, error) {
	if a.Status == "RESOLVED" {
		return "", false, apperr.New("CONFLICT", "Resolved alerts cannot be escalated.")
	}
	a.Status, a.IsResolved, a.Severity = "ESCALATED", false, "CRITICAL"
	if note != "" {
		a.ResolveNote = strings.TrimSpace(note)
	}
	return "alert.escalated", true, nil
}
