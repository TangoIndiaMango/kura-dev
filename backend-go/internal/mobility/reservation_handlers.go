package mobility

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/scope"
)

// bayScope is reservations_for / swaps_for: mobility readers see all,
// hub-scoped staff their hubs, everyone else their own accounts.
type bayScope struct {
	all, hubScoped bool
	hubs, own      []uuid.UUID
}

func (b *Bay) scope(ctx context.Context) (bayScope, error) {
	p := reqctx.User(ctx)
	if canReadAllMobility(p) {
		return bayScope{all: true, hubs: []uuid.UUID{}, own: []uuid.UUID{}}, nil
	}
	hubs, err := scope.HubsFor(ctx, b.q, p)
	if err != nil {
		return bayScope{}, err
	}
	if !hubs.All {
		if hubs.IDs == nil {
			hubs.IDs = []uuid.UUID{}
		}
		return bayScope{hubScoped: true, hubs: hubs.IDs, own: []uuid.UUID{}}, nil
	}
	uid, _ := uuid.Parse(p.UserID)
	own, err := scope.OwnAccounts(ctx, b.q, uid)
	return bayScope{hubs: []uuid.UUID{}, own: own}, err
}

func (s bayScope) allows(hub, account uuid.UUID) bool {
	switch {
	case s.all:
		return true
	case s.hubScoped:
		return contains(s.hubs, hub)
	}
	return contains(s.own, account)
}

func (b *Bay) tx(ctx context.Context, fn func(q *db.Queries, who *events.Actor) error) error {
	return database.InTx(ctx, b.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		who, err := actor.FromRequest(ctx, q)
		if err != nil {
			return err
		}
		return fn(q, who)
	})
}

func (b *Bay) reservationRow(ctx context.Context, id uuid.UUID) (db.ReservationRowsRow, error) {
	rows, err := b.q.ReservationRows(ctx, []uuid.UUID{id})
	if err == nil && len(rows) == 0 {
		err = apperr.NotFound("No Reservation matches the given query.")
	}
	if err != nil {
		return db.ReservationRowsRow{}, err
	}
	return rows[0], nil
}

func (b *Bay) reservations(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	qp := decode.Params(r)
	p := db.ReservationsPageParams{Account: qp.UUID("account"), PaymentMode: listq.Exact(r, "payment_mode"),
		Hub: qp.UUID("hub"), Vehicle: qp.UUID("vehicle"), Code: listq.Exact(r, "code")}
	if v := listq.Exact(r, "status"); v != nil {
		s := strings.ToUpper(*v)
		p.Status = &s
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
	ids, err := b.q.ReservationsPage(ctx, p)
	var rows []db.ReservationRowsRow
	if err == nil {
		rows, err = b.q.ReservationRows(ctx, paginate.Display(ids, size, p.Back))
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	by := map[uuid.UUID]db.ReservationRowsRow{}
	for _, x := range rows {
		by[x.ID] = x
	}
	out := []ReservationDTO{}
	for _, id := range paginate.Display(ids, size, p.Back) {
		out = append(out, b.reservationDTO(by[id]))
	}
	respond.OK(w, paginate.BuildCursorPage(r, out, size, at, func(d ReservationDTO) paginate.Key {
		return paginate.Key{CreatedAt: time.Time(d.CreatedAt), ID: d.ID}
	}))
}

// reservation is get_object: scoped (404), owner / accounts readers (403),
// then ensure_fresh (a lapsed hold expires on read, like Django).
func (b *Bay) reservation(r *http.Request) (db.ReservationRowsRow, error) {
	ctx := r.Context()
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.ReservationRowsRow{}, apperr.NotFound("Not found.")
	}
	sc, err := b.scope(ctx)
	if err != nil {
		return db.ReservationRowsRow{}, err
	}
	row, err := b.reservationRow(ctx, id)
	if err == nil && !sc.allows(row.HubID, row.AccountID) {
		err = apperr.NotFound("No Reservation matches the given query.")
	}
	if err != nil {
		return row, err
	}
	p := reqctx.User(ctx)
	if !(p.Can("accounts:manage") || p.Can("accounts:read") || row.OwnerUserID.String() == p.UserID) {
		return row, apperr.Forbidden("")
	}
	if (row.Status == "PENDING" || row.Status == "CONFIRMED") && !row.ExpiresAt.After(time.Now()) {
		if err := b.tx(ctx, func(q *db.Queries, _ *events.Actor) error {
			_, err := expireReservation(ctx, q, row.ID)
			return err
		}); err != nil {
			return row, err
		}
		return b.reservationRow(ctx, row.ID)
	}
	return row, nil
}

func (b *Bay) getReservation(w http.ResponseWriter, r *http.Request) {
	row, err := b.reservation(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, b.reservationDTO(row))
}

func (b *Bay) cancelReservationHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	row, err := b.reservation(r)
	var out db.MobilityReservation
	if err == nil {
		err = b.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			var err error
			out, err = cancelReservation(ctx, q, row.ID, who, "")
			return err
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, map[string]string{"status": out.Status, "id": out.ID.String()})
}

// extendHandler: minutes = int(request.data.get("minutes") or 0) — a
// non-number is a 400 here (Django's int() 500s).
func (b *Bay) extendHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	row, err := b.reservation(r)
	data := rawBody(r)
	var minutes int64
	if v, ok := data["minutes"]; ok && v != nil && v != "" && v != false && v != float64(0) {
		n, perr := strconv.ParseInt(strings.TrimSpace(pyStr(v)), 10, 64)
		if perr != nil {
			err = apperr.Field("minutes", "A valid integer is required.")
		}
		minutes = n
	}
	reason := ""
	if v, ok := data["reason"]; ok && v != nil {
		reason = pyStr(v)
	}
	if err == nil {
		err = b.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			return b.extendReservation(ctx, q, row.ID, minutes, who, reason)
		})
	}
	if err == nil {
		row, err = b.reservationRow(ctx, row.ID)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, b.reservationDTO(row))
}
