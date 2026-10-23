package support

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/export"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/router"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/media"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/throttle"
)

type assignReq struct {
	AssignedTo *uuid.UUID `json:"assigned_to_id"`
}

// assign: serializer, then the assignee (404), then get_object — the view's order.
func (h *Handler) assign(w http.ResponseWriter, r *http.Request) {
	keys := decode.Keys(r)
	var b assignReq
	err := decode.JSON(r, &b)
	if err == nil && !keys["assigned_to_id"] {
		err = apperr.Field("assigned_to_id", "This field is required.")
	}
	if err == nil && b.AssignedTo != nil {
		if _, uerr := h.q.ActiveUser(r.Context(), *b.AssignedTo); database.IsNoRows(uerr) {
			err = apperr.NotFound("No User matches the given query.")
		} else {
			err = uerr
		}
	}
	var c db.CaseRowsRow
	if err == nil {
		c, err = h.object(r)
	}
	if err == nil {
		err = h.assignTo(r.Context(), c.ID, b.AssignedTo)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondDetail(w, r, c.ID, http.StatusOK)
}

// assignTo is SupportCaseService.assign (OPEN → PENDING on assignment;
// unassigning writes the case event but no audit row).
func (h *Handler) assignTo(ctx context.Context, caseID uuid.UUID, assignee *uuid.UUID) error {
	if assignee != nil {
		if _, err := h.q.ActiveUser(ctx, *assignee); database.IsNoRows(err) {
			return apperr.NotFound("No User matches the given query.")
		}
	}
	uid := me(ctx)
	return h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
		c, err := q.CaseForUpdate(ctx, caseID)
		if err != nil {
			return err
		}
		status := c.Status
		if assignee != nil && status == "OPEN" {
			status = "PENDING"
		}
		if err := q.SaveCaseAssignee(ctx, db.SaveCaseAssigneeParams{ID: c.ID, AssignedToID: assignee, Status: status}); err != nil {
			return err
		}
		body := "Unassigned"
		if assignee != nil {
			u, err := q.ActiveUser(ctx, *assignee)
			if err != nil {
				return err
			}
			body = "Assigned to " + userLabel(u.Email, u.Phone, u.ID)
		}
		if err := q.InsertCaseEvent(ctx, db.InsertCaseEventParams{ID: ids.New(), Kind: "ASSIGNMENT", Body: body,
			ActorID: &uid, CaseID: c.ID}); err != nil {
			return err
		}
		if assignee == nil {
			return nil
		}
		return events.Emit(ctx, q, events.Event{Action: "support_case.assigned", SubjectType: "support_case",
			SubjectID: c.ID.String(), SubjectLabel: c.Code, Actor: who,
			Metadata: events.Map{"assignee_id": assignee.String()},
			Notify: []events.NotifySpec{{UserID: *assignee, Title: "Assigned " + c.Code, Body: c.Subject,
				Source: "Support", LinkPath: "/cases/" + c.ID.String(), TemplateCode: "support.assigned",
				DedupeKey: "support.assigned:" + c.ID.String() + ":" + assignee.String()}}})
	})
}

// bound is selectors._parse_bound (end = 23:59:59.999999 local).
func bound(raw string, end bool) *time.Time {
	d, err := time.ParseInLocation("2006-01-02", raw, lagos)
	if raw == "" || err != nil {
		return nil
	}
	if end {
		d = d.Add(24*time.Hour - time.Microsecond)
	}
	return &d
}

// stats is case_stats (network-wide, like Django).
func (h *Handler) stats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	from, to := bound(r.URL.Query().Get("start_date"), false), bound(r.URL.Query().Get("end_date"), true)
	queue, err := h.q.CaseQueueStats(ctx)
	var period db.CasePeriodStatsRow
	if err == nil {
		period, err = h.q.CasePeriodStats(ctx, db.CasePeriodStatsParams{FromAt: from, ToAt: to})
	}
	var byKind []db.CasePeriodByKindRow
	if err == nil {
		byKind, err = h.q.CasePeriodByKind(ctx, db.CasePeriodByKindParams{FromAt: from, ToAt: to})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	kinds := make([]map[string]any, len(byKind))
	for i, x := range byKind {
		kinds[i] = map[string]any{"kind": x.Kind, "count": x.Count}
	}
	respond.OK(w, map[string]any{
		"queue": map[string]any{"open": queue.Open, "pending": queue.Pending, "unassigned": queue.Unassigned,
			"high_priority": queue.HighPriority, "sla_at_risk": queue.SlaAtRisk, "sla_breached": queue.SlaBreached,
			"disputes": queue.Disputes},
		"period": map[string]any{"opened": period.Opened, "resolved": period.Resolved, "by_kind": kinds},
		"totals": map[string]any{"all": period.Opened, "active": queue.Active, "closed": queue.Closed},
	})
}

func isoOrEmpty(t *time.Time) string {
	if t == nil {
		return ""
	}
	return jsontime.FormatISO(*t)
}

func (h *Handler) export(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p, err := h.filter(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	p.Lim = export.RowCap + 1
	ids, err := h.q.CasesPage(ctx, p)
	var rows []db.CaseRowsRow
	if err == nil {
		rows, err = h.rows(ctx, ids)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	t := export.Table{Stem: "support-cases", Title: "Kura support cases", Headers: []string{"id", "code", "subject",
		"kind", "account_kura_id", "operator", "assignee", "priority", "status", "sla_due_at", "created_at"}}
	for _, c := range rows {
		t.Rows = append(t.Rows, []string{c.ID.String(), c.Code, c.Subject, c.Kind, c.AccountKuraID,
			c.AccountDisplayName, deref(personName(c.AssignedToID, c.AssigneeFirst, c.AssigneeLast, c.AssigneeEmail,
				c.AssigneePhone)), c.Priority, c.Status, isoOrEmpty(c.SlaDueAt), jsontime.FormatISO(c.CreatedAt)})
	}
	if err := export.Write(w, r.URL.Query().Get("export"), t); err != nil {
		respond.Error(w, r, err)
	}
}

// Module mounts /api/v1/support/*.
type Module struct {
	h       *Handler
	limiter *throttle.Limiter
}

func NewModule(pool *pgxpool.Pool, cdn media.Cloudinary, limiter *throttle.Limiter) *Module {
	return &Module{h: NewHandler(pool, cdn), limiter: limiter}
}

func (m *Module) Register(mux *http.ServeMux) {
	read, write := []string{"cases:read", "cases:write_own"}, []string{"cases:manage", "cases:write_own"}
	g := router.New(mux, "/api/v1/support/cases", m.limiter)
	g.AnyCap("GET", "/", read, m.h.list)
	g.AnyCap("POST", "/", write, m.h.create)
	g.Cap("GET", "/export/", "cases:read", m.h.export)
	g.Cap("GET", "/stats/", "cases:read", m.h.stats)
	g.AnyCap("GET", "/{id}/", read, m.h.get)
	g.Cap("POST", "/{id}/assign/", "cases:manage", m.h.assign)
	g.AnyCap("POST", "/{id}/notes/", write, m.h.addNote)
	g.Cap("POST", "/{id}/status/", "cases:manage", m.h.setStatus)
}
