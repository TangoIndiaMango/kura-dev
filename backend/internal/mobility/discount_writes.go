package mobility

import (
	"context"
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
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
)

// discountReq is DiscountWriteSerializer (ModelSerializer over DiscountCampaign).
type discountReq struct {
	Name           *string          `json:"name" validate:"omitempty,notblank,max=120"`
	Code           *string          `json:"code" validate:"omitempty,notblank,max=40"`
	ValueType      *string          `json:"value_type" validate:"omitempty,oneof=PERCENT AMOUNT"`
	Value          *int64           `json:"value" validate:"omitempty,min=0,max=2147483647"`
	Status         *string          `json:"status" validate:"omitempty,oneof=DRAFT PENDING SCHEDULED ACTIVE PAUSED EXPIRED SUPERSEDED"`
	AllPlans       *bool            `json:"applies_to_all_plans"`
	PlanOptionIDs  json.RawMessage  `json:"plan_option_ids"`
	Periods        json.RawMessage  `json:"periods"`
	Audience       *string          `json:"audience" validate:"omitempty,oneof=ALL FLEET SEGMENT"`
	FleetMin       *int64           `json:"fleet_min_vehicles" validate:"omitempty,min=0,max=2147483647"`
	SegmentID      *string          `json:"segment_id" validate:"omitempty,max=64"`
	Channels       *string          `json:"channels" validate:"omitempty,notblank,max=80"`
	Summary        *string          `json:"summary" validate:"omitempty,max=255"`
	MaxRedemptions *int64           `json:"max_redemptions" validate:"omitempty,min=0,max=2147483647"`
	MaxPerAccount  *int64           `json:"max_per_account" validate:"omitempty,min=0,max=2147483647"`
	StartsAt       *decode.DateTime `json:"starts_at"`
	EndsAt         *decode.DateTime `json:"ends_at"`
}

// notNullable are the fields whose model column is NOT NULL (allow_null=False).
var notNullable = []string{"name", "code", "value_type", "value", "status", "applies_to_all_plans",
	"plan_option_ids", "periods", "audience", "segment_id", "channels", "summary", "max_per_account"}

// validate runs the serializer: field errors, required fields on create, and
// the code UniqueValidator (exact match, excluding the instance on update).
func (h *DiscountHandler) validate(r *http.Request, b *discountReq, create bool, self uuid.UUID) (map[string]bool, error) {
	keys := decode.Keys(r)
	err := decode.JSON(r, b)
	d := apperr.Details{}
	if e, ok := apperr.As(err); ok && e.Code == "VALIDATION_ERROR" {
		d = e.Details
	} else if err != nil {
		return keys, err
	}
	for _, k := range notNullable {
		if raw, ok := keys[k]; ok && raw && d[k] == nil && h.isNull(r, b, k) {
			d[k] = []string{"This field may not be null."}
		}
	}
	if create {
		for _, k := range []string{"name", "code", "value_type", "value"} {
			if !keys[k] {
				d[k] = []string{"This field is required."}
			}
		}
	}
	if b.Code != nil && d["code"] == nil {
		taken, err := h.q.DiscountCodeTaken(r.Context(), db.DiscountCodeTakenParams{Code: strings.TrimSpace(*b.Code),
			Exclude: self})
		if err != nil {
			return keys, err
		}
		if taken {
			d["code"] = []string{"discount campaign with this code already exists."}
		}
	}
	if len(d) > 0 {
		return keys, apperr.Validation(d)
	}
	return keys, nil
}

func (h *DiscountHandler) isNull(_ *http.Request, b *discountReq, k string) bool {
	switch k {
	case "name":
		return b.Name == nil
	case "code":
		return b.Code == nil
	case "value_type":
		return b.ValueType == nil
	case "value":
		return b.Value == nil
	case "status":
		return b.Status == nil
	case "applies_to_all_plans":
		return b.AllPlans == nil
	case "plan_option_ids":
		return b.PlanOptionIDs == nil
	case "periods":
		return b.Periods == nil
	case "audience":
		return b.Audience == nil
	case "segment_id":
		return b.SegmentID == nil
	case "channels":
		return b.Channels == nil
	case "summary":
		return b.Summary == nil
	}
	return b.MaxPerAccount == nil
}

func trimmed(p *string) string { return strings.TrimSpace(*p) }

func dtp(p *decode.DateTime) *time.Time {
	if p == nil {
		return nil
	}
	return &p.Time
}

// apply copies the sent fields onto d (partial update semantics).
func (b *discountReq) apply(d *db.MobilityDiscountcampaign, keys map[string]bool) {
	set := func(p *string, dst *string) {
		if p != nil {
			*dst = trimmed(p)
		}
	}
	set(b.Name, &d.Name)
	set(b.Code, &d.Code)
	set(b.ValueType, &d.ValueType)
	set(b.Status, &d.Status)
	set(b.Audience, &d.Audience)
	set(b.SegmentID, &d.SegmentID)
	set(b.Channels, &d.Channels)
	set(b.Summary, &d.Summary)
	if b.Value != nil {
		d.Value = int32(*b.Value)
	}
	if b.AllPlans != nil {
		d.AppliesToAllPlans = *b.AllPlans
	}
	if b.PlanOptionIDs != nil {
		d.PlanOptionIds = b.PlanOptionIDs
	}
	if b.Periods != nil {
		d.Periods = b.Periods
	}
	if b.MaxPerAccount != nil {
		d.MaxPerAccount = int32(*b.MaxPerAccount)
	}
	if keys["fleet_min_vehicles"] {
		d.FleetMinVehicles = i32(b.FleetMin)
	}
	if keys["max_redemptions"] {
		d.MaxRedemptions = i32(b.MaxRedemptions)
	}
	if keys["starts_at"] {
		d.StartsAt = dtp(b.StartsAt)
	}
	if keys["ends_at"] {
		d.EndsAt = dtp(b.EndsAt)
	}
}

func (h *DiscountHandler) tx(ctx context.Context, fn func(q *db.Queries, who *events.Actor) error) error {
	return database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		who, err := actor.FromRequest(ctx, q)
		if err != nil {
			return err
		}
		return fn(q, who)
	})
}

func (h *DiscountHandler) create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b discountReq
	keys, err := h.validate(r, &b, true, uuid.Nil)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	d := db.MobilityDiscountcampaign{ID: ids.New(), Status: "DRAFT", AppliesToAllPlans: true,
		PlanOptionIds: []byte("[]"), Periods: []byte("[]"), Audience: "ALL", Channels: "App · USSD · Hub",
		CreatedByID: writerID(ctx)}
	b.apply(&d, keys)
	d.Code = strings.ToUpper(d.Code)
	err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
		if err := q.InsertDiscount(ctx, db.InsertDiscountParams{ID: d.ID, Name: d.Name, Code: d.Code,
			ValueType: d.ValueType, Value: d.Value, Status: d.Status, AppliesToAllPlans: d.AppliesToAllPlans,
			PlanOptionIds: d.PlanOptionIds, Periods: d.Periods, Audience: d.Audience,
			FleetMinVehicles: d.FleetMinVehicles, SegmentID: d.SegmentID, Channels: d.Channels, Summary: d.Summary,
			MaxRedemptions: d.MaxRedemptions, MaxPerAccount: d.MaxPerAccount, StartsAt: d.StartsAt, EndsAt: d.EndsAt,
			CreatedByID: d.CreatedByID}); err != nil {
			if _, dup := database.IsUniqueViolation(err); dup { // "abc" passes the exact check, "ABC" exists
				return apperr.Field("code", "discount campaign with this code already exists.")
			}
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "discount.created", SubjectType: "discount_campaign",
			SubjectID: d.ID.String(), Actor: who, After: events.Map{"code": d.Code, "status": d.Status,
				"value_type": d.ValueType, "value": d.Value}})
	})
	h.respondDiscount(w, r, d.ID, http.StatusCreated, err)
}

// patch is partial_update: get_object first, then the serializer.
func (h *DiscountHandler) patch(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	d, err := h.object(ctx, r)
	var b discountReq
	var keys map[string]bool
	if err == nil {
		keys, err = h.validate(r, &b, false, d.ID)
	}
	if err == nil {
		before := events.Map{"status": d.Status, "code": d.Code}
		b.apply(&d, keys)
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			if err := q.SaveDiscount(ctx, saveDiscountParams(d)); err != nil {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "discount.updated", SubjectType: "discount_campaign",
				SubjectID: d.ID.String(), Actor: who, Before: before,
				After: events.Map{"status": d.Status, "code": d.Code}})
		})
	}
	h.respondDiscount(w, r, d.ID, http.StatusOK, err)
}

func (h *DiscountHandler) respondDiscount(w http.ResponseWriter, r *http.Request, id uuid.UUID, status int, err error) {
	var d db.MobilityDiscountcampaign
	if err == nil {
		d, err = h.q.DiscountByID(r.Context(), id)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.JSON(w, status, discountDTO(d))
}
