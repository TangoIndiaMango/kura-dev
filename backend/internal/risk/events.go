package risk

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
)

var lagos, _ = time.LoadLocation("Africa/Lagos")

// EventDTO is RiskEventListSerializer.
type EventDTO struct {
	ID                 string         `json:"id"`
	AccountID          *string        `json:"account_id"`
	AccountKuraID      *string        `json:"account_kura_id"`
	AccountDisplayName *string        `json:"account_display_name"`
	RuleCode           string         `json:"rule_code"`
	RuleName           string         `json:"rule_name"`
	SubjectType        string         `json:"subject_type"`
	SubjectID          string         `json:"subject_id"`
	Severity           string         `json:"severity"`
	Score              int32          `json:"score"`
	ActionTaken        string         `json:"action_taken"`
	Status             string         `json:"status"`
	CreatedAt          jsontime.Field `json:"created_at"`
}

// EventDetailDTO is RiskEventDetailSerializer.
type EventDetailDTO struct {
	EventDTO
	Context             json.RawMessage `json:"context"`
	ReviewNote          string          `json:"review_note"`
	ReviewedByID        *string         `json:"reviewed_by_id"`
	ActiveVelocityGrant any             `json:"active_velocity_grant"`
	UpdatedAt           jsontime.Field  `json:"updated_at"`
}

func idStr(p *uuid.UUID) *string {
	if p == nil {
		return nil
	}
	s := p.String()
	return &s
}

func eventDTO(e db.RiskEventRowsRow) EventDTO {
	return EventDTO{ID: e.ID.String(), AccountID: idStr(e.AccountID), AccountKuraID: e.AccountKuraID,
		AccountDisplayName: e.AccountDisplayName, RuleCode: e.RuleCode, RuleName: e.RuleName,
		SubjectType: e.SubjectType, SubjectID: e.SubjectID, Severity: e.Severity, Score: e.Score,
		ActionTaken: e.ActionTaken, Status: e.Status, CreatedAt: jsontime.Field(e.CreatedAt)}
}

func (h *Handler) detail(ctx context.Context, e db.RiskEventRowsRow) (EventDetailDTO, error) {
	out := EventDetailDTO{EventDTO: eventDTO(e), Context: e.Context, ReviewNote: e.ReviewNote,
		ReviewedByID: idStr(e.ReviewedByID), UpdatedAt: jsontime.Field(e.UpdatedAt)}
	g, err := h.q.ActiveGrantForEvent(ctx, e.ID)
	if err == nil {
		out.ActiveVelocityGrant = map[string]any{"id": g.ID.String(), "expires_at": jsontime.FormatISO(g.ExpiresAt),
			"uses_remaining": g.UsesRemaining, "max_uses": g.MaxUses, "status": g.Status}
	} else if !isNoRows(err) {
		return out, err
	}
	return out, nil
}

// eventFilter is RiskEventFilter + the ?q= search.
func eventFilter(r *http.Request) (db.RiskEventsPageParams, error) {
	qp := decode.Params(r)
	p := db.RiskEventsPageParams{Account: qp.UUID("account"), Status: listq.Exact(r, "status"),
		Severity: listq.Exact(r, "severity"), Rule: listq.Exact(r, "rule"),
		SubjectType: listq.Exact(r, "subject_type"), SubjectID: listq.Exact(r, "subject_id"), Q: listq.Search(r)}
	if d := qp.Date("start_date"); d != nil {
		t := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, lagos)
		p.FromAt = &t
	}
	if d := qp.Date("end_date"); d != nil {
		t := time.Date(d.Year(), d.Month(), d.Day()+1, 0, 0, 0, 0, lagos)
		p.ToAt = &t
	}
	return p, qp.Err()
}

func (h *Handler) rows(ctx context.Context, ids []uuid.UUID) ([]db.RiskEventRowsRow, error) {
	rows, err := h.q.RiskEventRows(ctx, ids)
	if err != nil {
		return nil, err
	}
	by := map[uuid.UUID]db.RiskEventRowsRow{}
	for _, e := range rows {
		by[e.ID] = e
	}
	out := make([]db.RiskEventRowsRow, 0, len(ids))
	for _, id := range ids {
		if e, ok := by[id]; ok {
			out = append(out, e)
		}
	}
	return out, nil
}

func (h *Handler) events(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p, err := eventFilter(r)
	var at *paginate.Key
	if err == nil {
		err = EnsureRules(ctx, h.q)
	}
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
	ids, err := h.q.RiskEventsPage(ctx, p)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	ids = paginate.Display(ids, size, p.Back)
	rows, err := h.rows(ctx, ids)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]EventDTO, len(rows))
	for i, e := range rows {
		out[i] = eventDTO(e)
	}
	respond.OK(w, paginate.BuildCursorPage(r, out, size, at, func(e EventDTO) paginate.Key {
		return paginate.Key{CreatedAt: time.Time(e.CreatedAt), ID: e.ID}
	}))
}

func (h *Handler) event(r *http.Request) (db.RiskEventRowsRow, error) {
	if err := EnsureRules(r.Context(), h.q); err != nil {
		return db.RiskEventRowsRow{}, err
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.RiskEventRowsRow{}, apperr.NotFound("No RiskEvent matches the given query.")
	}
	rows, err := h.q.RiskEventRows(r.Context(), []uuid.UUID{id})
	if err == nil && len(rows) == 0 {
		err = apperr.NotFound("No RiskEvent matches the given query.")
	}
	if err != nil {
		return db.RiskEventRowsRow{}, err
	}
	return rows[0], nil
}

func (h *Handler) respondEvent(w http.ResponseWriter, r *http.Request, id uuid.UUID, status int) {
	rows, err := h.q.RiskEventRows(r.Context(), []uuid.UUID{id})
	if err == nil && len(rows) == 0 {
		err = apperr.NotFound("No RiskEvent matches the given query.")
	}
	var out EventDetailDTO
	if err == nil {
		out, err = h.detail(r.Context(), rows[0])
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.JSON(w, status, out)
}

func (h *Handler) getEvent(w http.ResponseWriter, r *http.Request) {
	e, err := h.event(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondEvent(w, r, e.ID, http.StatusOK)
}

// flagReq is FlagRiskEventSerializer.
type flagReq struct {
	AccountID uuid.UUID `json:"account_id" validate:"required"`
	RuleCode  *string   `json:"rule_code" validate:"omitempty,notblank"`
	Severity  *string   `json:"severity" validate:"omitempty,oneof=LOW MEDIUM HIGH CRITICAL"`
	Note      string    `json:"note"`
}

// create is a manual ops flag on an account (MANUAL_FLAG by default).
func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b flagReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	if _, err := h.q.AccountByID(ctx, b.AccountID); isNoRows(err) {
		respond.Error(w, r, apperr.NotFound("No Account matches the given query."))
		return
	} else if err != nil {
		respond.Error(w, r, err)
		return
	}
	code := "MANUAL_FLAG"
	if b.RuleCode != nil {
		code = strings.TrimSpace(*b.RuleCode)
	}
	sev := ""
	if b.Severity != nil {
		sev = *b.Severity
	}
	user := me(ctx)
	context := map[string]any{"flagged_by": user}
	if note := strings.TrimSpace(b.Note); note != "" {
		context = map[string]any{"note": note, "flagged_by": user}
	}
	var id uuid.UUID
	err := h.tx(ctx, func(q *db.Queries) error {
		var err error
		id, err = Emit(ctx, q, Event{RuleCode: code, SubjectType: "account", SubjectID: b.AccountID.String(),
			AccountID: &b.AccountID, Severity: sev, Context: context})
		return err
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondEvent(w, r, id, http.StatusCreated)
}
