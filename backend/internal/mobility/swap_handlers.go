package mobility

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
)

func (b *Bay) swapRow(ctx context.Context, id uuid.UUID) (db.SwapRowsRow, error) {
	rows, err := b.q.SwapRows(ctx, []uuid.UUID{id})
	if err == nil && len(rows) == 0 {
		err = apperr.NotFound("No Swap matches the given query.")
	}
	if err != nil {
		return db.SwapRowsRow{}, err
	}
	return rows[0], nil
}

func (b *Bay) swaps(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	qp := decode.Params(r)
	p := db.SwapsPageParams{Account: qp.UUID("account"), Status: listq.Exact(r, "status"),
		PaymentMode: listq.Exact(r, "payment_mode"), Hub: qp.UUID("hub"), Vehicle: qp.UUID("vehicle"),
		Agent: qp.UUID("agent"), Battery: qp.UUID("battery")}
	if open := qp.Bool("open"); open != nil {
		p.OpenOnly = *open // ?open=true: in-progress bay sessions only
	}
	if d := qp.Date("start_date"); d != nil {
		p.FromAt = ptrTime(time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, lagosTZ))
	}
	if d := qp.Date("end_date"); d != nil {
		p.ToAt = ptrTime(time.Date(d.Year(), d.Month(), d.Day()+1, 0, 0, 0, 0, lagosTZ))
	}
	err := qp.Err()
	var sc bayScope
	if err == nil {
		sc, err = b.scope(ctx)
	}
	var at *paginate.Key
	if err == nil {
		at, err = paginate.Cursor(r)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	size := paginate.Size(r)
	p.AllRows, p.HubScoped, p.Hubs, p.Own, p.Lim = sc.all, sc.hubScoped, sc.hubs, sc.own, int32(size+1)
	if at != nil {
		p.AfterAt, p.Back = &at.CreatedAt, at.Back
		p.AfterID, _ = uuid.Parse(at.ID)
	}
	ids, err := b.q.SwapsPage(ctx, p)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	ids = paginate.Display(ids, size, p.Back)
	rows, err := b.q.SwapRows(ctx, ids)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	by := map[uuid.UUID]db.SwapRowsRow{}
	for _, x := range rows {
		by[x.ID] = x
	}
	out := []SwapDTO{}
	for _, id := range ids {
		out = append(out, b.swapDTO(ctx, by[id]))
	}
	respond.OK(w, paginate.BuildCursorPage(r, out, size, at, func(d SwapDTO) paginate.Key {
		return paginate.Key{CreatedAt: time.Time(d.CreatedAt), ID: d.ID}
	}))
}

// swap is get_object: scoped (404) then the read-own object check (403).
func (b *Bay) swap(r *http.Request) (db.SwapRowsRow, error) {
	ctx := r.Context()
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.SwapRowsRow{}, apperr.NotFound("Not found.")
	}
	sc, err := b.scope(ctx)
	if err != nil {
		return db.SwapRowsRow{}, err
	}
	s, err := b.swapRow(ctx, id)
	if err == nil && !sc.allows(s.HubID, s.AccountID) {
		err = apperr.NotFound("No Swap matches the given query.")
	}
	if err != nil {
		return s, err
	}
	p := reqctx.User(ctx)
	if !(p.Can("accounts:manage") || p.Can("accounts:read") || s.OwnerUserID.String() == p.UserID) {
		return s, apperr.Forbidden("")
	}
	return s, nil
}

func (b *Bay) respondSwap(w http.ResponseWriter, r *http.Request, id uuid.UUID, status int, extra map[string]any) {
	s, err := b.swapRow(r.Context(), id)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	dto := b.swapDTO(r.Context(), s)
	if extra == nil {
		respond.JSON(w, status, dto)
		return
	}
	m := structMap(dto)
	for k, v := range extra {
		m[k] = v
	}
	respond.JSON(w, status, m)
}

func (b *Bay) getSwap(w http.ResponseWriter, r *http.Request) {
	s, err := b.swap(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, b.swapDTO(r.Context(), s))
}

func (b *Bay) start(w http.ResponseWriter, r *http.Request) {
	var in startIn
	err := decode.JSON(r, &in)
	var id uuid.UUID
	var resumed bool
	if err == nil {
		id, resumed, err = b.startSwap(r.Context(), in)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	b.respondSwap(w, r, id, http.StatusCreated, map[string]any{"resumed": resumed})
}

type returnIn struct {
	Serial string `json:"battery_serial" validate:"required"`
	Charge *int64 `json:"charge_pct" validate:"omitempty,min=0,max=100"`
	Reason string `json:"mismatch_reason" validate:"max=40"`
}

func (b *Bay) recordReturnHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var in returnIn
	err := decode.JSON(r, &in)
	var s db.SwapRowsRow
	if err == nil {
		s, err = b.swap(r)
	}
	var mismatch bool
	if err == nil {
		err = b.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			var err error
			mismatch, err = recordReturn(ctx, q, s.ID, in.Serial, or64(in.Charge, 15), in.Reason, who)
			return err
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	b.respondSwap(w, r, s.ID, http.StatusOK, map[string]any{"mismatch": mismatch})
}

type issueIn struct {
	Serial string `json:"battery_serial" validate:"required"`
	Charge *int64 `json:"charge_pct" validate:"omitempty,min=0,max=100"`
}

func (b *Bay) issue(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var in issueIn
	err := decode.JSON(r, &in)
	var s db.SwapRowsRow
	if err == nil {
		s, err = b.swap(r)
	}
	if err == nil {
		err = b.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			return issueBattery(ctx, q, s.ID, in.Serial, or64(in.Charge, 100), who)
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	b.respondSwap(w, r, s.ID, http.StatusOK, nil)
}
