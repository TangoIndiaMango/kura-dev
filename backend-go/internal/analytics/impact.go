package analytics

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
)

// Disclaimer is the impact estimate caveat (analytics.services.impact).
const Disclaimer = "Estimate from swap energy vs configured petrol price — not a bank balance."

// Snapshot is monthly_snapshot: the period's metric row (zeros when absent)
// plus the last six months.
func Snapshot(r *http.Request, q *db.Queries, period string) (map[string]any, error) {
	period = strings.TrimSpace(period)
	if period == "" {
		period = time.Now().In(lagos).Format("2006-01")
	}
	series, err := q.ImpactSeries(r.Context())
	if err != nil {
		return nil, err
	}
	points := make([]map[string]any, 0, len(series))
	for i := len(series) - 1; i >= 0; i-- {
		s := series[i]
		label := s.Period
		if len(s.Period) >= 7 {
			label = s.Period[5:]
		}
		points = append(points, map[string]any{"period": s.Period, "label": label, "swaps": s.Swaps,
			"co2_t": s.Co2Kg / 1000.0, "fuel_savings_kobo": s.FuelSavingsKobo})
	}
	row, err := q.ImpactMetric(r.Context(), period)
	if database.IsNoRows(err) {
		return map[string]any{"period": period, "operators_served": 0, "swaps": 0, "fuel_savings_kobo": 0,
			"engines_replaced": 0, "co2_kg": "0.000", "inputs": map[string]any{}, "disclaimer": Disclaimer,
			"series": points}, nil
	}
	if err != nil {
		return nil, err
	}
	inputs := json.RawMessage(row.Inputs)
	if len(inputs) == 0 || string(inputs) == "null" {
		inputs = json.RawMessage("{}")
	}
	return map[string]any{"period": row.Period, "operators_served": row.OperatorsServed, "swaps": row.Swaps,
		"fuel_savings_kobo": row.FuelSavingsKobo, "engines_replaced": row.EnginesReplaced, "co2_kg": row.Co2Kg,
		"inputs": inputs, "disclaimer": Disclaimer, "series": points}, nil
}

func (h *handler) impact(w http.ResponseWriter, r *http.Request) {
	out, err := Snapshot(r, h.q, r.URL.Query().Get("period"))
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, out)
}

// cooperative is cooperative_analytics_payload.
func (h *handler) cooperativePayload(r *http.Request, c db.AccountsCooperative) (map[string]any, error) {
	ctx := r.Context()
	members, err := h.q.CooperativeMembers(ctx, &c.ID)
	if err != nil {
		return nil, err
	}
	ids := make([]uuid.UUID, len(members))
	list := make([]map[string]any, 0, min(len(members), 200))
	for i, m := range members {
		ids[i] = m.ID
		if i < 200 {
			list = append(list, map[string]any{"account_id": m.ID.String(), "kura_id": m.KuraID,
				"display_name": m.DisplayName, "status": m.Status, "phone": m.Phone})
		}
	}
	fleet, err := h.q.CooperativeFleet(ctx, ids)
	if err != nil {
		return nil, err
	}
	savings, note := int64(0), "No member swaps yet."
	if len(ids) > 0 {
		p := h.petrol.WithDefaults()
		savings = p.FuelSavedKobo(fleet.Swaps)
		note = fmt.Sprintf("Estimate vs petrol · %d swaps · %s L × ₦%d/L · not a guarantee", fleet.Swaps,
			strconv.FormatFloat(p.LitresPerSwap, 'g', 6, 64), p.KoboPerLitre/100)
	}
	var chair any
	if c.ChairmanUserID != nil {
		chair = c.ChairmanUserID.String()
	}
	return map[string]any{"id": c.ID.String(), "name": c.Name, "region": c.Region, "status": c.Status,
		"chairman_user_id": chair,
		"aggregates": map[string]any{"members": len(members), "active_vehicles": fleet.Vehicles,
			"unreturned_batteries": fleet.Unreturned, "savings_kobo": savings, "savings_note": note},
		"members": list}, nil
}

func (h *handler) respondCooperative(w http.ResponseWriter, r *http.Request, c db.AccountsCooperative) {
	p := reqctx.User(r.Context())
	if !(p.Can("cooperatives:manage") || p.Can("accounts:manage")) &&
		(c.ChairmanUserID == nil || c.ChairmanUserID.String() != p.UserID) {
		respond.Error(w, r, apperr.Forbidden("You can only view your own cooperative."))
		return
	}
	out, err := h.cooperativePayload(r, c)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, out)
}

func (h *handler) cooperative(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, r, apperr.NotFound("Not found."))
		return
	}
	c, err := h.q.CooperativeByID(r.Context(), id)
	if database.IsNoRows(err) {
		err = apperr.NotFound("Cooperative not found.")
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondCooperative(w, r, c)
}

// myCooperative is MyCooperativeView: the caller's chaired cooperative, or
// the first one for cooperative / account managers.
func (h *handler) myCooperative(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p := reqctx.User(ctx)
	uid, _ := uuid.Parse(p.UserID)
	c, err := h.q.CooperativeForChairman(ctx, &uid)
	if database.IsNoRows(err) && (p.Can("cooperatives:manage") || p.Can("accounts:manage")) {
		c, err = h.q.FirstCooperative(ctx)
	}
	if database.IsNoRows(err) {
		err = apperr.NotFound("No cooperative linked to this user.")
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondCooperative(w, r, c)
}
