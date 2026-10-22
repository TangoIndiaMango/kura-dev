package mobility

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/risk"
)

type sessionIn struct {
	Mode     *string      `json:"payment_mode" validate:"omitempty,oneof=PLAN WALLET CREDIT CASH"`
	Amount   *int64       `json:"amount_kobo"`
	Code     string       `json:"discount_code" validate:"max=40"`
	PinGrant string       `json:"rider_pin_grant"`
	Override *overrideReq `json:"override"`
}

func (b *Bay) completeSessionHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var in sessionIn
	err := decode.JSON(r, &in)
	var s db.SwapRowsRow
	if err == nil {
		s, err = b.swap(r)
	}
	var res settled
	if err == nil {
		err = b.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			var err error
			res, err = b.completeSession(ctx, q, s.ID, payIn{Mode: in.Mode, Amount: in.Amount, Code: in.Code,
				PinGrant: in.PinGrant, Override: in.Override}, who)
			return err
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	if res.Deposit != nil {
		b.ops.ReceiptEmail(*res.Deposit)
	}
	b.bustoutAfter(ctx, s.ID)
	b.respondSwap(w, r, s.ID, http.StatusOK, nil)
}

type abortIn struct {
	Reason string `json:"reason"`
}

func (b *Bay) abort(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var in abortIn
	err := decode.JSON(r, &in)
	var s db.SwapRowsRow
	if err == nil {
		s, err = b.swap(r)
	}
	if err == nil {
		err = b.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			return abortSwap(ctx, q, s.ID, in.Reason, actorID(who), who)
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	b.respondSwap(w, r, s.ID, http.StatusOK, nil)
}

type reverseIn struct {
	Reason string `json:"reason" validate:"required,max=400"`
}

func (b *Bay) reverse(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var in reverseIn
	err := decode.JSON(r, &in)
	var s db.SwapRowsRow
	if err == nil {
		s, err = b.swap(r)
	}
	if err == nil {
		err = b.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			return reverseSwap(ctx, q, s.ID, in.Reason, who)
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	b.respondSwap(w, r, s.ID, http.StatusOK, nil)
}

// completeLegacyHandler is the one-shot POST /swaps/complete/.
func (b *Bay) completeLegacyHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var in legacyIn
	err := decode.JSON(r, &in)
	if err == nil && in.IssuedSerial == "" {
		err = apperr.New("VALIDATION_ERROR", "issued_battery_serial is required.").
			WithDetails(apperr.Details{"issued_battery_serial": []string{"required"}})
	}
	if err == nil {
		err = risk.AssertSwapVelocity(ctx, b.pool, in.VehicleID, b.knownAccount(ctx, &in.AccountID))
	}
	var id uuid.UUID
	var res settled
	if err == nil {
		err = b.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			var err error
			id, res, err = b.completeLegacy(ctx, q, in, who)
			return err
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	if res.Deposit != nil {
		b.ops.ReceiptEmail(*res.Deposit)
	}
	b.respondSwap(w, r, id, http.StatusCreated, nil)
}
