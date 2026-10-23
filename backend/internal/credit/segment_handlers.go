package credit

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
)

func segmentList(s db.CreditSegment) map[string]any {
	return map[string]any{"id": s.ID.String(), "name": s.Name, "status": s.Status,
		"criteria_summary": Summary(ParseCriteria(s.Criteria)), "last_count": s.LastCount,
		"updated_at": jsontime.Field(s.UpdatedAt), "created_at": jsontime.Field(s.CreatedAt)}
}

func segmentDetail(s db.CreditSegment) map[string]any {
	m := segmentList(s)
	m["criteria"] = json.RawMessage(s.Criteria)
	m["last_evaluated_at"] = jsontime.FieldPtr(s.LastEvaluatedAt)
	return m
}

func memberRow(a db.SegmentAccountsRow) map[string]any {
	return map[string]any{"id": a.ID.String(), "kura_id": a.KuraID, "display_name": a.DisplayName,
		"phone": a.OwnerPhone, "status": a.Status, "kyc_status": a.KycStatus}
}

func (h *Handler) segments(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var status, search *string
	if v := r.URL.Query().Get("status"); v != "" && v != "all" {
		status = &v
	}
	if v := r.URL.Query().Get("search"); v != "" {
		esc := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(v)
		search = &esc
	}
	q := listq.Search(r)
	total, err := h.q.CountSegments(ctx, db.CountSegmentsParams{Status: status, Search: search, Q: q})
	page, size := paginate.Page(r), paginate.Size(r)
	var rows []db.CreditSegment
	if err == nil {
		rows, err = h.q.SegmentsPage(ctx, db.SegmentsPageParams{Status: status, Search: search, Q: q, Lim: int32(size),
			Off: int32(paginate.Offset(page, size))})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]map[string]any, len(rows))
	for i, s := range rows {
		out[i] = segmentList(s)
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

func (h *Handler) segment(r *http.Request) (db.CreditSegment, error) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.CreditSegment{}, apperr.NotFound("Not found.")
	}
	s, err := h.q.SegmentByID(r.Context(), id)
	if database.IsNoRows(err) {
		return s, apperr.NotFound("No Segment matches the given query.")
	}
	return s, err
}

func (h *Handler) getSegment(w http.ResponseWriter, r *http.Request) {
	s, err := h.segment(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, segmentDetail(s))
}

// count is preview_segment's count.
func count(ctx context.Context, q *db.Queries, c Criteria) (int64, error) {
	p, err := MatchParams(ctx, q, c)
	if err != nil {
		return 0, err
	}
	return q.CountSegmentAccounts(ctx, db.CountSegmentAccountsParams{Status: p.Status, KycStatus: p.KycStatus,
		Kind: p.Kind, Cooperative: p.Cooperative, CreatedOnOrBefore: p.CreatedOnOrBefore,
		CreatedOnOrAfter: p.CreatedOnOrAfter, MinScore: p.MinScore})
}

// persistable is _persistable_criteria: allowed keys only, then validated.
func persistable(c Criteria) (Criteria, error) {
	out := Criteria{}
	for _, k := range allowedKeys {
		if v, ok := c[k]; ok {
			out[k] = v
		}
	}
	return ValidateCriteria(out)
}

type segmentReq struct {
	Name     *string         `json:"name" validate:"omitempty,notblank,max=120"`
	Criteria json.RawMessage `json:"criteria"`
	Status   *string         `json:"status" validate:"omitempty,oneof=DRAFT ACTIVE"`
}

func (b *segmentReq) validate(r *http.Request, create bool) ([]byte, error) {
	keys := decode.Keys(r)
	err := decode.JSON(r, b)
	d := map[string]any{}
	if e, ok := apperr.As(err); ok && e.Code == "VALIDATION_ERROR" {
		for k, v := range e.Details {
			d[k] = v
		}
		err = nil
	}
	if err != nil {
		return nil, err
	}
	for k, isNil := range map[string]bool{"name": b.Name == nil, "status": b.Status == nil} {
		if keys[k] && isNil && d[k] == nil {
			d[k] = []string{"This field may not be null."}
		}
	}
	if create && !keys["name"] {
		d["name"] = []string{"This field is required."}
	}
	crit := dictField(d, "criteria", b.Criteria, keys["criteria"], create)
	if len(d) > 0 {
		return nil, apperr.Validation(apperr.Details(d))
	}
	return crit, nil
}

func (h *Handler) saveSegment(ctx context.Context, s db.CreditSegment, before events.Map, action string) error {
	return h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
		var err error
		if action == "segment.created" {
			err = q.InsertSegment(ctx, db.InsertSegmentParams{ID: s.ID, Name: s.Name, Criteria: s.Criteria,
				Status: s.Status, LastCount: s.LastCount})
		} else {
			err = q.SaveSegment(ctx, db.SaveSegmentParams{ID: s.ID, Name: s.Name, Criteria: s.Criteria, Status: s.Status,
				LastCount: s.LastCount, LastEvaluatedAt: s.LastEvaluatedAt})
		}
		if err != nil {
			return err
		}
		after := events.Map{"name": s.Name, "status": s.Status, "summary": Summary(ParseCriteria(s.Criteria)),
			"last_count": s.LastCount}
		if action == "segment.refreshed" {
			after = events.Map{"last_count": s.LastCount}
		}
		return events.Emit(ctx, q, events.Event{Action: action, SubjectType: "segment", SubjectID: s.ID.String(),
			Actor: who, Before: before, After: after})
	})
}

func (h *Handler) respondSegment(w http.ResponseWriter, r *http.Request, id uuid.UUID, status int, err error) {
	var s db.CreditSegment
	if err == nil {
		s, err = h.q.SegmentByID(r.Context(), id)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.JSON(w, status, segmentDetail(s))
}

func (h *Handler) createSegment(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b segmentReq
	raw, err := b.validate(r, true)
	var c Criteria
	if err == nil {
		c, err = persistable(ParseCriteria(raw))
	}
	var n int64
	if err == nil {
		n, err = count(ctx, h.q, c)
	}
	s := db.CreditSegment{ID: ids.New(), Status: "DRAFT"}
	if err == nil {
		s.Name, s.LastCount = strings.TrimSpace(*b.Name), int32(n)
		s.Criteria, _ = json.Marshal(c)
		if b.Status != nil {
			s.Status = *b.Status
		}
		err = h.saveSegment(ctx, s, nil, "segment.created")
	}
	h.respondSegment(w, r, s.ID, http.StatusCreated, err)
}

func (h *Handler) patchSegment(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	s, err := h.segment(r)
	var b segmentReq
	var raw []byte
	if err == nil {
		raw, err = b.validate(r, false)
	}
	if err == nil {
		before := events.Map{"name": s.Name, "status": s.Status, "last_count": s.LastCount}
		if b.Name != nil {
			s.Name = strings.TrimSpace(*b.Name)
		}
		if raw != nil {
			var c Criteria
			var n int64
			if c, err = persistable(ParseCriteria(raw)); err == nil {
				n, err = count(ctx, h.q, c)
			}
			if err == nil {
				now := time.Now()
				s.Criteria, _ = json.Marshal(c)
				s.LastCount, s.LastEvaluatedAt = int32(n), &now
			}
		}
		if err == nil && b.Status != nil {
			s.Status = *b.Status
		}
		if err == nil {
			err = h.saveSegment(ctx, s, before, "segment.updated")
		}
	}
	h.respondSegment(w, r, s.ID, http.StatusOK, err)
}

func (h *Handler) refresh(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	s, err := h.segment(r)
	var n int64
	if err == nil {
		n, err = count(ctx, h.q, ParseCriteria(s.Criteria))
	}
	if err == nil {
		before := events.Map{"last_count": s.LastCount}
		now := time.Now()
		s.LastCount, s.LastEvaluatedAt = int32(n), &now
		err = h.saveSegment(ctx, s, before, "segment.refreshed")
	}
	h.respondSegment(w, r, s.ID, http.StatusOK, err)
}
