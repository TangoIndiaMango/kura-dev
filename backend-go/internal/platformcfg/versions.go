package platformcfg

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/approval"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/router"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/throttle"
)

func (h *Handler) versions(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	status, err := listq.Choice(r, "status", "PENDING", "ACTIVE", "SUPERSEDED", "REJECTED")
	ns, key := listq.Exact(r, "namespace"), listq.Exact(r, "key")
	var total int64
	if err == nil {
		total, err = h.q.CountConfigVersions(ctx, db.CountConfigVersionsParams{Namespace: ns, Key: key, Status: status})
	}
	page, size := paginate.Page(r), paginate.Size(r)
	var idsList []uuid.UUID
	if err == nil {
		idsList, err = h.q.ConfigVersionsPage(ctx, db.ConfigVersionsPageParams{Namespace: ns, Key: key, Status: status,
			Lim: int32(size), Off: int32(paginate.Offset(page, size))})
	}
	var rows []db.ConfigVersionRowsRow
	if err == nil {
		rows, err = h.q.ConfigVersionRows(ctx, idsList)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	by := map[uuid.UUID]db.ConfigVersionRowsRow{}
	for _, v := range rows {
		by[v.ID] = v
	}
	out := make([]VersionDTO, 0, len(idsList))
	for _, id := range idsList {
		out = append(out, versionDTO(by[id]))
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

func (h *Handler) object(r *http.Request) (db.ConfigVersionRowsRow, error) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.ConfigVersionRowsRow{}, apperr.NotFound("Not found.")
	}
	return h.row(r.Context(), id)
}

func (h *Handler) version(w http.ResponseWriter, r *http.Request) {
	v, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, versionDTO(v))
}

// approve is ConfigService.approve (maker-checker; supersedes the old tip).
func (h *Handler) approve(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	v, err := h.object(r)
	if err == nil && !reqctx.User(ctx).Can(Caps[v.Namespace]) {
		err = apperr.Forbidden("")
	}
	if err == nil && v.Status != "PENDING" {
		err = apperr.Conflict("INVALID_TRANSITION", "Cannot approve config in status "+v.Status+".")
	}
	var me db.GetUserByIDRow
	if err == nil {
		uid, _ := uuid.Parse(reqctx.User(ctx).UserID)
		me, err = h.q.GetUserByID(ctx, uid)
	}
	if err == nil {
		err = approval.AssertNotSelf(me, v.CreatedByID, "Creator cannot approve their own config change.")
	}
	if err == nil {
		now := time.Now()
		err = database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
			q := db.New(tx)
			if _, err := q.ConfigForUpdate(ctx, v.ID); err != nil {
				return err
			}
			if err := q.SupersedeConfig(ctx, db.SupersedeConfigParams{Namespace: v.Namespace, Key: v.Key, ID: v.ID}); err != nil {
				return err
			}
			if err := q.ActivateConfig(ctx, db.ActivateConfigParams{ID: v.ID, ApprovedByID: &me.ID, EffectiveFrom: &now}); err != nil {
				return err
			}
			who, err := actor.FromRequest(ctx, q)
			if err != nil {
				return err
			}
			var val map[string]any
			_ = json.Unmarshal(v.Value, &val)
			var creator any
			if v.CreatedByID != nil {
				creator = v.CreatedByID.String()
			}
			return events.Emit(ctx, q, events.Event{Action: "config.approved", SubjectType: "config_version",
				SubjectID: v.ID.String(), Actor: who,
				After: events.Map{"namespace": v.Namespace, "key": v.Key, "enabled": val["enabled"],
					"effective_from": jsontime.FormatISO(now), "approved_by_id": me.ID.String(), "created_by_id": creator},
				Metadata: approval.Metadata(me, v.CreatedByID)})
		})
	}
	if err == nil {
		v, err = h.row(ctx, v.ID)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, versionDTO(v))
}

// Module mounts /api/v1/config/*.
type Module struct {
	h       *Handler
	limiter *throttle.Limiter
}

func NewModule(pool *pgxpool.Pool, limiter *throttle.Limiter) *Module {
	return &Module{h: &Handler{pool: pool, q: db.New(pool)}, limiter: limiter}
}

func (m *Module) Register(mux *http.ServeMux) {
	read := []string{"credit:approve", "offers:manage", "finance:read"}
	g := router.New(mux, "/api/v1/config", m.limiter)
	g.AnyCap("GET", "/versions/", read, m.h.versions)
	g.AnyCap("GET", "/versions/{id}/", read, m.h.version)
	g.AnyCap("POST", "/versions/{id}/approve/", []string{"credit:approve", "offers:manage"}, m.h.approve)
	g.User("GET", "/{namespace}/", m.h.snapshot)
	g.User("POST", "/{namespace}/", m.h.propose)
}
