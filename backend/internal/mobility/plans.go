package mobility

import (
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
)

// PlanDTO is PlanSerializer.
type PlanDTO struct {
	ID                    string         `json:"id"`
	Code                  string         `json:"code"`
	Name                  string         `json:"name"`
	VehicleType           string         `json:"vehicle_type"`
	Period                string         `json:"period"`
	DurationDays          *int32         `json:"duration_days"`
	SwapAllowance         *int32         `json:"swap_allowance"`
	PriceKobo             int64          `json:"price_kobo"`
	Description           string         `json:"description"`
	AutoRenewDefault      bool           `json:"auto_renew_default"`
	Status                string         `json:"status"`
	IsActive              bool           `json:"is_active"`
	CreatedAt             jsontime.Field `json:"created_at"`
	ActiveSubscriberCount int32          `json:"active_subscriber_count"`
}

func planDTO(p db.PlanWithCountRow) PlanDTO {
	return PlanDTO{ID: p.ID.String(), Code: p.Code, Name: p.Name, VehicleType: p.VehicleType, Period: p.Period,
		DurationDays: p.DurationDays, SwapAllowance: p.SwapAllowance, PriceKobo: p.PriceKobo,
		Description: p.Description, AutoRenewDefault: p.AutoRenewDefault, Status: p.Status, IsActive: p.IsActive,
		CreatedAt: jsontime.Field(p.CreatedAt), ActiveSubscriberCount: p.ActiveSubscriberCount}
}

// PlanHandler serves /api/v1/mobility/plans (PlanViewSet).
type PlanHandler struct {
	pool *pgxpool.Pool
	q    *db.Queries
}

func NewPlanHandler(pool *pgxpool.Pool) *PlanHandler {
	return &PlanHandler{pool: pool, q: db.New(pool)}
}

func planOrdering(raw string) string {
	for _, t := range strings.Split(raw, ",") {
		switch t = strings.TrimSpace(t); strings.TrimPrefix(t, "-") {
		case "price_kobo", "vehicle_type", "name", "created_at":
			return t
		}
	}
	return ""
}

// nullBool is django-filter's BooleanFilter (NullBooleanSelect): only these
// spellings filter; anything else is ignored.
func nullBool(raw string) *bool {
	switch raw {
	case "true", "True", "2":
		b := true
		return &b
	case "false", "False", "3":
		b := false
		return &b
	}
	return nil
}

func (h *PlanHandler) list(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	qv := r.URL.Query()
	status, err := listq.Choice(r, "status", "ACTIVE", "DEACTIVATED", "PENDING")
	var period *string
	if err == nil {
		period, err = listq.Choice(r, "period", "day", "week", "month", "swap")
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	// get_queryset: no is_active → active only; "", all, * → everything.
	var active *bool
	if !qv.Has("is_active") {
		t := true
		active = &t
	} else if raw := strings.ToLower(qv.Get("is_active")); raw != "" && raw != "all" && raw != "*" {
		v := raw == "1" || raw == "true" || raw == "yes"
		active = &v
	}
	active2 := nullBool(qv.Get("is_active"))
	vt := listq.Exact(r, "vehicle_type")
	total, err := h.q.CountPlans(ctx, db.CountPlansParams{Active: active, Active2: active2, VehicleType: vt,
		Status: status, Period: period})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	page, size := paginate.Page(r), paginate.Size(r)
	rows, err := h.q.ListPlans(ctx, db.ListPlansParams{Active: active, Active2: active2, VehicleType: vt, Status: status,
		Period: period, Ord: planOrdering(qv.Get("ordering")), Lim: int32(size), Off: int32(paginate.Offset(page, size))})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]PlanDTO, len(rows))
	for i, p := range rows {
		out[i] = planDTO(db.PlanWithCountRow(p))
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

// object is get_object on the unfiltered catalogue (detail routes).
func (h *PlanHandler) object(r *http.Request) (db.PlanWithCountRow, error) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.PlanWithCountRow{}, apperr.NotFound("Not found.")
	}
	p, err := h.q.PlanWithCount(r.Context(), id)
	if database.IsNoRows(err) {
		return p, apperr.NotFound("No Plan matches the given query.")
	}
	return p, err
}

func (h *PlanHandler) respondPlan(w http.ResponseWriter, r *http.Request, id uuid.UUID, status int) {
	p, err := h.q.PlanWithCount(r.Context(), id)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.JSON(w, status, planDTO(p))
}

func (h *PlanHandler) get(w http.ResponseWriter, r *http.Request) {
	p, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, planDTO(p))
}
