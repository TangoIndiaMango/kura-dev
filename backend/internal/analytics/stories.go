package analytics

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
)

// StoryDTO is ImpactStoryListSerializer.
type StoryDTO struct {
	ID              string          `json:"id"`
	Title           string          `json:"title"`
	Region          string          `json:"region"`
	MetricHighlight string          `json:"metric_highlight"`
	Partners        string          `json:"partners"`
	Status          string          `json:"status"`
	PublishedAt     *jsontime.Field `json:"published_at"`
	CreatedAt       jsontime.Field  `json:"created_at"`
}

// StoryDetailDTO is ImpactStoryDetailSerializer.
type StoryDetailDTO struct {
	StoryDTO
	Summary     string          `json:"summary"`
	CreatedByID *string         `json:"created_by_id"`
	Raw         json.RawMessage `json:"raw"`
	UpdatedAt   jsontime.Field  `json:"updated_at"`
}

func storyDTO(s db.AnalyticsImpactstory) StoryDTO {
	return StoryDTO{ID: s.ID.String(), Title: s.Title, Region: s.Region, MetricHighlight: s.MetricHighlight,
		Partners: s.Partners, Status: s.Status, PublishedAt: jsontime.FieldPtr(s.PublishedAt),
		CreatedAt: jsontime.Field(s.CreatedAt)}
}

func storyDetail(s db.AnalyticsImpactstory) StoryDetailDTO {
	var by *string
	if s.CreatedByID != nil {
		v := s.CreatedByID.String()
		by = &v
	}
	return StoryDetailDTO{StoryDTO: storyDTO(s), Summary: s.Summary, CreatedByID: by, Raw: s.Raw,
		UpdatedAt: jsontime.Field(s.UpdatedAt)}
}

func ordering(raw string, allowed ...string) string {
	for _, t := range strings.Split(raw, ",") {
		t = strings.TrimSpace(t)
		for _, a := range allowed {
			if t == a || t == "-"+a {
				return t
			}
		}
	}
	return ""
}

func (h *handler) listStories(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p := db.StoryPageParams{Status: listq.Exact(r, "status"), Q: listq.Search(r),
		Ord: ordering(r.URL.Query().Get("ordering"), "created_at", "published_at", "status")}
	total, err := h.q.StoryCount(ctx, db.StoryCountParams{Status: p.Status, Q: p.Q})
	page, size := paginate.Page(r), paginate.Size(r)
	p.Lim, p.Off = int32(size), int32(paginate.Offset(page, size))
	var idList []uuid.UUID
	if err == nil {
		idList, err = h.q.StoryPage(ctx, p)
	}
	var rows []db.AnalyticsImpactstory
	if err == nil {
		rows, err = h.q.StoriesByIDs(ctx, idList)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	by := map[uuid.UUID]db.AnalyticsImpactstory{}
	for _, s := range rows {
		by[s.ID] = s
	}
	out := make([]StoryDTO, 0, len(idList))
	for _, id := range idList {
		out = append(out, storyDTO(by[id]))
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

func (h *handler) story(r *http.Request) (db.AnalyticsImpactstory, error) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.AnalyticsImpactstory{}, apperr.NotFound("Not found.")
	}
	rows, err := h.q.StoriesByIDs(r.Context(), []uuid.UUID{id})
	if err == nil && len(rows) == 0 {
		err = apperr.NotFound("No ImpactStory matches the given query.")
	}
	if err != nil {
		return db.AnalyticsImpactstory{}, err
	}
	return rows[0], nil
}

func (h *handler) getStory(w http.ResponseWriter, r *http.Request) {
	s, err := h.story(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, storyDetail(s))
}

func (h *handler) tx(r *http.Request, fn func(q *db.Queries, who *events.Actor) error) error {
	ctx := r.Context()
	return database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		who, err := actor.FromRequest(ctx, q)
		if err != nil {
			return err
		}
		return fn(q, who)
	})
}

// createStory is ImpactStoryService.create.
func (h *handler) createStory(w http.ResponseWriter, r *http.Request) {
	in, err := readStory(r, false)
	id := ids.New()
	if err == nil {
		err = h.tx(r, func(q *db.Queries, who *events.Actor) error {
			status := "DRAFT"
			if in.Status != nil && *in.Status != "" {
				status = *in.Status
			}
			raw := in.Raw
			if raw == nil {
				raw = map[string]any{}
			}
			rawJSON, _ := json.Marshal(raw)
			var by *uuid.UUID
			if who != nil {
				by = &who.ID
			}
			title := cut(in.Title, 160)
			if err := q.InsertStory(r.Context(), db.InsertStoryParams{ID: id, Title: title, Region: cut(in.Region, 80),
				MetricHighlight: cut(in.Metric, 120), Partners: cut(in.Partners, 200),
				Summary: strings.TrimSpace(deref(in.Summary)), Status: status, Raw: rawJSON, CreatedByID: by}); err != nil {
				return err
			}
			return events.Emit(r.Context(), q, events.Event{Action: "impact_story.created", SubjectType: "impact_story",
				SubjectID: id.String(), SubjectLabel: title, Actor: who,
				After: events.Map{"status": status, "title": title}})
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondStory(w, r, http.StatusCreated, id)
}

func (h *handler) respondStory(w http.ResponseWriter, r *http.Request, status int, id uuid.UUID) {
	rows, err := h.q.StoriesByIDs(r.Context(), []uuid.UUID{id})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.JSON(w, status, storyDetail(rows[0]))
}

func saveStory(r *http.Request, q *db.Queries, s db.AnalyticsImpactstory) error {
	return q.SaveStory(r.Context(), db.SaveStoryParams{ID: s.ID, Title: s.Title, Region: s.Region,
		MetricHighlight: s.MetricHighlight, Partners: s.Partners, Summary: s.Summary, Status: s.Status,
		PublishedAt: s.PublishedAt, Raw: s.Raw})
}

// patchStory is ImpactStoryService.update (fields as given; full save).
func (h *handler) patchStory(w http.ResponseWriter, r *http.Request) {
	in, err := readStory(r, true)
	var s db.AnalyticsImpactstory
	if err == nil {
		s, err = h.story(r)
	}
	if err == nil {
		err = h.tx(r, func(q *db.Queries, who *events.Actor) error {
			locked, err := q.StoryForUpdate(r.Context(), s.ID)
			if err != nil {
				return err
			}
			before := events.Map{"status": locked.Status, "title": locked.Title}
			for _, f := range []struct {
				dst *string
				v   *string
			}{{&locked.Title, in.Title}, {&locked.Region, in.Region}, {&locked.MetricHighlight, in.Metric},
				{&locked.Partners, in.Partners}, {&locked.Summary, in.Summary}, {&locked.Status, in.Status}} {
				if f.v != nil {
					*f.dst = *f.v
				}
			}
			if in.Raw != nil {
				locked.Raw, _ = json.Marshal(in.Raw)
			}
			if err := saveStory(r, q, locked); err != nil {
				return err
			}
			return events.Emit(r.Context(), q, events.Event{Action: "impact_story.updated", SubjectType: "impact_story",
				SubjectID: locked.ID.String(), SubjectLabel: locked.Title, Actor: who, Before: before,
				After: events.Map{"status": locked.Status, "title": locked.Title}})
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondStory(w, r, http.StatusOK, s.ID)
}

// publishStory is ImpactStoryService.publish.
func (h *handler) publishStory(w http.ResponseWriter, r *http.Request) {
	s, err := h.story(r)
	if err == nil {
		err = h.tx(r, func(q *db.Queries, who *events.Actor) error {
			locked, err := q.StoryForUpdate(r.Context(), s.ID)
			if err != nil {
				return err
			}
			before, now := locked.Status, time.Now()
			locked.Status, locked.PublishedAt = "PUBLISHED", &now
			if err := saveStory(r, q, locked); err != nil {
				return err
			}
			return events.Emit(r.Context(), q, events.Event{Action: "impact_story.published", SubjectType: "impact_story",
				SubjectID: locked.ID.String(), SubjectLabel: locked.Title, Actor: who,
				Before: events.Map{"status": before}, After: events.Map{"status": "PUBLISHED"}})
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondStory(w, r, http.StatusOK, s.ID)
}
