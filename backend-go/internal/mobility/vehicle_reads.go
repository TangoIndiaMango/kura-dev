package mobility

import (
	"context"
	"net/http"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/export"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

// load reads one vehicle in scope (404 otherwise).
func (h *VehicleHandler) load(ctx context.Context, id uuid.UUID) (db.VehicleRowsRow, error) {
	rows, err := h.q.VehicleRows(ctx, []uuid.UUID{id})
	if err != nil {
		return db.VehicleRowsRow{}, err
	}
	nf := apperr.NotFound("No Vehicle matches the given query.")
	if len(rows) == 0 {
		return db.VehicleRowsRow{}, nf
	}
	sc, err := h.scope(ctx)
	if err != nil {
		return db.VehicleRowsRow{}, err
	}
	ok, err := sc.allows(ctx, h.q, rows[0])
	if err != nil {
		return db.VehicleRowsRow{}, err
	}
	if !ok {
		return db.VehicleRowsRow{}, nf
	}
	return rows[0], nil
}

// object is get_object: scope (404) then HasCapabilityOrReadOwn's object
// rule — staff readers or the owner of the vehicle's account (403).
func (h *VehicleHandler) object(r *http.Request) (db.VehicleRowsRow, error) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.VehicleRowsRow{}, apperr.NotFound("Not found.")
	}
	v, err := h.load(r.Context(), id)
	if err != nil {
		return v, err
	}
	p := reqctx.User(r.Context())
	if p.Can("accounts:manage") || p.Can("accounts:read") || v.OwnerUserID.String() == p.UserID {
		return v, nil
	}
	return v, apperr.Forbidden("")
}

func (h *VehicleHandler) detail(w http.ResponseWriter, r *http.Request, id uuid.UUID) {
	v, err := h.load(r.Context(), id)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out, err := h.dtos(r.Context(), []db.VehicleRowsRow{v})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, out[0])
}

func (h *VehicleHandler) get(w http.ResponseWriter, r *http.Request) {
	v, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.detail(w, r, v.ID)
}

// bareForbidden is `Response(status=403)`: no body at all.
func bareForbidden(w http.ResponseWriter) { w.WriteHeader(http.StatusForbidden) }

// stats is vehicle_stats (network-wide; vehicles:read checked in the view).
func (h *VehicleHandler) stats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if !reqctx.User(ctx).Can("vehicles:read") {
		bareForbidden(w)
		return
	}
	counts, err := h.q.VehicleStatusCounts(ctx)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	st, total := map[string]int32{}, int32(0)
	for _, c := range counts {
		st[c.Status], total = c.N, total+c.N
	}
	types, err := h.q.VehicleTypeCounts(ctx)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	type byType struct {
		VehicleType string `json:"vehicle_type"`
		Count       int32  `json:"count"`
	}
	bt := make([]byType, len(types))
	for i, t := range types {
		bt[i] = byType{firstOf(t.VehicleType, "—"), t.N}
	}
	respond.OK(w, map[string]any{"totals": map[string]int32{"all": total, "active": st["ACTIVE"],
		"pending": st["PENDING"], "suspended": st["SUSPENDED"]}, "by_type": bt})
}

func (h *VehicleHandler) export(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if !reqctx.User(ctx).Can("vehicles:read") {
		bareForbidden(w)
		return
	}
	f, err := h.filters(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	f.Lim = export.RowCap + 1
	ids, err := h.q.ListVehicleIDs(ctx, f)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows, err := h.rows(ctx, ids)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	t := export.Table{Stem: "vehicles", Title: "Kura vehicles", Headers: []string{"id", "registration_plate", "make",
		"model", "vehicle_type", "owner_kura_id", "status", "created_at"}}
	for _, v := range rows {
		t.Rows = append(t.Rows, []string{v.ID.String(), v.RegistrationPlate, v.Make, v.Model, v.VehicleType,
			v.OwnerKuraID, v.Status, jsontime.FormatISO(v.CreatedAt)})
	}
	if err := export.Write(w, r.URL.Query().Get("export"), t); err != nil {
		respond.Error(w, r, err)
	}
}
