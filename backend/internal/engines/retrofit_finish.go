package engines

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
)

func (h *handler) installHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var in struct {
		EBoarder *uuid.UUID `json:"eboarder_id"`
		Serial   *string    `json:"eboarder_serial" validate:"omitempty,max=64"`
	}
	obj, errs, err := parse(r, &in)
	var photos []string
	if err == nil {
		if v, ok := obj["photo_asset_ids"]; ok {
			if list, e := strList(v, 0, 255); e != nil {
				errs["photo_asset_ids"] = e
			} else {
				photos = list
			}
		}
		if v, ok := obj["eboarder_id"]; ok && isNull(v) {
			errs["eboarder_id"] = []string{"This field may not be null."}
		}
		if len(errs) == 0 && in.EBoarder == nil && trimmed(in.Serial) == "" {
			errs["non_field_errors"] = []string{"eboarder_id or eboarder_serial is required."}
		}
		if len(errs) > 0 {
			err = apperr.Validation(errs)
		}
	}
	var id uuid.UUID
	if err == nil {
		id, err = h.retrofit(r)
	}
	if err == nil {
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			return install(ctx, q, who, id, in.EBoarder, trimmed(in.Serial), photos)
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondRetrofit(w, r, http.StatusOK, id)
}

// boolValue is DRF BooleanField.to_internal_value.
func boolValue(v any) (bool, bool) {
	switch x := v.(type) {
	case bool:
		return x, true
	case float64:
		if x == 1 || x == 0 {
			return x == 1, true
		}
	case string:
		switch strings.ToLower(strings.TrimSpace(x)) {
		case "t", "y", "yes", "true", "on", "1":
			return true, true
		case "f", "n", "no", "false", "off", "0":
			return false, true
		}
	}
	return false, false
}

// checklistHandler is RetrofitService.checklist: all six pass → CHECKED,
// any fail → FAILED with a reason.
func (h *handler) checklistHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var in struct {
		Reason *string `json:"failure_reason" validate:"omitempty,max=400"`
	}
	obj, errs, err := parse(r, &in)
	incoming := map[string]bool{}
	if err == nil {
		raw, ok := obj["checklist"]
		var m map[string]any
		switch {
		case !ok:
			errs["checklist"] = []string{"This field is required."}
		case isNull(raw):
			errs["checklist"] = []string{"This field may not be null."}
		case json.Unmarshal(raw, &m) != nil || m == nil:
			var v any
			_ = json.Unmarshal(raw, &v)
			errs["checklist"] = []string{fmt.Sprintf("Expected a dictionary of items but got type \"%s\".", pyType(v, raw))}
		default:
			bad, unknown := map[string]any{}, []string{}
			for k, v := range m {
				if v == nil {
					bad[k] = []string{"This field may not be null."}
				} else if b, ok := boolValue(v); ok {
					incoming[k] = b
				} else {
					bad[k] = []string{"Must be a valid boolean."}
				}
				if !contains2(checks, k) {
					unknown = append(unknown, k)
				}
			}
			if len(bad) > 0 {
				errs["checklist"] = bad
			} else if len(unknown) > 0 {
				sort.Strings(unknown)
				errs["checklist"] = []string{"Unknown checklist keys: ['" + strings.Join(unknown, "', '") + "']"}
			}
		}
		if len(errs) > 0 {
			err = apperr.Validation(errs)
		}
	}
	var id uuid.UUID
	if err == nil {
		id, err = h.retrofit(r)
	}
	if err == nil {
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			locked, err := q.RetrofitForUpdate(ctx, id)
			if err != nil {
				return err
			}
			if err := requireStatus(locked, "INSTALLED", "CHECKED"); err != nil {
				return err
			}
			result, all := map[string]any{}, true
			for _, k := range checks {
				result[k] = incoming[k]
				all = all && incoming[k]
			}
			before, reason := locked.Status, ""
			if all {
				locked.Status = "CHECKED"
			} else {
				locked.Status = "FAILED"
				reason = strings.TrimSpace(trimmed(in.Reason))
				if reason == "" {
					reason = "Safety checklist item failed."
				}
				raw := map[string]any{}
				_ = json.Unmarshal(locked.Raw, &raw)
				raw["failure_reason"] = reason
				locked.Raw, _ = json.Marshal(raw)
			}
			locked.Checklist, _ = json.Marshal(result)
			if err := saveRetrofit(ctx, q, locked); err != nil {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "retrofit.checklist", SubjectType: "retrofit",
				SubjectID: locked.ID.String(), SubjectLabel: label(locked), Actor: who,
				Before: events.Map{"status": before},
				After:  events.Map{"status": locked.Status, "checklist": result, "failure_reason": reason}})
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondRetrofit(w, r, http.StatusOK, id)
}

func contains2(list []string, s string) bool {
	for _, x := range list {
		if x == s {
			return true
		}
	}
	return false
}

func label(r db.MobilityRetrofit) string {
	if r.EboarderSerial != "" {
		return r.EboarderSerial
	}
	return r.ID.String()
}

// activate is RetrofitService.activate: CHECKED (all six passed) → ACTIVATED.
func (h *handler) activate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := h.retrofit(r)
	if err == nil {
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			locked, err := q.RetrofitForUpdate(ctx, id)
			if err != nil {
				return err
			}
			if err := requireStatus(locked, "CHECKED"); err != nil {
				return err
			}
			var cl map[string]any
			_ = json.Unmarshal(locked.Checklist, &cl)
			for _, k := range checks {
				if b, _ := cl[k].(bool); !b {
					return apperr.New("CHECKLIST_INCOMPLETE", "All six safety checks must pass before activation.").
						WithStatus(http.StatusConflict)
				}
			}
			before, now := locked.Status, time.Now()
			locked.Status, locked.ActivatedAt = "ACTIVATED", &now
			if err := saveRetrofit(ctx, q, locked); err != nil {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "retrofit.activated", SubjectType: "retrofit",
				SubjectID: locked.ID.String(), SubjectLabel: label(locked), Actor: who,
				Before: events.Map{"status": before},
				After:  events.Map{"status": "ACTIVATED", "activated_at": jsontime.FormatISO(now)}})
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondRetrofit(w, r, http.StatusOK, id)
}
