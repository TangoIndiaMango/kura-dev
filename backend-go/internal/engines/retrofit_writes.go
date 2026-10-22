package engines

import (
	"context"
	"encoding/json"
	"net/http"
	"sort"
	"strings"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
)

func saveRetrofit(ctx context.Context, q *db.Queries, r db.MobilityRetrofit) error {
	return q.SaveRetrofit(ctx, db.SaveRetrofitParams{ID: r.ID, EboarderSerial: r.EboarderSerial,
		Checklist: r.Checklist, Status: r.Status, Photos: r.Photos, ActivatedAt: r.ActivatedAt, Raw: r.Raw,
		AgentID: r.AgentID, PetrolEngineID: r.PetrolEngineID, EboarderID: r.EboarderID})
}

// requireStatus is _require_status. The message carries Python's repr of
// the sorted TextChoices members ("[Retrofit.Status.CHECKED]"), kept verbatim.
func requireStatus(r db.MobilityRetrofit, allowed ...string) error {
	for _, s := range allowed {
		if r.Status == s {
			return nil
		}
	}
	sorted := append([]string(nil), allowed...)
	sort.Strings(sorted)
	for i, v := range sorted {
		sorted[i] = "Retrofit.Status." + v
	}
	return apperr.New("INVALID_STATE", "Retrofit must be in ["+strings.Join(sorted, ", ")+"]; is "+r.Status+".").
		WithStatus(http.StatusConflict)
}

func notFound(err error, msg string) error {
	if database.IsNoRows(err) {
		return apperr.NotFound(msg)
	}
	return err
}

func whoID(who *events.Actor) *uuid.UUID {
	if who == nil {
		return nil
	}
	return &who.ID
}

// createRetrofit is RetrofitService.create: the vehicle moves to Path B
// (ENGINE_SWAP) and a job opens at INTAKE with the default checklist.
func (h *handler) createRetrofit(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var in struct {
		Account *uuid.UUID `json:"account_id" validate:"required"`
		Vehicle *uuid.UUID `json:"vehicle_id" validate:"required"`
		Serial  *string    `json:"eboarder_serial" validate:"omitempty,max=64"`
	}
	obj, errs, err := parse(r, &in)
	var raw map[string]any
	if err == nil {
		raw = dictField(obj, "raw", errs)
		if len(errs) > 0 {
			err = apperr.Validation(errs)
		}
	}
	id := ids.New()
	if err == nil {
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			// Django .get()s these (500 when unknown); Go answers 404.
			if _, err := q.AccountForUpdate(ctx, *in.Account); err != nil {
				return notFound(err, "Account not found.")
			}
			v, err := q.VehicleForUpdate(ctx, *in.Vehicle)
			if err != nil {
				return notFound(err, "Vehicle not found.")
			}
			if v.AccountID != *in.Account {
				return apperr.New("VALIDATION", "Vehicle does not belong to this account.")
			}
			if v.AcquisitionPath != "ENGINE_SWAP" {
				if err := q.SetVehicleEngineSwap(ctx, db.SetVehicleEngineSwapParams{ID: v.ID}); err != nil {
					return err
				}
			}
			checklist := map[string]bool{}
			for _, k := range checks {
				checklist[k] = false
			}
			cl, _ := json.Marshal(checklist)
			if raw == nil {
				raw = map[string]any{}
			}
			rawJSON, _ := json.Marshal(raw)
			serial := ""
			if in.Serial != nil {
				serial = *in.Serial
			}
			if err := q.InsertRetrofit(ctx, db.InsertRetrofitParams{ID: id, EboarderSerial: serial, Checklist: cl,
				Raw: rawJSON, AccountID: *in.Account, AgentID: whoID(who), VehicleID: v.ID}); err != nil {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "retrofit.created", SubjectType: "retrofit",
				SubjectID: id.String(), SubjectLabel: v.RegistrationPlate, Actor: who,
				After: events.Map{"status": "INTAKE", "account_id": in.Account.String(), "vehicle_id": v.ID.String()}})
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondRetrofit(w, r, http.StatusCreated, id)
}

var grades = map[string]bool{"GOOD": true, "FAIR": true, "POOR": true, "UNKNOWN": true}

// engineIntake is RetrofitService.engine_intake: records the surrendered
// petrol engine (tag, photos, signature, witness) and links it to the job
// and the vehicle.
func (h *handler) engineIntake(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var in struct {
		Tag       *string    `json:"tag" validate:"required,notblank,max=40"`
		Make      *string    `json:"make" validate:"omitempty,max=80"`
		Model     *string    `json:"model" validate:"omitempty,max=80"`
		Hp        *string    `json:"hp" validate:"omitempty,max=20"`
		Grade     *string    `json:"condition_grade"`
		Witness   *uuid.UUID `json:"witness_user_id" validate:"required"`
		Signature *string    `json:"signature_asset_id" validate:"required,notblank,max=255"`
		Hub       *uuid.UUID `json:"storage_hub_id"`
	}
	obj, errs, err := parse(r, &in)
	var photos []string
	var raw map[string]any
	if err == nil {
		if v, ok := obj["condition_grade"]; ok && (isNull(v) || in.Grade == nil || !grades[*in.Grade]) {
			if isNull(v) {
				errs["condition_grade"] = []string{"This field may not be null."}
			} else if in.Grade != nil {
				errs["condition_grade"] = []string{"\"" + *in.Grade + "\" is not a valid choice."}
			}
		}
		if v, ok := obj["photo_asset_ids"]; !ok {
			errs["photo_asset_ids"] = []string{"This field is required."}
		} else if list, e := strList(v, 1, 255); e != nil {
			errs["photo_asset_ids"] = e
		} else {
			photos = list
		}
		raw = dictField(obj, "raw", errs)
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
			return h.intake(ctx, q, who, id, in.Tag, in.Make, in.Model, in.Hp, in.Grade, *in.Witness,
				photos, *in.Signature, in.Hub, raw)
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondRetrofit(w, r, http.StatusOK, id)
}
