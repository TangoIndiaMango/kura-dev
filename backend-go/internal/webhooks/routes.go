package webhooks

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/router"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/integrations/psp"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/throttle"
)

// EventDTO is PspWebhookEventSerializer.
type EventDTO struct {
	ID         string         `json:"id"`
	PSP        string         `json:"psp"`
	PSPEventID string         `json:"psp_event_id"`
	EventKind  string         `json:"event_kind"`
	Status     string         `json:"status"`
	Error      string         `json:"error"`
	CreatedAt  jsontime.Field `json:"created_at"`
}

func eventDTO(e db.IntegrationsPspwebhookevent) EventDTO {
	return EventDTO{ID: e.ID.String(), PSP: e.Psp, PSPEventID: e.PspEventID, EventKind: e.EventKind, Status: e.Status,
		Error: e.Error, CreatedAt: jsontime.Field(e.CreatedAt)}
}

func (h *Handler) events(w http.ResponseWriter, r *http.Request) {
	pspF, e1 := listq.Choice(r, "psp", "PAYSTACK", "NOMBA")
	status, e2 := listq.Choice(r, "status", "RECEIVED", "PROCESSED", "IGNORED", "FAILED")
	at, e3 := paginate.Cursor(r)
	if err := listq.Merge(e1, e2); err != nil || e3 != nil {
		if err == nil {
			err = e3
		}
		respond.Error(w, r, err)
		return
	}
	size := paginate.Size(r)
	p := db.PspEventsPageParams{Psp: pspF, Status: status, EventKind: listq.Exact(r, "event_kind"), Lim: int32(size + 1)}
	if at != nil {
		p.AfterAt, p.Back = &at.CreatedAt, at.Back
		p.AfterID, _ = uuid.Parse(at.ID)
	}
	rows, err := h.q.PspEventsPage(r.Context(), p)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows = paginate.Display(rows, size, p.Back)
	out := make([]EventDTO, len(rows))
	for i, e := range rows {
		out[i] = eventDTO(e)
	}
	respond.OK(w, paginate.BuildCursorPage(r, out, size, at, func(d EventDTO) paginate.Key {
		return paginate.Key{CreatedAt: time.Time(d.CreatedAt), ID: d.ID}
	}))
}

func (h *Handler) event(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, r, apperr.NotFound("Not found."))
		return
	}
	e, err := h.q.PspEventByID(r.Context(), id)
	if database.IsNoRows(err) {
		err = apperr.NotFound("No PspWebhookEvent matches the given query.")
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, eventDTO(e))
}

// Module mounts /api/v1/webhooks/*.
type Module struct {
	h       *Handler
	limiter *throttle.Limiter
}

func NewModule(pool *pgxpool.Pool, settings psp.Settings, nombaWebhook string, log *slog.Logger,
	limiter *throttle.Limiter) *Module {
	return &Module{h: &Handler{pool: pool, q: db.New(pool), settings: settings, nombaWebhook: nombaWebhook, log: log},
		limiter: limiter}
}

func (m *Module) Register(mux *http.ServeMux) {
	g := router.New(mux, "/api/v1/webhooks", m.limiter)
	g.Public("POST", "/paystack", m.h.receive("PAYSTACK"))
	g.Public("POST", "/nomba", m.h.receive("NOMBA"))
	g.Cap("GET", "/events/", "finance:read", m.h.events)
	g.Cap("GET", "/events/{id}/", "finance:read", m.h.event)
}
