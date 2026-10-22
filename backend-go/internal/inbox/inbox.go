// Package inbox ports the notifications app's API: the signed-in user's
// IN_APP inbox (list, detail, stats, mark read / all read).
package inbox

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/router"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/throttle"
)

var lagos, _ = time.LoadLocation("Africa/Lagos")

// DTO is NotificationSerializer.
type DTO struct {
	ID           string          `json:"id"`
	At           jsontime.Field  `json:"at"`
	Title        string          `json:"title"`
	Body         string          `json:"body"`
	Source       string          `json:"source"`
	Severity     string          `json:"severity"`
	Channel      string          `json:"channel"`
	Status       string          `json:"status"`
	LinkPath     string          `json:"link_path"`
	Params       json.RawMessage `json:"params"`
	ReadAt       *jsontime.Field `json:"read_at"`
	IsRead       bool            `json:"is_read"`
	TemplateCode string          `json:"template_code"`
}

func dto(n db.NotificationsNotification) DTO {
	return DTO{ID: n.ID.String(), At: jsontime.Field(n.CreatedAt), Title: n.Title, Body: n.Body, Source: n.Source,
		Severity: n.Severity, Channel: n.Channel, Status: n.Status, LinkPath: n.LinkPath, Params: n.Params,
		ReadAt: jsontime.FieldPtr(n.ReadAt), IsRead: n.ReadAt != nil, TemplateCode: n.TemplateCode}
}

type handler struct{ q *db.Queries }

func me(r *http.Request) uuid.UUID {
	id, _ := uuid.Parse(reqctx.User(r.Context()).UserID)
	return id
}

// term is NotificationFilter.filter_search's value (stripped, escaped).
func term(r *http.Request, name string) *string {
	v := strings.TrimSpace(r.URL.Query().Get(name))
	if v == "" {
		return nil
	}
	esc := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(v)
	return &esc
}

// midnight is a DateFilter on a datetime: the day's local midnight.
func midnight(d *time.Time) *time.Time {
	if d == nil {
		return nil
	}
	t := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, lagos)
	return &t
}

func (h handler) list(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	qp := decode.Params(r)
	channel, cerr := listq.Choice(r, "channel", "IN_APP", "EMAIL", "SMS", "PUSH")
	p := db.InboxPageParams{UserID: me(r), Q: term(r, "q"), Search: term(r, "search"), Source: listq.Exact(r, "source"),
		Severity: listq.Exact(r, "severity"), Channel: channel, Unread: listq.NullBool(r, "unread"),
		FromAt: midnight(qp.Date("start_date")), ToAt: midnight(qp.Date("end_date"))}
	err := listq.Merge(cerr, qp.Err())
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
	rows, err := h.q.InboxPage(ctx, p)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows = paginate.Display(rows, size, p.Back)
	out := make([]DTO, len(rows))
	for i, n := range rows {
		out[i] = dto(n)
	}
	respond.OK(w, paginate.BuildCursorPage(r, out, size, at, func(d DTO) paginate.Key {
		return paginate.Key{CreatedAt: time.Time(d.At), ID: d.ID}
	}))
}

func (h handler) item(r *http.Request) (db.NotificationsNotification, error) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.NotificationsNotification{}, apperr.NotFound("Not found.")
	}
	n, err := h.q.InboxItem(r.Context(), db.InboxItemParams{ID: id, UserID: me(r)})
	if database.IsNoRows(err) {
		return n, apperr.NotFound("No Notification matches the given query.")
	}
	return n, err
}

func (h handler) get(w http.ResponseWriter, r *http.Request) {
	n, err := h.item(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, dto(n))
}

func (h handler) stats(w http.ResponseWriter, r *http.Request) {
	s, err := h.q.InboxStats(r.Context(), me(r))
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, map[string]any{"totals": map[string]any{"all": s.AllRows, "unread": s.Unread, "last_7d": s.Last7d}})
}

func (h handler) read(w http.ResponseWriter, r *http.Request) {
	n, err := h.item(r)
	if err == nil {
		err = h.q.MarkNotificationRead(r.Context(), n.ID)
	}
	if err == nil {
		n, err = h.item(r)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, dto(n))
}

// readAll is mark_all_read (every channel, like Django).
func (h handler) readAll(w http.ResponseWriter, r *http.Request) {
	n, err := h.q.MarkAllRead(r.Context(), me(r))
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, map[string]any{"updated": n})
}

// Module mounts /api/v1/notifications/*.
type Module struct {
	h       handler
	limiter *throttle.Limiter
}

func NewModule(pool *pgxpool.Pool, limiter *throttle.Limiter) *Module {
	return &Module{h: handler{q: db.New(pool)}, limiter: limiter}
}

func (m *Module) Register(mux *http.ServeMux) {
	g := router.New(mux, "/api/v1/notifications", m.limiter)
	g.User("GET", "/", m.h.list)
	g.User("POST", "/read-all/", m.h.readAll)
	g.User("GET", "/stats/", m.h.stats)
	g.User("GET", "/{id}/", m.h.get)
	g.User("POST", "/{id}/read/", m.h.read)
}
