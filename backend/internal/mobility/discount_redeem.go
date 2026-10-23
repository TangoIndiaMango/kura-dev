package mobility

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
)

// redeemReq is DiscountRedeemSerializer.
type redeemReq struct {
	Code        string     `json:"code" validate:"required"`
	ListPrice   *int64     `json:"list_price_kobo" validate:"omitempty,min=1"`
	Period      string     `json:"period" validate:"required"`
	Channel     *string    `json:"channel" validate:"omitempty,oneof=App USSD Hub"`
	Plan        *uuid.UUID `json:"plan"`
	VehicleType *string    `json:"vehicle_type"`
}

var periodMatrix = map[string]string{"daily": "day", "day": "day", "weekly": "week", "week": "week",
	"monthly": "month", "month": "month", "swap": "swap", "pps": "swap"}

// redeem quotes a code (no consumption — purchase/renew consume server-side).
func (h *DiscountHandler) redeem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	keys := decode.Keys(r)
	var b redeemReq
	err := decode.JSON(r, &b)
	if err == nil && keys["list_price_kobo"] && b.ListPrice == nil {
		err = apperr.Field("list_price_kobo", "This field may not be null.")
	}
	var plan *db.MobilityPlan
	if err == nil && b.Plan != nil {
		if p, perr := h.q.PlanRow(ctx, *b.Plan); perr == nil {
			plan = &p
		} else if !database.IsNoRows(perr) {
			err = perr
		}
	}
	list := int64(0)
	if err == nil && b.ListPrice != nil {
		list = *b.ListPrice
	} else if err == nil {
		vtype, period := "MOTORCYCLE", b.Period
		if mp, ok := periodMatrix[strings.ToLower(b.Period)]; ok {
			period = mp
		}
		if plan != nil {
			vtype, period = plan.VehicleType, plan.Period
		}
		if b.VehicleType != nil && strings.TrimSpace(*b.VehicleType) != "" {
			vtype = strings.TrimSpace(*b.VehicleType)
		}
		list, err = planListKobo(ctx, h.q, vtype, period)
	}
	vehicles := int32(1)
	if err == nil {
		vehicles, err = h.redeemVehicleCount(ctx)
	}
	var qt Quote
	if err == nil {
		qt, err = quoteDiscount(ctx, h.q, b.Code, list, b.Period, channelOr(b.Channel), plan, vehicles)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, map[string]any{"code": qt.Code, "list_price_kobo": qt.List, "discount_kobo": qt.Discounted,
		"due_kobo": qt.Due, "value_label": qt.Label, "discount_id": qt.Discount.ID.String()})
}

// redeemVehicleCount: driver's account, else user.accounts.first(); 1 with no account.
func (h *DiscountHandler) redeemVehicleCount(ctx context.Context) (int32, error) {
	uid, _ := uuid.Parse(reqctx.User(ctx).UserID)
	var account uuid.UUID
	if d, err := h.q.DriverRowByUser(ctx, uid); err == nil {
		account = d.AccountID
	} else if !database.IsNoRows(err) {
		return 0, err
	} else if a, err := h.q.NewestOwnedAccount(ctx, uid); err == nil {
		account = a.ID
	} else if database.IsNoRows(err) {
		return 1, nil
	} else {
		return 0, err
	}
	return h.q.AccountVehicleTotal(ctx, account)
}
