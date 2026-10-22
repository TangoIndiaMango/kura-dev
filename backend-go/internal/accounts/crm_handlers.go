package accounts

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/export"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/media"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/scope"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/spend"
)

// AccountHandler serves /api/v1/accounts (AccountViewSet).
type AccountHandler struct {
	pool   *pgxpool.Pool
	q      *db.Queries
	cdn    media.Cloudinary
	petrol spend.Petrol
}

func NewAccountHandler(pool *pgxpool.Pool, cdn media.Cloudinary, petrol spend.Petrol) *AccountHandler {
	return &AccountHandler{pool: pool, q: db.New(pool), cdn: cdn, petrol: petrol.WithDefaults()}
}

// accountFilters reads AccountFilter + ?q= + ?ordering= into list params,
// scoped like accounts_for (all / hub-touching ids / own).
func (h *AccountHandler) accountFilters(r *http.Request) (db.ListAccountIDsParams, error) {
	ctx := r.Context()
	sc, err := h.scope(ctx)
	if err != nil {
		return db.ListAccountIDsParams{}, err
	}
	f := db.ListAccountIDsParams{Ord: ordering(r.URL.Query().Get("ordering")), AllRows: sc.all,
		ScopeIds: sc.ids, Owner: sc.owner}
	qp := decode.Params(r)
	f.Q = listq.Search(r)
	if f.Q == nil { // the FilterSet also accepts ?search=
		if v := strings.TrimSpace(r.URL.Query().Get("search")); v != "" {
			esc := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(v)
			f.Q = &esc
		}
	}
	f.Status, f.KycStatus, f.Kind = listq.Exact(r, "status"), listq.Exact(r, "kyc_status"), listq.Exact(r, "kind")
	f.After, f.Before = qp.DateTime("created_after", lagos), qp.DateTime("created_before", lagos)
	f.CreatedFrom, f.CreatedTo = lagosMidnight(qp.Date("start_date")), lagosMidnight(qp.Date("end_date"))
	return f, qp.Err()
}

// accountScope is accounts_for: everything / accounts touching the caller's
// hubs / accounts the caller owns.
type accountScope struct {
	all   bool
	ids   []uuid.UUID
	owner *uuid.UUID
}

func (h *AccountHandler) scope(ctx context.Context) (accountScope, error) {
	p := reqctx.User(ctx)
	if p.Can("accounts:read") || p.Can("accounts:manage") {
		return accountScope{all: true}, nil
	}
	hubs, err := scope.HubsFor(ctx, h.q, p)
	if err != nil {
		return accountScope{}, err
	}
	if !hubs.All {
		ids, err := scope.AccountsTouching(ctx, h.q, hubs.IDs)
		return accountScope{ids: ids}, err
	}
	uid, _ := uuid.Parse(p.UserID)
	return accountScope{owner: &uid}, nil
}

func (s accountScope) allows(r db.CrmRowsRow) bool {
	if s.all || (s.owner != nil && *s.owner == r.OwnerUserID) {
		return true
	}
	for _, id := range s.ids {
		if id == r.ID {
			return true
		}
	}
	return false
}

// ordering is OrderingFilter over ordering_fields; the first valid term wins.
func ordering(raw string) string {
	for _, t := range strings.Split(raw, ",") {
		switch t = strings.TrimSpace(t); t {
		case "created_at", "-created_at", "display_name", "-display_name":
			return t
		}
	}
	return "-created_at"
}

func countParams(f db.ListAccountIDsParams) db.CountAccountsParams {
	return db.CountAccountsParams{AllRows: f.AllRows, ScopeIds: f.ScopeIds, Owner: f.Owner, Status: f.Status,
		KycStatus: f.KycStatus, Kind: f.Kind, CreatedFrom: f.CreatedFrom, CreatedTo: f.CreatedTo,
		After: f.After, Before: f.Before, Q: f.Q}
}

func (h *AccountHandler) list(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	f, err := h.accountFilters(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	page, size := paginate.Page(r), paginate.Size(r)
	total, err := h.q.CountAccounts(ctx, countParams(f))
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	f.Lim, f.Off = int32(size), int32(paginate.Offset(page, size))
	ids, err := h.q.ListAccountIDs(ctx, f)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows, err := crmRows(ctx, h.q, ids)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	var body any
	if isCRMStaff(reqctx.User(ctx)) {
		out := make([]CrmListDTO, len(rows))
		for i, row := range rows {
			out[i] = crmListDTO(row, h.cdn)
		}
		body, err = paginate.BuildNumberPage(r, out, int(total), page, size)
	} else {
		out := make([]AccountDTO, len(rows))
		for i, row := range rows {
			out[i] = plainAccount(row)
		}
		body, err = paginate.BuildNumberPage(r, out, int(total), page, size)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

// object is get_object: in scope (404) then HasCapabilityOrReadOwn's object
// rule — staff readers or the account owner (403).
func (h *AccountHandler) object(r *http.Request) (db.CrmRowsRow, error) {
	ctx := r.Context()
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.CrmRowsRow{}, apperr.NotFound("Not found.")
	}
	f, err := h.scope(ctx)
	if err != nil {
		return db.CrmRowsRow{}, err
	}
	rows, err := h.q.CrmRows(ctx, []uuid.UUID{id})
	if err != nil {
		return db.CrmRowsRow{}, err
	}
	if len(rows) == 0 || !f.allows(rows[0]) {
		return db.CrmRowsRow{}, apperr.NotFound("No Account matches the given query.")
	}
	p := reqctx.User(ctx)
	if p.Can("accounts:manage") || p.Can("accounts:read") || rows[0].OwnerUserID.String() == p.UserID {
		return rows[0], nil
	}
	return rows[0], apperr.Forbidden("")
}

func (h *AccountHandler) get(w http.ResponseWriter, r *http.Request) {
	row, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	if !isCRMStaff(reqctx.User(r.Context())) {
		respond.OK(w, plainAccount(row))
		return
	}
	d, err := crmDetail(r.Context(), h.q, row, h.cdn)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, d)
}

func (h *AccountHandler) kyc(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	row, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	acct, err := h.q.AccountByID(ctx, row.ID)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	var photoID *uuid.UUID
	d, err := h.q.FirstDriverForAccount(ctx, acct.ID)
	hasDriver := err == nil
	if hasDriver {
		photoID = d.PhotoID
	} else if !database.IsNoRows(err) {
		respond.Error(w, r, err)
		return
	}
	k, err := buildKYC(ctx, h.q, h.cdn, acct, photoID, hasDriver)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, k)
}

func (h *AccountHandler) export(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	f, err := h.accountFilters(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	f.Lim = export.RowCap + 1
	ids, err := h.q.ListAccountIDs(ctx, f)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows, err := crmRows(ctx, h.q, ids)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	t := export.Table{Stem: "operators", Title: "Kura operators", Headers: []string{"id", "kura_id", "name",
		"phone", "email", "status", "kyc_status", "kind", "registration_channel", "created_at"}}
	for _, a := range rows {
		t.Rows = append(t.Rows, []string{a.ID.String(), a.KuraID, a.DisplayName, str(a.Phone), str(a.Email),
			a.Status, a.KycStatus, a.Kind, a.RegistrationChannel, jsontime.FormatISO(a.CreatedAt)})
	}
	if err := export.Write(w, r.URL.Query().Get("export"), t); err != nil {
		respond.Error(w, r, err)
	}
}
