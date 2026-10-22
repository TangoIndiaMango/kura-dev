package accounts

import (
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/export"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

// StaffHandler serves /api/v1/users (StaffUserViewSet).
type StaffHandler struct{ svc *StaffService }

func NewStaffHandler(svc *StaffService) *StaffHandler { return &StaffHandler{svc: svc} }

// lagosMidnight is how django-filters turns a date into a datetime bound.
func lagosMidnight(d *time.Time) *time.Time {
	if d == nil {
		return nil
	}
	t := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, lagos)
	return &t
}

// staffFilters reads StaffUserFilter params.
func staffFilters(r *http.Request) (db.CountStaffUsersParams, error) {
	qp := decode.Params(r)
	q := listq.Search(r)
	if q == nil { // the FilterSet also accepts ?search=
		if v := strings.TrimSpace(r.URL.Query().Get("search")); v != "" {
			esc := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(v)
			q = &esc
		}
	}
	var status *string
	if v := strings.ToUpper(qp.String("status")); v != "" {
		status = &v
	}
	p := db.CountStaffUsersParams{Q: q, Role: listq.Exact(r, "role"), Hub: listq.Exact(r, "hub"),
		IsActive: qp.Bool("is_active"), Status: status,
		CreatedFrom: lagosMidnight(qp.Date("start_date")), CreatedTo: lagosMidnight(qp.Date("end_date"))}
	return p, qp.Err()
}

func (h *StaffHandler) list(w http.ResponseWriter, r *http.Request) {
	f, err := staffFilters(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	page, size := paginate.Page(r), paginate.Size(r)
	total, err := h.svc.q.CountStaffUsers(r.Context(), f)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	idsOut, err := h.svc.q.ListStaffUsers(r.Context(), listParams(f, size, paginate.Offset(page, size)))
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]UserDTO, 0, len(idsOut))
	for _, id := range idsOut {
		u, err := loadUserDTO(r.Context(), h.svc.q, id)
		if err != nil {
			respond.Error(w, r, err)
			return
		}
		out = append(out, u)
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

func listParams(f db.CountStaffUsersParams, lim, off int) db.ListStaffUsersParams {
	return db.ListStaffUsersParams{Q: f.Q, Role: f.Role, Hub: f.Hub, IsActive: f.IsActive,
		Status: f.Status, CreatedFrom: f.CreatedFrom, CreatedTo: f.CreatedTo, Lim: int32(lim), Off: int32(off)}
}

// stats uses inclusive Lagos days (accounts.selectors.stats._parse_bound).
func (h *StaffHandler) stats(w http.ResponseWriter, r *http.Request) {
	qp := decode.Params(r)
	from := lagosMidnight(qp.Date("start_date"))
	var to *time.Time
	if d := lagosMidnight(qp.Date("end_date")); d != nil {
		end := d.Add(24*time.Hour - time.Microsecond)
		to = &end
	}
	// Django ignores unparseable bounds here (parse_date → None).
	t, err := h.svc.q.StaffStats(r.Context(), db.StaffStatsParams{CreatedFrom: from, CreatedTo: to})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, map[string]any{"totals": map[string]int32{"all": t.AllUsers, "active": t.Active,
		"invited": t.Invited, "suspended": t.Suspended, "roles": t.Roles}})
}

func (h *StaffHandler) export(w http.ResponseWriter, r *http.Request) {
	f, err := staffFilters(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	idsOut, err := h.svc.q.ListStaffUsers(r.Context(), listParams(f, export.RowCap+1, 0))
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	t := export.Table{Stem: "users", Title: "Kura staff users", Headers: []string{"user_id", "name",
		"email", "phone", "role", "status", "last_login", "created_at"}}
	for _, id := range idsOut {
		u, err := h.svc.q.GetUserByID(r.Context(), id)
		if err != nil {
			respond.Error(w, r, err)
			return
		}
		status := "ACTIVE"
		if !u.IsActive {
			status = "SUSPENDED"
		} else if u.LastLogin == nil {
			status = "INVITED"
		}
		role := u.Role
		if u.AssignedRoleName != nil {
			role = *u.AssignedRoleName
		}
		last := ""
		if u.LastLogin != nil {
			last = jsontime.FormatISO(*u.LastLogin)
		}
		name := firstNonEmpty(strings.TrimSpace(u.FirstName+" "+u.LastName), str(u.Email), str(u.Phone))
		t.Rows = append(t.Rows, []string{firstNonEmpty(str(u.PublicID), u.ID.String()), name,
			str(u.Email), str(u.Phone), role, status, last, jsontime.FormatISO(u.CreatedAt)})
	}
	if err := export.Write(w, r.URL.Query().Get("export"), t); err != nil {
		respond.Error(w, r, err)
	}
}

// staffID resolves {id} within the staff directory (404 otherwise).
func (h *StaffHandler) staffID(r *http.Request) (uuid.UUID, error) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return uuid.Nil, apperr.NotFound("Not found.")
	}
	u, err := h.svc.q.GetUserByID(r.Context(), id)
	if err != nil || !u.IsStaff {
		return uuid.Nil, apperr.NotFound("No User matches the given query.")
	}
	return id, nil
}

// frontendURL is _extract_frontend_url (Origin, else Referer).
func frontendURL(r *http.Request) string {
	for _, raw := range []string{r.Header.Get("Origin"), r.Header.Get("Referer")} {
		if u, err := url.Parse(raw); err == nil && u.Scheme != "" && u.Host != "" {
			return u.Scheme + "://" + u.Host
		}
	}
	return ""
}
