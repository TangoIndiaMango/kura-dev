package mobility

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
)

const hubStatuses = "ONLINE OFFLINE MAINTENANCE CLOSED"

// hubCreateReq is HubWriteSerializer (full).
type hubCreateReq struct {
	Code      *string         `json:"code" validate:"omitempty,notblank,max=30"`
	Name      string          `json:"name" validate:"required,max=150"`
	Address   string          `json:"address" validate:"required,max=255"`
	Lat       *float64        `json:"lat"`
	Lng       *float64        `json:"lng"`
	SlotCount *int            `json:"slot_count" validate:"omitempty,min=1,max=128"`
	Solar     *decode.Decimal `json:"solar_capacity_kw" decimal:"5,2"`
	Status    *string         `json:"status" validate:"omitempty,oneof=ONLINE OFFLINE MAINTENANCE CLOSED"`
	Timezone  *string         `json:"timezone" validate:"omitempty,notblank"`
	Hours     json.RawMessage `json:"operating_hours"`
}

// hubPatchReq is HubWriteSerializer(partial=True): nothing is required.
type hubPatchReq struct {
	Name      *string         `json:"name" validate:"omitempty,notblank,max=150"`
	Address   *string         `json:"address" validate:"omitempty,notblank,max=255"`
	Lat       *float64        `json:"lat"`
	Lng       *float64        `json:"lng"`
	SlotCount *int            `json:"slot_count" validate:"omitempty,min=1,max=128"`
	Solar     *decode.Decimal `json:"solar_capacity_kw" decimal:"5,2"`
	Status    *string         `json:"status" validate:"omitempty,oneof=ONLINE OFFLINE MAINTENANCE CLOSED"`
	Timezone  *string         `json:"timezone" validate:"omitempty,notblank"`
	Hours     json.RawMessage `json:"operating_hours"`
	Code      *string         `json:"code" validate:"omitempty,notblank,max=30"` // accepted, never applied
}

// hubState is the editable hub plus _hub_snapshot for the audit trail.
type hubState struct {
	Code, Name, Address, Status, Solar, Timezone string
	Lat, Lng                                     float64
	SlotCount                                    int32
	Hours                                        json.RawMessage
}

func (s hubState) snapshot() events.Map {
	var hours any = map[string]any{}
	if len(s.Hours) > 0 {
		var v any
		if json.Unmarshal(s.Hours, &v) == nil && truthy(v) {
			hours = v
		}
	}
	return events.Map{"code": s.Code, "name": s.Name, "address": s.Address, "status": s.Status,
		"slot_count": s.SlotCount, "solar_capacity_kw": s.Solar, "lat": s.Lat, "lng": s.Lng,
		"timezone": s.Timezone, "operating_hours": hours}
}

// truthy is Python truthiness for decoded JSON (`x or {}`).
func truthy(v any) bool {
	switch x := v.(type) {
	case nil:
		return false
	case bool:
		return x
	case float64:
		return x != 0
	case string:
		return x != ""
	case []any:
		return len(x) > 0
	case map[string]any:
		return len(x) > 0
	}
	return true
}

func (h *HubHandler) create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b hubCreateReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	if b.Code == nil || strings.TrimSpace(*b.Code) == "" {
		respond.JSON(w, http.StatusBadRequest, map[string]string{"detail": "Hub code is required."})
		return
	}
	st := hubState{Code: strings.ToUpper(strings.TrimSpace(*b.Code)), Name: strings.TrimSpace(b.Name),
		Address: strings.TrimSpace(b.Address), Lat: 6.5173, Lng: 3.3734, SlotCount: 16, Solar: "12.50",
		Status: "ONLINE", Timezone: "Africa/Lagos", Hours: json.RawMessage("{}")}
	if b.Lat != nil {
		st.Lat = *b.Lat
	}
	if b.Lng != nil {
		st.Lng = *b.Lng
	}
	if b.SlotCount != nil {
		st.SlotCount = int32(*b.SlotCount)
	}
	if b.Solar != nil {
		st.Solar = b.Solar.Text
	}
	if b.Status != nil {
		st.Status = *b.Status
	}
	id := ids.New()
	err := database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		if taken, err := q.HubCodeExists(ctx, st.Code); err != nil {
			return err
		} else if taken {
			return apperr.New("CONFLICT", fmt.Sprintf("Hub code %s already exists.", st.Code))
		}
		if err := q.InsertHub(ctx, db.InsertHubParams{ID: id, Code: st.Code, Name: st.Name, Address: st.Address,
			Lat: st.Lat, Lng: st.Lng, SlotCount: st.SlotCount, Solar: st.Solar, Status: st.Status}); err != nil {
			return err
		}
		if err := ensureSlots(ctx, q, id, st.SlotCount); err != nil {
			return err
		}
		who, err := actor.FromRequest(ctx, q)
		if err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "hub.created", SubjectType: "hub", SubjectID: id.String(),
			SubjectLabel: st.Code, Actor: who, After: st.snapshot()})
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	d, err := h.detail(ctx, id)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.Created(w, d)
}

// patch is HubService.update_hub (hub looked up before the body is read).
func (h *HubHandler) patch(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	hub, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	var b hubPatchReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	err = database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		cur, err := q.HubForUpdate(ctx, hub.ID)
		if err != nil {
			return err
		}
		st := hubState{Code: cur.Code, Name: cur.Name, Address: cur.Address, Status: cur.Status,
			Solar: cur.SolarCapacityKw, Timezone: cur.Timezone, Lat: cur.Lat, Lng: cur.Lng,
			SlotCount: cur.SlotCount, Hours: cur.OperatingHours}
		before := st.snapshot()
		applyHubPatch(&st, b)
		if b.SlotCount != nil && int32(*b.SlotCount) < cur.SlotCount {
			return apperr.New("VALIDATION_ERROR", "Reducing slot_count is not supported; retire slots via ops.")
		}
		if err := q.UpdateHub(ctx, db.UpdateHubParams{ID: hub.ID, Name: st.Name, Address: st.Address, Lat: st.Lat,
			Lng: st.Lng, SlotCount: st.SlotCount, Solar: st.Solar, Status: st.Status, Timezone: st.Timezone,
			OperatingHours: st.Hours}); err != nil {
			return err
		}
		if err := ensureSlots(ctx, q, hub.ID, st.SlotCount); err != nil {
			return err
		}
		who, err := actor.FromRequest(ctx, q)
		if err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "hub.updated", SubjectType: "hub", SubjectID: hub.ID.String(),
			SubjectLabel: st.Code, Actor: who, Before: before, After: st.snapshot()})
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	d, err := h.detail(ctx, hub.ID)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, d)
}

func applyHubPatch(st *hubState, b hubPatchReq) {
	if b.Name != nil {
		st.Name = strings.TrimSpace(*b.Name)
	}
	if b.Address != nil {
		st.Address = strings.TrimSpace(*b.Address)
	}
	if b.Lat != nil {
		st.Lat = *b.Lat
	}
	if b.Lng != nil {
		st.Lng = *b.Lng
	}
	if b.Solar != nil {
		st.Solar = b.Solar.Text
	}
	if b.Status != nil {
		st.Status = *b.Status
	}
	if b.SlotCount != nil {
		st.SlotCount = int32(*b.SlotCount)
	}
	if b.Timezone != nil {
		if st.Timezone = strings.TrimSpace(*b.Timezone); st.Timezone == "" {
			st.Timezone = "Africa/Lagos"
		}
	}
	if len(b.Hours) > 0 && string(b.Hours) != "null" {
		var v any
		if json.Unmarshal(b.Hours, &v) == nil && truthy(v) {
			st.Hours = b.Hours
		} else {
			st.Hours = json.RawMessage("{}")
		}
	}
}

// ensureSlots is HubService._ensure_slots: create missing slots 1..n as EMPTY.
func ensureSlots(ctx context.Context, q *db.Queries, hub uuid.UUID, n int32) error {
	have, err := q.HubSlotNumbers(ctx, hub)
	if err != nil {
		return err
	}
	exists := make(map[int32]bool, len(have))
	for _, s := range have {
		exists[s] = true
	}
	for i := int32(1); i <= n; i++ {
		if !exists[i] {
			if err := q.InsertHubSlot(ctx, db.InsertHubSlotParams{ID: ids.New(), SlotNo: i, HubID: hub}); err != nil {
				return err
			}
		}
	}
	return nil
}
