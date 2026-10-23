package operations

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
)

// CountDTO is InventoryCountSerializer.
type CountDTO struct {
	ID        string          `json:"id"`
	Hub       string          `json:"hub"`
	HubCode   string          `json:"hub_code"`
	Shift     *string         `json:"shift"`
	Counted   json.RawMessage `json:"counted"`
	Expected  json.RawMessage `json:"expected"`
	Variance  json.RawMessage `json:"variance"`
	SignedBy  *string         `json:"signed_by"`
	Note      string          `json:"note"`
	CreatedAt jsontime.Field  `json:"created_at"`
}

func countDTO(c db.InventoryCountByIDRow) CountDTO {
	return CountDTO{ID: c.ID.String(), Hub: c.HubID.String(), HubCode: c.HubCode, Shift: idStr(c.ShiftID),
		Counted: c.Counted, Expected: c.Expected, Variance: c.Variance, SignedBy: idStr(c.SignedByID), Note: c.Note,
		CreatedAt: jsontime.Field(c.CreatedAt)}
}

func (h *Handler) counts(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var hub *uuid.UUID
	if raw := r.URL.Query().Get("hub"); raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			respond.Error(w, r, apperr.Validation(apperr.Details{"non_field_errors": []string{"“" + raw + "” is not a valid UUID."}}))
			return
		}
		hub = &id
	}
	total, err := h.q.CountInventoryCounts(ctx, hub)
	page, size := paginate.Page(r), paginate.Size(r)
	var rows []db.ListInventoryCountsRow
	if err == nil {
		rows, err = h.q.ListInventoryCounts(ctx, db.ListInventoryCountsParams{Hub: hub, Lim: int32(size),
			Off: int32(paginate.Offset(page, size))})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]CountDTO, len(rows))
	for i, c := range rows {
		out[i] = countDTO(db.InventoryCountByIDRow(c))
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

type countReq struct {
	HubID   uuid.UUID       `json:"hub_id" validate:"required"`
	Counted json.RawMessage `json:"counted"`
	ShiftID *uuid.UUID      `json:"shift_id"`
	Note    string          `json:"note"`
}

// counted is DictField(child=CharField()): an object of strings (numbers are
// stringified; null / nested values fail per key).
func parseCounted(raw json.RawMessage, present bool) (map[string]string, any) {
	if !present {
		return nil, []string{"This field is required."}
	}
	var v any
	_ = json.Unmarshal(raw, &v)
	if v == nil {
		return nil, []string{"This field may not be null."}
	}
	obj, ok := v.(map[string]any)
	if !ok {
		return nil, []string{fmt.Sprintf("Expected a dictionary of items but got type \"%s\".", pyType(v))}
	}
	out, bad := map[string]string{}, map[string]any{}
	for k, x := range obj {
		switch t := x.(type) {
		case string:
			if strings.TrimSpace(t) == "" {
				bad[k] = []string{"This field may not be blank."}
			}
			out[k] = strings.TrimSpace(t)
		case float64:
			out[k] = fmt.Sprint(t)
		case nil:
			bad[k] = []string{"This field may not be null."}
		default:
			bad[k] = []string{"Not a valid string."}
		}
	}
	if len(bad) > 0 {
		return nil, bad
	}
	return out, nil
}

func sortedDiff(a, b map[string]string) []string {
	out := []string{}
	for k := range a {
		if _, ok := b[k]; !ok {
			out = append(out, k)
		}
	}
	sort.Strings(out)
	return out
}

// createCount is submit_inventory_count: physical count vs slots.
func (h *Handler) createCount(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	keys := decode.Keys(r)
	var b countReq
	err := decode.JSON(r, &b)
	d := apperr.Details{}
	if e, ok := apperr.As(err); ok && e.Code == "VALIDATION_ERROR" {
		d, err = e.Details, nil
	}
	counted, cerr := parseCounted(b.Counted, keys["counted"])
	if cerr != nil && d["counted"] == nil {
		d["counted"] = cerr
	}
	if err == nil && len(d) > 0 {
		err = apperr.Validation(d)
	}
	var hub db.MobilityHub
	if err == nil {
		if hub, err = h.q.HubRow(ctx, b.HubID); database.IsNoRows(err) {
			err = apperr.New("NOT_FOUND", "Hub not found.").WithStatus(http.StatusNotFound)
		}
	}
	var shift *uuid.UUID
	if err == nil && b.ShiftID != nil {
		if ok, serr := h.q.ShiftExists(ctx, *b.ShiftID); serr != nil {
			err = serr
		} else if ok {
			shift = b.ShiftID
		}
	}
	id := ids.New()
	if err == nil {
		uid, _ := uuid.Parse(reqctx.User(ctx).UserID)
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			slots, err := q.HubSlotStates(ctx, hub.ID)
			if err != nil {
				return err
			}
			expected, cn := map[string]string{}, map[string]string{}
			for _, s := range slots {
				expected[strings.ToUpper(s.Serial)] = strings.ToUpper(s.State)
			}
			for k, v := range counted {
				cn[strings.ToUpper(k)] = strings.ToUpper(v)
			}
			mismatch := []string{}
			for k, v := range expected {
				if c, ok := cn[k]; ok && c != v {
					mismatch = append(mismatch, k)
				}
			}
			sort.Strings(mismatch)
			missing, unexpected := sortedDiff(expected, cn), sortedDiff(cn, expected)
			variance := map[string]any{"missing": missing, "unexpected": unexpected, "state_mismatch": mismatch}
			cj, _ := json.Marshal(cn)
			ej, _ := json.Marshal(expected)
			vj, _ := json.Marshal(variance)
			if err := q.InsertInventoryCount(ctx, db.InsertInventoryCountParams{ID: id, Counted: cj, Expected: ej,
				Variance: vj, Note: truncate(b.Note, 255), HubID: hub.ID, ShiftID: shift, SignedByID: &uid}); err != nil {
				return err
			}
			if err := events.Emit(ctx, q, events.Event{Action: "inventory_count.submitted",
				SubjectType: "inventory_count", SubjectID: id.String(), SubjectLabel: hub.Code, Actor: who,
				After: events.Map{"variance": variance, "hub_id": hub.ID.String()}}); err != nil {
				return err
			}
			if len(missing)+len(unexpected)+len(mismatch) == 0 {
				return nil
			}
			return OpenAlert(ctx, q, "LOW_INVENTORY", fmt.Sprintf(
				"Inventory variance at %s: missing=%d unexpected=%d mismatch=%d", hub.Code, len(missing),
				len(unexpected), len(mismatch)), "WARNING", &hub.ID)
		})
	}
	var row db.InventoryCountByIDRow
	if err == nil {
		row, err = h.q.InventoryCountByID(ctx, id)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.JSON(w, http.StatusCreated, countDTO(row))
}
