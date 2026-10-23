// Package auditlog ports the audit app's read API: the scoped, filtered
// cursor feed of audit events, detail and stats.
package auditlog

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/router"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/throttle"
)

var lagos, _ = time.LoadLocation("Africa/Lagos")

// subjectCaps is SUBJECT_TYPE_CAPABILITY (lower-cased subject_type → cap).
var subjectCaps = map[string]string{"account": "accounts:read", "user": "users:read", "role": "roles:manage",
	"reservation": "swaps:read", "swap": "swaps:read", "wallet": "finance:read", "virtual_account": "finance:read",
	"payment": "finance:read", "psp_webhook_event": "finance:read", "pspwebhookevent": "finance:read",
	"support_case": "cases:read", "supportcase": "cases:read", "risk_event": "risk:read", "riskevent": "risk:read"}

// allowed is scope_audit_qs: SUPER_ADMIN / audit:manage see everything,
// others only subject types their capabilities map to.
func allowed(p *reqctx.Principal) (bool, []string) {
	if p.Role == "SUPER_ADMIN" || p.Can("audit:manage") {
		return true, []string{}
	}
	out := []string{}
	for subject, cap := range subjectCaps {
		if p.Can(cap) {
			out = append(out, subject)
		}
	}
	return false, out
}

// DTO is AuditEventSerializer.
type DTO struct {
	ID           string          `json:"id"`
	At           jsontime.Field  `json:"at"`
	Action       string          `json:"action"`
	ActorEmail   string          `json:"actor_email"`
	ActorName    string          `json:"actor_name"`
	ActorRole    string          `json:"actor_role"`
	SubjectType  string          `json:"subject_type"`
	SubjectID    string          `json:"subject_id"`
	SubjectLabel string          `json:"subject_label"`
	Before       json.RawMessage `json:"before"`
	After        json.RawMessage `json:"after"`
	Metadata     json.RawMessage `json:"metadata"`
	IPAddress    *string         `json:"ip_address"`
	RequestID    string          `json:"request_id"`
}

func dto(a db.AuditRowsRow) DTO {
	name := ""
	if a.ActorID != nil {
		name = strings.TrimSpace(deref(a.ActorFirst) + " " + deref(a.ActorLast))
	}
	if name == "" {
		name = a.ActorEmail
	}
	if name == "" {
		name = "system"
	}
	var ip *string
	if a.IpAddress != nil {
		s := a.IpAddress.String()
		ip = &s
	}
	return DTO{ID: a.ID.String(), At: jsontime.Field(a.CreatedAt), Action: a.Action, ActorEmail: a.ActorEmail,
		ActorName: name, ActorRole: a.ActorRole, SubjectType: a.SubjectType, SubjectID: a.SubjectID,
		SubjectLabel: a.SubjectLabel, Before: a.Before, After: a.After, Metadata: a.Metadata, IPAddress: ip,
		RequestID: a.RequestID}
}

func deref(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

type handler struct{ q *db.Queries }

func term(r *http.Request, name string) *string {
	v := strings.TrimSpace(r.URL.Query().Get(name))
	if v == "" {
		return nil
	}
	esc := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(v)
	return &esc
}

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
	all, subjects := allowed(reqctx.User(ctx))
	p := db.AuditPageParams{Unrestricted: all, Allowed: subjects, Q: term(r, "q"), Search: term(r, "search"),
		SubjectType: listq.Exact(r, "subject_type"), Actor: term(r, "actor"),
		FromAt: midnight(qp.Date("start_date")), ToAt: midnight(qp.Date("end_date"))}
	if v := r.URL.Query().Get("action"); strings.TrimSpace(v) != "" {
		p.Action = term(r, "action")
	}
	ids := []string{}
	for _, part := range strings.Split(r.URL.Query().Get("subject_id"), ",") {
		if s := strings.TrimSpace(part); s != "" {
			ids = append(ids, s)
		}
	}
	if len(ids) > 0 {
		p.SubjectIds = ids
	}
	err := qp.Err()
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
	idsOut, err := h.q.AuditPage(ctx, p)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	idsOut = paginate.Display(idsOut, size, p.Back)
	rows, err := h.q.AuditRows(ctx, idsOut)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	by := map[uuid.UUID]db.AuditRowsRow{}
	for _, a := range rows {
		by[a.ID] = a
	}
	out := make([]DTO, 0, len(idsOut))
	for _, id := range idsOut {
		out = append(out, dto(by[id]))
	}
	respond.OK(w, paginate.BuildCursorPage(r, out, size, at, func(d DTO) paginate.Key {
		return paginate.Key{CreatedAt: time.Time(d.At), ID: d.ID}
	}))
}

func (h handler) get(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, r, apperr.NotFound("Not found."))
		return
	}
	rows, err := h.q.AuditRows(ctx, []uuid.UUID{id})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	all, subjects := allowed(reqctx.User(ctx))
	if len(rows) == 0 || (!all && !contains(subjects, strings.ToLower(rows[0].SubjectType))) {
		respond.Error(w, r, apperr.NotFound("No AuditEvent matches the given query."))
		return
	}
	respond.OK(w, dto(rows[0]))
}

func contains(list []string, s string) bool {
	for _, x := range list {
		if x == s {
			return true
		}
	}
	return false
}

func (h handler) stats(w http.ResponseWriter, r *http.Request) {
	all, subjects := allowed(reqctx.User(r.Context()))
	s, err := h.q.AuditStats(r.Context(), db.AuditStatsParams{Unrestricted: all, Allowed: subjects})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, map[string]any{"totals": map[string]any{"all": s.AllRows, "last_24h": s.Last24h}})
}

// Module mounts /api/v1/audit/*.
type Module struct {
	h       handler
	limiter *throttle.Limiter
}

func NewModule(pool *pgxpool.Pool, limiter *throttle.Limiter) *Module {
	return &Module{h: handler{q: db.New(pool)}, limiter: limiter}
}

func (m *Module) Register(mux *http.ServeMux) {
	g := router.New(mux, "/api/v1/audit", m.limiter)
	g.Cap("GET", "/", "audit:read", m.h.list)
	g.Cap("GET", "/stats/", "audit:read", m.h.stats)
	g.Cap("GET", "/{id}/", "audit:read", m.h.get)
}
