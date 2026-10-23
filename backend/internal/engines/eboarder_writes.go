package engines

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
)

// eboarderIn is EBoarderWriteSerializer (pk / choice / dict fields are read
// from the raw object).
type eboarderIn struct {
	Serial   *string `json:"serial" validate:"omitempty,notblank,max=64"`
	Make     *string `json:"make" validate:"omitempty,max=80"`
	Model    *string `json:"model" validate:"omitempty,notblank,max=80"`
	Watts    *int64  `json:"rated_watts" validate:"omitempty,min=1"`
	PetrolHp *string `json:"petrol_hp_equivalent" validate:"omitempty,max=20"`
	Voltage  *int64  `json:"nominal_voltage_v" validate:"omitempty,min=12"`
	Shaft    *string `json:"-"`
	Status   *string `json:"-"`
	Type     *uuid.UUID
	Hub      *uuid.UUID
	HubSet   bool
	Raw      map[string]any
}

// pkField is PrimaryKeyRelatedField: (id, present).
func pkField(obj map[string]json.RawMessage, name string, allowNull bool, exists func(uuid.UUID) (bool, error),
	errs map[string]any) (*uuid.UUID, bool, error) {
	raw, ok := obj[name]
	if !ok {
		return nil, false, nil
	}
	if isNull(raw) {
		if !allowNull {
			errs[name] = []string{"This field may not be null."}
		}
		return nil, true, nil
	}
	var v any
	_ = json.Unmarshal(raw, &v)
	s, isStr := v.(string)
	if !isStr {
		errs[name] = []string{fmt.Sprintf("Incorrect type. Expected pk value, received %s.", pyType(v, raw))}
		return nil, true, nil
	}
	id, err := uuid.Parse(s)
	if err != nil {
		errs[name] = []string{"“" + s + "” is not a valid UUID."}
		return nil, true, nil
	}
	found, err := exists(id)
	if err != nil {
		return nil, true, err
	}
	if !found {
		errs[name] = []string{fmt.Sprintf("Invalid pk \"%s\" - object does not exist.", s)}
	}
	return &id, true, nil
}

func choiceField(obj map[string]json.RawMessage, name string, errs map[string]any, choices ...string) *string {
	raw, ok := obj[name]
	if !ok {
		return nil
	}
	if isNull(raw) {
		errs[name] = []string{"This field may not be null."}
		return nil
	}
	var v any
	_ = json.Unmarshal(raw, &v)
	s := fmt.Sprint(v)
	if str, isStr := v.(string); isStr {
		s = str
	}
	for _, c := range choices {
		if s == c {
			return &s
		}
	}
	errs[name] = []string{"\"" + s + "\" is not a valid choice."}
	return nil
}

func (h *handler) readEBoarder(r *http.Request, partial bool) (eboarderIn, map[string]json.RawMessage, error) {
	ctx := r.Context()
	var in eboarderIn
	obj, errs, err := parse(r, &in)
	if err != nil {
		return in, nil, err
	}
	for _, k := range []string{"serial", "make", "model", "rated_watts", "petrol_hp_equivalent", "nominal_voltage_v"} {
		if v, ok := obj[k]; ok && isNull(v) {
			errs[k] = []string{"This field may not be null."}
		}
	}
	if !partial {
		for _, k := range []string{"serial", "model", "rated_watts", "battery_type"} {
			if _, ok := obj[k]; !ok {
				errs[k] = []string{"This field is required."}
			}
		}
	}
	in.Shaft = choiceField(obj, "shaft_length", errs, "SHORT", "LONG", "UNKNOWN")
	in.Status = choiceField(obj, "status", errs, "IN_STOCK", "ISSUED", "MAINTENANCE", "RETIRED")
	if in.Type, _, err = pkField(obj, "battery_type", false, func(id uuid.UUID) (bool, error) {
		_, err := h.q.BatteryTypeByID(ctx, id)
		if database.IsNoRows(err) {
			return false, nil
		}
		return err == nil, err
	}, errs); err != nil {
		return in, nil, err
	}
	if in.Hub, in.HubSet, err = pkField(obj, "current_hub", true, func(id uuid.UUID) (bool, error) {
		return h.q.HubExists(ctx, id)
	}, errs); err != nil {
		return in, nil, err
	}
	in.Raw = dictField(obj, "raw", errs)
	if len(errs) > 0 {
		return in, nil, apperr.Validation(errs)
	}
	return in, obj, nil
}

var dupSerial = apperr.New("VALIDATION", "An e-boarder with this serial already exists.")

func ebSnapshot(b db.MobilityEboarder) events.Map {
	return events.Map{"serial": b.Serial, "make": b.Make, "model": b.Model, "status": b.Status,
		"rated_watts": b.RatedWatts, "battery_type_id": b.BatteryTypeID.String(), "current_hub_id": hubOut(b.CurrentHubID)}
}

func hubOut(id *uuid.UUID) any {
	if id == nil {
		return nil
	}
	return id.String()
}

// createEBoarder is EBoarderService.create.
func (h *handler) createEBoarder(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	in, _, err := h.readEBoarder(r, false)
	id := ids.New()
	if err == nil {
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			b := db.MobilityEboarder{ID: id, Serial: strings.ToUpper(trimmed(in.Serial)), Make: trimmed(in.Make),
				Model: trimmed(in.Model), RatedWatts: int32(*in.Watts), PetrolHpEquivalent: trimmed(in.PetrolHp),
				NominalVoltageV: 48, ShaftLength: "UNKNOWN", Status: "IN_STOCK", BatteryTypeID: *in.Type,
				CurrentHubID: in.Hub, Raw: []byte("{}")}
			if b.Make == "" {
				b.Make = "Asobo"
			}
			if in.Voltage != nil && *in.Voltage != 0 {
				b.NominalVoltageV = int16(*in.Voltage)
			}
			if in.Shaft != nil {
				b.ShaftLength = *in.Shaft
			}
			if in.Status != nil {
				b.Status = *in.Status
			}
			if len(in.Raw) > 0 {
				b.Raw, _ = json.Marshal(in.Raw)
			}
			err := q.InsertEBoarder(ctx, db.InsertEBoarderParams{ID: id, Serial: b.Serial, Make: b.Make, Model: b.Model,
				RatedWatts: b.RatedWatts, PetrolHpEquivalent: b.PetrolHpEquivalent, NominalVoltageV: b.NominalVoltageV,
				ShaftLength: b.ShaftLength, Status: b.Status, Raw: b.Raw, BatteryTypeID: b.BatteryTypeID,
				CurrentHubID: b.CurrentHubID})
			if _, dup := database.IsUniqueViolation(err); dup {
				return dupSerial
			}
			if err != nil {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "eboarder.created", SubjectType: "eboarder",
				SubjectID: id.String(), SubjectLabel: b.Serial, Actor: who,
				After: events.Map{"serial": b.Serial, "status": b.Status, "rated_watts": b.RatedWatts,
					"battery_type_id": b.BatteryTypeID.String(), "current_hub_id": hubOut(b.CurrentHubID)}})
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondEBoarder(w, r, http.StatusCreated, id)
}

// patchEBoarder is EBoarderService.update (partial; full row save).
func (h *handler) patchEBoarder(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	in, _, err := h.readEBoarder(r, true)
	var id uuid.UUID
	if err == nil {
		id, err = h.eboarder(r)
	}
	if err == nil {
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			return updateEBoarder(ctx, q, who, id, in)
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondEBoarder(w, r, http.StatusOK, id)
}

func updateEBoarder(ctx context.Context, q *db.Queries, who *events.Actor, id uuid.UUID, in eboarderIn) error {
	b, err := q.EBoarderForUpdate(ctx, id)
	if err != nil {
		return err
	}
	before := ebSnapshot(b)
	set := func(dst *string, v *string) {
		if v != nil {
			*dst = strings.TrimSpace(*v)
		}
	}
	set(&b.Make, in.Make)
	set(&b.Model, in.Model)
	set(&b.PetrolHpEquivalent, in.PetrolHp)
	set(&b.ShaftLength, in.Shaft)
	set(&b.Status, in.Status)
	if in.Serial != nil {
		b.Serial = strings.ToUpper(strings.TrimSpace(*in.Serial))
	}
	if in.Watts != nil {
		b.RatedWatts = int32(*in.Watts)
	}
	if in.Voltage != nil {
		b.NominalVoltageV = int16(*in.Voltage)
	}
	if in.Type != nil {
		b.BatteryTypeID = *in.Type
	}
	if in.HubSet {
		b.CurrentHubID = in.Hub
	}
	if in.Raw != nil {
		b.Raw, _ = json.Marshal(in.Raw)
	}
	err = saveEBoarder(ctx, q, b)
	if _, dup := database.IsUniqueViolation(err); dup {
		return dupSerial
	}
	if err != nil {
		return err
	}
	return events.Emit(ctx, q, events.Event{Action: "eboarder.updated", SubjectType: "eboarder",
		SubjectID: b.ID.String(), SubjectLabel: b.Serial, Actor: who, Before: before, After: ebSnapshot(b)})
}
