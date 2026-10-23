package mobility

import (
	"context"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/auth"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
)

// SubscriptionDTO is SubscriptionSerializer.
type SubscriptionDTO struct {
	ID             string         `json:"id"`
	AccountID      string         `json:"account_id"`
	VehicleID      string         `json:"vehicle_id"`
	PlanID         string         `json:"plan_id"`
	QueuedPlanID   *string        `json:"queued_plan_id"`
	PaymentID      *string        `json:"payment_id"`
	PlanName       string         `json:"plan_name"`
	PlanCode       string         `json:"plan_code"`
	PlanPeriod     string         `json:"plan_period"`
	VehiclePlate   string         `json:"vehicle_plate"`
	AccountName    string         `json:"account_name"`
	AccountKuraID  string         `json:"account_kura_id"`
	StartsAt       jsontime.Field `json:"starts_at"`
	EndsAt         jsontime.Field `json:"ends_at"`
	SwapsUsed      int32          `json:"swaps_used"`
	SwapsAllowance *int32         `json:"swaps_allowance"`
	Status         string         `json:"status"`
	AutoRenew      bool           `json:"auto_renew"`
	ListPriceKobo  int64          `json:"list_price_kobo"`
	DiscountKobo   int64          `json:"discount_kobo"`
	AmountKobo     int64          `json:"amount_kobo"`
	DiscountCode   string         `json:"discount_code"`
	CreatedAt      jsontime.Field `json:"created_at"`
}

func subscriptionDTO(s db.SubscriptionRowsRow) SubscriptionDTO {
	return SubscriptionDTO{ID: s.ID.String(), AccountID: s.AccountID.String(), VehicleID: s.VehicleID.String(),
		PlanID: s.PlanID.String(), QueuedPlanID: idPtr(s.QueuedPlanID), PaymentID: idPtr(s.PaymentID),
		PlanName: s.PlanName, PlanCode: s.PlanCode, PlanPeriod: s.PlanPeriod, VehiclePlate: s.VehiclePlate,
		AccountName: s.AccountName, AccountKuraID: s.AccountKuraID, StartsAt: jsontime.Field(s.StartsAt),
		EndsAt: jsontime.Field(s.EndsAt), SwapsUsed: s.SwapsUsed, SwapsAllowance: s.SwapsAllowance, Status: s.Status,
		AutoRenew: s.AutoRenew, ListPriceKobo: s.ListPriceKobo, DiscountKobo: s.DiscountKobo, AmountKobo: s.AmountKobo,
		DiscountCode: s.DiscountCode, CreatedAt: jsontime.Field(s.CreatedAt)}
}

// SubscriptionHandler serves /api/v1/mobility/subscriptions.
type SubscriptionHandler struct {
	q       *db.Queries
	billing *Billing
}

func NewSubscriptionHandler(pool *pgxpool.Pool, tokens *auth.Tokens) *SubscriptionHandler {
	return &SubscriptionHandler{q: db.New(pool), billing: &Billing{pool: pool, tokens: tokens}}
}

// scope is subscriptions_for: all for mobility readers, else own accounts.
func (h *SubscriptionHandler) scope(ctx context.Context) (bool, []uuid.UUID, error) {
	p := reqctx.User(ctx)
	if canReadAllMobility(p) {
		return true, []uuid.UUID{}, nil
	}
	uid, _ := uuid.Parse(p.UserID)
	own, err := ownAccounts(ctx, h.q, uid)
	return false, own, err
}

func (h *SubscriptionHandler) list(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	qp := decode.Params(r)
	account, vehicle, plan := qp.UUID("account"), qp.UUID("vehicle"), qp.UUID("plan")
	if err := qp.Err(); err != nil {
		respond.Error(w, r, err)
		return
	}
	all, own, err := h.scope(ctx)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	status := listq.Exact(r, "status")
	total, err := h.q.CountSubscriptions(ctx, db.CountSubscriptionsParams{AllRows: all, Own: own, Account: account,
		Status: status, Vehicle: vehicle, Plan: plan})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	page, size := paginate.Page(r), paginate.Size(r)
	ids, err := h.q.ListSubscriptionIDs(ctx, db.ListSubscriptionIDsParams{AllRows: all, Own: own, Account: account,
		Status: status, Vehicle: vehicle, Plan: plan, Lim: int32(size), Off: int32(paginate.Offset(page, size))})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows, err := h.q.SubscriptionRows(ctx, ids)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	by := map[uuid.UUID]db.SubscriptionRowsRow{}
	for _, s := range rows {
		by[s.ID] = s
	}
	out := make([]SubscriptionDTO, 0, len(ids))
	for _, id := range ids {
		out = append(out, subscriptionDTO(by[id]))
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

// object is get_object: scoped (404), then staff readers or the account owner (403).
func (h *SubscriptionHandler) object(r *http.Request) (db.SubscriptionRowsRow, error) {
	ctx := r.Context()
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.SubscriptionRowsRow{}, apperr.NotFound("Not found.")
	}
	all, own, err := h.scope(ctx)
	if err != nil {
		return db.SubscriptionRowsRow{}, err
	}
	rows, err := h.q.SubscriptionRows(ctx, []uuid.UUID{id})
	if err != nil {
		return db.SubscriptionRowsRow{}, err
	}
	if len(rows) == 0 || (!all && !contains(own, rows[0].AccountID)) {
		return db.SubscriptionRowsRow{}, apperr.NotFound("No Subscription matches the given query.")
	}
	p := reqctx.User(ctx)
	if p.Can("accounts:manage") || p.Can("accounts:read") || rows[0].OwnerUserID.String() == p.UserID {
		return rows[0], nil
	}
	return rows[0], apperr.Forbidden("")
}

func (h *SubscriptionHandler) respond(w http.ResponseWriter, r *http.Request, id uuid.UUID, status int, err error) {
	var rows []db.SubscriptionRowsRow
	if err == nil {
		rows, err = h.q.SubscriptionRows(r.Context(), []uuid.UUID{id})
	}
	if err == nil && len(rows) == 0 {
		err = apperr.NotFound("No Subscription matches the given query.")
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.JSON(w, status, subscriptionDTO(rows[0]))
}

func (h *SubscriptionHandler) get(w http.ResponseWriter, r *http.Request) {
	s, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, subscriptionDTO(s))
}

func (h *SubscriptionHandler) who(r *http.Request) (*events.Actor, error) {
	return actor.FromRequest(r.Context(), h.q)
}

// ownAccount is SubscriptionViewSet._own_account (driver's account, else the
// first owned account).
func (h *SubscriptionHandler) ownAccount(ctx context.Context) (*db.AccountsAccount, error) {
	uid, _ := uuid.Parse(reqctx.User(ctx).UserID)
	if d, err := h.q.DriverRowByUser(ctx, uid); err == nil {
		a, err := h.q.AccountByID(ctx, d.AccountID)
		return &a, err
	} else if !database.IsNoRows(err) {
		return nil, err
	}
	a, err := h.q.FirstOwnedAccount(ctx, uid)
	if database.IsNoRows(err) {
		return nil, nil
	}
	return &a, err
}

type purchaseReq struct {
	Vehicle   uuid.UUID `json:"vehicle" validate:"required"`
	Plan      uuid.UUID `json:"plan" validate:"required"`
	AutoRenew *bool     `json:"auto_renew"`
	Code      string    `json:"discount_code"`
	Key       string    `json:"idempotency_key"`
	PinGrant  string    `json:"pin_grant" validate:"required"`
	Mode      *string   `json:"payment_mode" validate:"omitempty,oneof=WALLET"`
	Channel   *string   `json:"channel" validate:"omitempty,oneof=App USSD Hub"`
}

func channelOr(c *string) string {
	if c == nil {
		return "App"
	}
	return *c
}

// plan / vehicle lookups: Django's .get() 500s on a missing row; here 404.
func (h *SubscriptionHandler) plan(ctx context.Context, id uuid.UUID) (db.MobilityPlan, error) {
	p, err := h.q.PlanRow(ctx, id)
	if database.IsNoRows(err) {
		return p, apperr.NotFound("Plan not found.")
	}
	return p, err
}

func (h *SubscriptionHandler) create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b purchaseReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	acct, err := h.ownAccount(ctx)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	if acct == nil {
		respond.JSON(w, http.StatusBadRequest, map[string]any{"error": map[string]string{"code": "ACCOUNT_REQUIRED",
			"message": "Complete profile."}})
		return
	}
	if _, err := h.q.VehicleByIDPlain(ctx, b.Vehicle); database.IsNoRows(err) {
		respond.Error(w, r, apperr.NotFound("Vehicle not found."))
		return
	}
	plan, err := h.plan(ctx, b.Plan)
	var who *events.Actor
	if err == nil {
		who, err = h.who(r)
	}
	var id uuid.UUID
	if err == nil {
		mode := "WALLET"
		if b.Mode != nil {
			mode = *b.Mode
		}
		id, err = h.billing.Purchase(ctx, PurchaseIn{Account: *acct, Vehicle: b.Vehicle, Plan: plan, Actor: who,
			AutoRenew: b.AutoRenew, Code: b.Code, Key: b.Key, Channel: channelOr(b.Channel), Mode: mode, PinGrant: b.PinGrant})
	}
	h.respond(w, r, id, http.StatusCreated, err)
}
