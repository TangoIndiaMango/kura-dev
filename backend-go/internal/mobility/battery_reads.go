package mobility

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/export"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

// stats is battery_stats.
func (h *BatteryHandler) stats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	all, hubs, err := h.scope(ctx)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	counts, err := h.q.BatteryStatusCounts(ctx, db.BatteryStatusCountsParams{AllRows: all, ScopeIds: hubs})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	st, total := map[string]int32{}, int32(0)
	for _, c := range counts {
		st[c.Status], total = c.N, total+c.N
	}
	types, err := h.q.BatteryTypeCounts(ctx, db.BatteryTypeCountsParams{AllRows: all, ScopeIds: hubs})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	type byType struct {
		Name      string `json:"name"`
		Count     int32  `json:"count"`
		Available int32  `json:"available"`
	}
	bt := make([]byType, len(types))
	for i, t := range types {
		bt[i] = byType{t.Name, t.N, t.Available}
	}
	respond.OK(w, map[string]any{
		"totals": map[string]int32{"all": total, "available": st["AVAILABLE"], "charging": st["CHARGING"],
			"issued": st["ISSUED"], "reserved": st["RESERVED"], "faulted": st["FAULTED"], "retired": st["RETIRED"]},
		"by_type": bt,
	})
}

// types is the unpaginated battery type catalogue.
func (h *BatteryHandler) types(w http.ResponseWriter, r *http.Request) {
	rows, err := h.q.AllBatteryTypes(r.Context())
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]BatteryTypeDTO, len(rows))
	for i, t := range rows {
		out[i] = batteryTypeDTO(t)
	}
	respond.OK(w, out)
}

type batteryEventDTO struct {
	ID                string          `json:"id"`
	Event             string          `json:"event"`
	FromCustodianType string          `json:"from_custodian_type"`
	FromCustodianID   *string         `json:"from_custodian_id"`
	ToCustodianType   string          `json:"to_custodian_type"`
	ToCustodianID     *string         `json:"to_custodian_id"`
	HubID             *string         `json:"hub_id"`
	HubCode           *string         `json:"hub_code"`
	SwapID            *string         `json:"swap_id"`
	ChargePct         *int32          `json:"charge_pct"`
	Meta              json.RawMessage `json:"meta"`
	OccurredAt        jsontime.Field  `json:"occurred_at"`
	RecordedAt        jsontime.Field  `json:"recorded_at"`
	Source            string          `json:"source"`
	ActorLabel        string          `json:"actor_label"`
	PrevHash          string          `json:"prev_hash"`
	RowHash           string          `json:"row_hash"`
}

// events is the custody trail, cursor-paginated newest first.
func (h *BatteryHandler) events(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	b, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	at, err := paginate.Cursor(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	size := paginate.Size(r)
	p := db.BatteryEventsPageParams{BatteryID: b.ID, Lim: int32(size + 1)}
	if at != nil {
		p.AfterAt, p.Back = &at.CreatedAt, at.Back
		p.AfterID, _ = uuid.Parse(at.ID)
	}
	rows, err := h.q.BatteryEventsPage(ctx, p)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows = paginate.Display(rows, size, p.Back)
	out := make([]batteryEventDTO, len(rows))
	for i, e := range rows {
		label := "System"
		if e.ActorID != nil {
			label = firstOf(deref(e.ActorEmail), deref(e.ActorPhone), e.ActorID.String()[:8])
		}
		out[i] = batteryEventDTO{ID: e.ID.String(), Event: e.Event, FromCustodianType: e.FromCustodianType,
			FromCustodianID: idPtr(e.FromCustodianID), ToCustodianType: e.ToCustodianType,
			ToCustodianID: idPtr(e.ToCustodianID), HubID: idPtr(e.HubID), HubCode: e.HubCode,
			SwapID: idPtr(e.SwapID), ChargePct: e.ChargePct, Meta: json.RawMessage(e.Meta),
			OccurredAt: jsontime.Field(e.OccurredAt), RecordedAt: jsontime.Field(e.RecordedAt), Source: e.Source,
			ActorLabel: label, PrevHash: e.PrevHash, RowHash: e.RowHash}
	}
	respond.OK(w, paginate.BuildCursorPage(r, out, size, at, func(e batteryEventDTO) paginate.Key {
		return paginate.Key{CreatedAt: time.Time(e.OccurredAt), ID: e.ID}
	}))
}

func (h *BatteryHandler) export(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	f, err := h.filters(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	f.Lim = export.RowCap + 1
	ids, err := h.q.ListBatteryIDs(ctx, f)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows, err := h.rows(ctx, ids)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	t := export.Table{Stem: "batteries", Title: "Kura batteries", Headers: []string{"id", "serial", "battery_type",
		"status", "charge_pct", "health_pct", "cycle_count", "hub_code", "hub_name", "created_at"}}
	for _, b := range rows {
		t.Rows = append(t.Rows, []string{b.ID.String(), b.Serial, b.TypeName, b.Status, itoa(b.ChargePct),
			itoa(b.HealthPct), itoa(b.CycleCount), deref(b.HubCode), deref(b.HubName), jsontime.FormatISO(b.CreatedAt)})
	}
	if err := export.Write(w, r.URL.Query().Get("export"), t); err != nil {
		respond.Error(w, r, err)
	}
}

func deref(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}
