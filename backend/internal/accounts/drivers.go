package accounts

import (
	"context"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/scope"
)

// DriverDTO is DriverSerializer.
type DriverDTO struct {
	ID                  string  `json:"id"`
	User                string  `json:"user"`
	Account             string  `json:"account"`
	Phone               *string `json:"phone"`
	FirstName           string  `json:"first_name"`
	LastName            string  `json:"last_name"`
	LicenseNumber       string  `json:"license_number"`
	Status              string  `json:"status"`
	DailySwapLimit      *int16  `json:"daily_swap_limit"`
	DailySpendKoboLimit *int64  `json:"daily_spend_kobo_limit"`
}

func driverDTO(d db.GetDriverRowRow) DriverDTO {
	return DriverDTO{ID: d.ID.String(), User: d.UserID.String(), Account: d.AccountID.String(),
		Phone: d.Phone, FirstName: d.FirstName, LastName: d.LastName, LicenseNumber: d.LicenseNumber,
		Status: d.Status, DailySwapLimit: d.DailySwapLimit, DailySpendKoboLimit: d.DailySpendKoboLimit}
}

// DriverHandler serves /api/v1/drivers (DriverViewSet).
type DriverHandler struct {
	pool *pgxpool.Pool
	q    *db.Queries
}

func NewDriverHandler(pool *pgxpool.Pool) *DriverHandler {
	return &DriverHandler{pool: pool, q: db.New(pool)}
}

// driverScope mirrors drivers_for: staff see all; hub agents see accounts
// touching their hubs; owners / fleet managers see their accounts; else self.
type driverScope struct {
	all      bool
	accounts []uuid.UUID
	self     *uuid.UUID
}

func scopeDrivers(ctx context.Context, q *db.Queries, p *reqctx.Principal) (driverScope, error) {
	if p.Can("accounts:read") || p.Can("accounts:manage") {
		return driverScope{all: true}, nil
	}
	hubs, err := scope.HubsFor(ctx, q, p)
	if err != nil {
		return driverScope{}, err
	}
	if !hubs.All {
		accts, err := scope.AccountsTouching(ctx, q, hubs.IDs)
		return driverScope{accounts: accts}, err
	}
	uid, _ := uuid.Parse(p.UserID)
	if p.Can("accounts:write_own") || p.Can("vehicles:manage") {
		own, err := q.OwnedAccountIDs(ctx, uid)
		if err != nil {
			return driverScope{}, err
		}
		if d, err := q.DriverByUser(ctx, uid); err == nil {
			own = append(own, d.AccountID)
		} else if !database.IsNoRows(err) {
			return driverScope{}, err
		}
		if len(own) > 0 {
			return driverScope{accounts: own}, nil
		}
	}
	return driverScope{self: &uid}, nil
}

func (s driverScope) allows(d db.GetDriverRowRow) bool {
	if s.all || (s.self != nil && *s.self == d.UserID) {
		return true
	}
	for _, a := range s.accounts {
		if a == d.AccountID {
			return true
		}
	}
	return false
}

func (h *DriverHandler) list(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	sc, err := scopeDrivers(ctx, h.q, reqctx.User(ctx))
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	qp := decode.Params(r)
	account, user, status := qp.UUID("account"), qp.UUID("user"), listq.Exact(r, "status")
	if err := qp.Err(); err != nil {
		respond.Error(w, r, err)
		return
	}
	page, size := paginate.Page(r), paginate.Size(r)
	f := db.CountDriversParams{AllRows: sc.all, AccountIds: sc.accounts, OnlyUser: sc.self,
		Account: account, Status: status, UserID: user, Q: listq.Search(r)}
	total, err := h.q.CountDrivers(ctx, f)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows, err := h.q.ListDrivers(ctx, db.ListDriversParams{AllRows: f.AllRows, AccountIds: f.AccountIds,
		OnlyUser: f.OnlyUser, Account: f.Account, Status: f.Status, UserID: f.UserID, Q: f.Q,
		Lim: int32(size), Off: int32(paginate.Offset(page, size))})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]DriverDTO, len(rows))
	for i, d := range rows {
		out[i] = DriverDTO{ID: d.ID.String(), User: d.UserID.String(), Account: d.AccountID.String(),
			Phone: d.Phone, FirstName: d.FirstName, LastName: d.LastName, LicenseNumber: d.LicenseNumber,
			Status: d.Status, DailySwapLimit: d.DailySwapLimit, DailySpendKoboLimit: d.DailySpendKoboLimit}
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

// object loads a driver in scope (404) and applies HasCapabilityOrReadOwn's
// object rule: staff readers, or the owner of the driver's account (403).
func (h *DriverHandler) object(r *http.Request) (db.GetDriverRowRow, error) {
	ctx := r.Context()
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.GetDriverRowRow{}, apperr.NotFound("Not found.")
	}
	sc, err := scopeDrivers(ctx, h.q, reqctx.User(ctx))
	if err != nil {
		return db.GetDriverRowRow{}, err
	}
	d, err := h.q.GetDriverRow(ctx, id)
	if database.IsNoRows(err) || (err == nil && !sc.allows(d)) {
		return d, apperr.NotFound("No Driver matches the given query.")
	}
	if err != nil {
		return d, err
	}
	p := reqctx.User(ctx)
	if p.Can("accounts:manage") || p.Can("accounts:read") || d.OwnerUserID.String() == p.UserID {
		return d, nil
	}
	return d, apperr.Forbidden("")
}

func (h *DriverHandler) get(w http.ResponseWriter, r *http.Request) {
	d, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, driverDTO(d))
}
