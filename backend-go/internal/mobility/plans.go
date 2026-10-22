package mobility

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
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

// planWriteReq is PlanWriteSerializer.
type planWriteReq struct {
	Code        *string `json:"code" validate:"omitempty,notblank,max=50"`
	Name        *string `json:"name" validate:"omitempty,notblank,max=100"`
	VehicleType *string `json:"vehicle_type" validate:"omitempty,notblank,max=50"`
	Period      *string `json:"period" validate:"omitempty,oneof=day week month swap"`
	Duration    *int64  `json:"duration_days" validate:"omitempty,min=1"`
	Allowance   *int64  `json:"swap_allowance" validate:"omitempty,min=1"`
	Price       *int64  `json:"price_kobo" validate:"omitempty,min=0"`
	Description *string `json:"description"`
	AutoRenew   *bool   `json:"auto_renew_default"`
}

// create is PlanCatalogueService.create. The view checks code, vehicle_type,
// period and price one at a time after the serializer.
func (h *PlanHandler) create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b planWriteReq
	err := decode.JSON(r, &b)
	if err == nil && b.Name == nil {
		err = apperr.Field("name", "This field is required.")
	}
	for _, c := range []struct {
		name    string
		missing bool
	}{{"code", b.Code == nil}, {"vehicle_type", b.VehicleType == nil}, {"period", b.Period == nil},
		{"price_kobo", b.Price == nil}} {
		if err == nil && c.missing { // raised in the view, so DRF keeps the bare string
			err = apperr.Validation(apperr.Details{c.name: "This field is required."})
		}
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	code := strings.ToUpper(strings.TrimSpace(*b.Code))
	id := ids.New()
	err = h.write(ctx, func(q *db.Queries, who *events.Actor) error {
		if _, err := q.PlanByCode(ctx, code); err == nil {
			return apperr.Conflict("CONFLICT", fmt.Sprintf("Plan code %s already exists.", code))
		} else if !database.IsNoRows(err) {
			return err
		}
		desc, auto := "", false
		if b.Description != nil {
			desc = *b.Description
		}
		if b.AutoRenew != nil {
			auto = *b.AutoRenew
		}
		vt := normalizeVehicleType(*b.VehicleType)
		if err := q.InsertPlan(ctx, db.InsertPlanParams{ID: id, Code: code, Name: strings.TrimSpace(*b.Name),
			VehicleType: vt, Period: *b.Period, DurationDays: i32(b.Duration), SwapAllowance: i32(b.Allowance),
			PriceKobo: *b.Price, Description: desc, AutoRenewDefault: auto}); err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "plan.created", SubjectType: "plan", SubjectID: id.String(),
			SubjectLabel: code, Actor: who, After: events.Map{"code": code, "vehicle_type": vt, "period": *b.Period,
				"price_kobo": *b.Price, "status": "ACTIVE"}})
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondPlan(w, r, id, http.StatusCreated)
}

func (h *PlanHandler) write(ctx context.Context, fn func(q *db.Queries, who *events.Actor) error) error {
	return (&PricingHandler{pool: h.pool, q: h.q}).tx(ctx, fn)
}

func planSnap(p db.PlanWithCountRow) events.Map {
	return events.Map{"name": p.Name, "description": p.Description, "duration_days": p.DurationDays,
		"swap_allowance": p.SwapAllowance, "price_kobo": p.PriceKobo, "auto_renew_default": p.AutoRenewDefault}
}

func savePlan(ctx context.Context, q *db.Queries, p db.PlanWithCountRow) error {
	return q.SavePlan(ctx, db.SavePlanParams{ID: p.ID, Name: p.Name, Description: p.Description,
		DurationDays: p.DurationDays, SwapAllowance: p.SwapAllowance, PriceKobo: p.PriceKobo,
		AutoRenewDefault: p.AutoRenewDefault, Status: p.Status, IsActive: p.IsActive})
}

// patch is PlanCatalogueService.update (only changed fields; no-op = no event).
func (h *PlanHandler) patch(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	var b planWriteReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	before, dirty := planSnap(p), false
	if b.Name != nil && strings.TrimSpace(*b.Name) != p.Name {
		p.Name, dirty = strings.TrimSpace(*b.Name), true
	}
	if b.Description != nil && *b.Description != p.Description {
		p.Description, dirty = *b.Description, true
	}
	if v := i32(b.Duration); v != nil && !eqI32(v, p.DurationDays) {
		p.DurationDays, dirty = v, true
	}
	if v := i32(b.Allowance); v != nil && !eqI32(v, p.SwapAllowance) {
		p.SwapAllowance, dirty = v, true
	}
	if b.Price != nil && *b.Price != p.PriceKobo {
		p.PriceKobo, dirty = *b.Price, true
	}
	if b.AutoRenew != nil && *b.AutoRenew != p.AutoRenewDefault {
		p.AutoRenewDefault, dirty = *b.AutoRenew, true
	}
	if dirty {
		err = h.write(ctx, func(q *db.Queries, who *events.Actor) error {
			if err := savePlan(ctx, q, p); err != nil {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "plan.updated", SubjectType: "plan",
				SubjectID: p.ID.String(), SubjectLabel: p.Code, Actor: who, Before: before, After: planSnap(p)})
		})
		if err != nil {
			respond.Error(w, r, err)
			return
		}
	}
	h.respondPlan(w, r, p.ID, http.StatusOK)
}

// setActive is PlanCatalogueService.activate / deactivate.
func (h *PlanHandler) setActive(on bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		p, err := h.object(r)
		if err != nil {
			respond.Error(w, r, err)
			return
		}
		status, action := "ACTIVE", "plan.activated"
		if !on {
			status, action = "DEACTIVATED", "plan.deactivated"
		}
		if p.Status != status || p.IsActive != on {
			before := events.Map{"status": p.Status, "is_active": p.IsActive}
			p.Status, p.IsActive = status, on
			err = h.write(ctx, func(q *db.Queries, who *events.Actor) error {
				if err := savePlan(ctx, q, p); err != nil {
					return err
				}
				return events.Emit(ctx, q, events.Event{Action: action, SubjectType: "plan", SubjectID: p.ID.String(),
					SubjectLabel: p.Code, Actor: who, Before: before, After: events.Map{"status": status, "is_active": on}})
			})
			if err != nil {
				respond.Error(w, r, err)
				return
			}
		}
		h.respondPlan(w, r, p.ID, http.StatusOK)
	}
}
