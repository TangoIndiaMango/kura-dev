package mobility

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
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
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

// DiscountDTO is DiscountCampaignSerializer.
type DiscountDTO struct {
	ID                string          `json:"id"`
	Name              string          `json:"name"`
	Code              string          `json:"code"`
	ValueType         string          `json:"value_type"`
	Value             int32           `json:"value"`
	Status            string          `json:"status"`
	AppliesToAllPlans bool            `json:"applies_to_all_plans"`
	PlanOptionIDs     json.RawMessage `json:"plan_option_ids"`
	Periods           json.RawMessage `json:"periods"`
	Audience          string          `json:"audience"`
	FleetMinVehicles  *int32          `json:"fleet_min_vehicles"`
	SegmentID         string          `json:"segment_id"`
	Channels          string          `json:"channels"`
	Summary           string          `json:"summary"`
	MaxRedemptions    *int32          `json:"max_redemptions"`
	RedemptionsCount  int32           `json:"redemptions_count"`
	MaxPerAccount     int32           `json:"max_per_account"`
	StartsAt          *jsontime.Field `json:"starts_at"`
	EndsAt            *jsontime.Field `json:"ends_at"`
	CreatedAt         jsontime.Field  `json:"created_at"`
}

func discountDTO(d db.MobilityDiscountcampaign) DiscountDTO {
	return DiscountDTO{ID: d.ID.String(), Name: d.Name, Code: d.Code, ValueType: d.ValueType, Value: d.Value,
		Status: d.Status, AppliesToAllPlans: d.AppliesToAllPlans, PlanOptionIDs: d.PlanOptionIds, Periods: d.Periods,
		Audience: d.Audience, FleetMinVehicles: d.FleetMinVehicles, SegmentID: d.SegmentID, Channels: d.Channels,
		Summary: d.Summary, MaxRedemptions: d.MaxRedemptions, RedemptionsCount: d.RedemptionsCount,
		MaxPerAccount: d.MaxPerAccount, StartsAt: jsontime.FieldPtr(d.StartsAt), EndsAt: jsontime.FieldPtr(d.EndsAt),
		CreatedAt: jsontime.Field(d.CreatedAt)}
}

// DiscountHandler serves /api/v1/mobility/discounts.
type DiscountHandler struct {
	pool *pgxpool.Pool
	q    *db.Queries
}

func NewDiscountHandler(pool *pgxpool.Pool) *DiscountHandler {
	return &DiscountHandler{pool: pool, q: db.New(pool)}
}

var (
	discountStatuses  = []string{"DRAFT", "PENDING", "SCHEDULED", "ACTIVE", "PAUSED", "EXPIRED", "SUPERSEDED"}
	discountAudiences = []string{"ALL", "FLEET", "SEGMENT"}
)

// icontains escapes a raw ?search= term (not trimmed, like the view).
func icontains(r *http.Request, name string) *string {
	v := r.URL.Query().Get(name)
	if v == "" {
		return nil
	}
	esc := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(v)
	return &esc
}

func (h *DiscountHandler) list(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	status, serr := listq.Choice(r, "status", discountStatuses...)
	audience, aerr := listq.Choice(r, "audience", discountAudiences...)
	if err := listq.Merge(serr, aerr); err != nil {
		respond.Error(w, r, err)
		return
	}
	search := icontains(r, "search")
	total, err := h.q.CountDiscounts(ctx, db.CountDiscountsParams{Search: search, Status: status, Audience: audience})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	page, size := paginate.Page(r), paginate.Size(r)
	rows, err := h.q.ListDiscounts(ctx, db.ListDiscountsParams{Search: search, Status: status, Audience: audience,
		Lim: int32(size), Off: int32(paginate.Offset(page, size))})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]DiscountDTO, len(rows))
	for i, d := range rows {
		out[i] = discountDTO(d)
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

func (h *DiscountHandler) object(ctx context.Context, r *http.Request) (db.MobilityDiscountcampaign, error) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.MobilityDiscountcampaign{}, apperr.NotFound("Not found.")
	}
	d, err := h.q.DiscountByID(ctx, id)
	if database.IsNoRows(err) {
		return d, apperr.NotFound("No DiscountCampaign matches the given query.")
	}
	return d, err
}

func (h *DiscountHandler) get(w http.ResponseWriter, r *http.Request) {
	d, err := h.object(r.Context(), r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, discountDTO(d))
}

// activate is DiscountService.activate (maker-checker).
func (h *DiscountHandler) activate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	d, err := h.object(ctx, r)
	if err == nil && !containsStr([]string{"PENDING", "SCHEDULED", "DRAFT"}, d.Status) {
		err = apperr.Conflict("INVALID_TRANSITION", "Cannot activate discount in status "+d.Status+".")
	}
	var user db.GetUserByIDRow
	if err == nil {
		user, err = me(ctx, h.q)
	}
	if err == nil {
		err = approval.AssertNotSelf(user, d.CreatedByID, "Creator cannot activate their own discount.")
	}
	if err == nil {
		err = database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
			q := db.New(tx)
			who, err := actor.FromRequest(ctx, q)
			if err != nil {
				return err
			}
			before := d.Status
			d.Status, d.ApprovedByID = "ACTIVE", &user.ID
			if err := q.SaveDiscount(ctx, saveDiscountParams(d)); err != nil {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "discount.activated", SubjectType: "discount",
				SubjectID: d.ID.String(), SubjectLabel: d.Code, Actor: who, Before: events.Map{"status": before},
				After: events.Map{"status": d.Status, "code": d.Code, "approved_by_id": user.ID.String(),
					"created_by_id": optID(d.CreatedByID)},
				Metadata: approval.Metadata(user, d.CreatedByID)})
		})
	}
	if err == nil {
		d, err = h.q.DiscountByID(ctx, d.ID)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, discountDTO(d))
}

func saveDiscountParams(d db.MobilityDiscountcampaign) db.SaveDiscountParams {
	return db.SaveDiscountParams{ID: d.ID, Name: d.Name, Code: d.Code, ValueType: d.ValueType, Value: d.Value,
		Status: d.Status, AppliesToAllPlans: d.AppliesToAllPlans, PlanOptionIds: d.PlanOptionIds, Periods: d.Periods,
		Audience: d.Audience, FleetMinVehicles: d.FleetMinVehicles, SegmentID: d.SegmentID, Channels: d.Channels,
		Summary: d.Summary, MaxRedemptions: d.MaxRedemptions, MaxPerAccount: d.MaxPerAccount, StartsAt: d.StartsAt,
		EndsAt: d.EndsAt, ApprovedByID: d.ApprovedByID}
}

// RedemptionDTO is one row of the redemptions ledger.
type RedemptionDTO struct {
	ID                 string `json:"id"`
	AccountID          string `json:"account_id"`
	AccountDisplayName string `json:"account_display_name"`
	KuraID             string `json:"kura_id"`
	ListPriceKobo      int64  `json:"list_price_kobo"`
	DiscountKobo       int64  `json:"discount_kobo"`
	DueKobo            int64  `json:"due_kobo"`
	Channel            string `json:"channel"`
	Period             string `json:"period"`
	CreatedAt          string `json:"created_at"`
	at                 time.Time
}

func (h *DiscountHandler) redemptions(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	d, err := h.object(ctx, r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	p := db.RedemptionsPageParams{DiscountID: d.ID}
	if raw := r.URL.Query().Get("account"); raw != "" {
		id, perr := uuid.Parse(raw)
		if perr != nil {
			respond.Error(w, r, apperr.Validation(apperr.Details{"non_field_errors": []string{"“" + raw + "” is not a valid UUID."}}))
			return
		}
		p.Account = &id
	}
	at, err := paginate.Cursor(r)
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
	rows, err := h.q.RedemptionsPage(ctx, p)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows = paginate.Display(rows, size, p.Back)
	out := make([]RedemptionDTO, len(rows))
	for i, x := range rows {
		out[i] = RedemptionDTO{ID: x.ID.String(), AccountID: x.AccountID.String(),
			AccountDisplayName: x.AccountDisplayName, KuraID: x.KuraID, ListPriceKobo: x.ListPriceKobo,
			DiscountKobo: x.DiscountKobo, DueKobo: x.DueKobo, Channel: x.Channel, Period: x.Period,
			CreatedAt: jsontime.FormatISO(x.CreatedAt), at: x.CreatedAt}
	}
	respond.OK(w, paginate.BuildCursorPage(r, out, size, at, func(x RedemptionDTO) paginate.Key {
		return paginate.Key{CreatedAt: x.at, ID: x.ID}
	}))
}

// writerID is the signed-in user (created_by).
func writerID(ctx context.Context) *uuid.UUID {
	id, err := uuid.Parse(reqctx.User(ctx).UserID)
	if err != nil {
		return nil
	}
	return &id
}
