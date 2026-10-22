package engines

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
)

func trimmed(s *string) string {
	if s == nil {
		return ""
	}
	return strings.TrimSpace(*s)
}

// intake is the engine_intake service body (retrofit locked first).
func (h *handler) intake(ctx context.Context, q *db.Queries, who *events.Actor, id uuid.UUID, tag, make, model,
	hp, grade *string, witness uuid.UUID, photos []string, signature string, hub *uuid.UUID, raw map[string]any) error {
	locked, err := q.RetrofitForUpdate(ctx, id)
	if err != nil {
		return err
	}
	if err := requireStatus(locked, "INTAKE"); err != nil {
		return err
	}
	if locked.PetrolEngineID != nil {
		return apperr.New("ALREADY_INTAKEN", "This retrofit already has a petrol engine linked.").
			WithStatus(http.StatusConflict)
	}
	if who == nil {
		return apperr.New("VALIDATION", "Intake agent is required.")
	}
	if witness == who.ID {
		return apperr.New("VALIDATION", "Intake agent and witness must be different staff.")
	}
	if ok, err := q.UserExists(ctx, witness); err != nil || !ok {
		if err != nil {
			return err
		}
		return apperr.New("VALIDATION", "Unknown witness user.")
	}
	t := strings.ToUpper(trimmed(tag))
	if t == "" {
		return apperr.New("VALIDATION", "Engine tag is required.")
	}
	if taken, err := q.EngineTagTaken(ctx, t); err != nil || taken {
		if err != nil {
			return err
		}
		return apperr.New("DUPLICATE", "Engine tag already exists.").WithStatus(http.StatusConflict)
	}
	if hub != nil { // Django .get()s the hub (500 when unknown); Go answers 404.
		if ok, err := q.HubExists(ctx, *hub); err != nil || !ok {
			if err != nil {
				return err
			}
			return apperr.NotFound("Hub not found.")
		}
	}
	g := trimmed(grade)
	if g == "" {
		g = "UNKNOWN"
	}
	if raw == nil {
		raw = map[string]any{}
	}
	photosJSON, _ := json.Marshal(photos)
	rawJSON, _ := json.Marshal(raw)
	engine := ids.New()
	if err := q.InsertEngine(ctx, db.InsertEngineParams{ID: engine, Tag: t, Make: trimmed(make), Model: trimmed(model),
		Hp: trimmed(hp), ConditionGrade: g, IntakePhotos: photosJSON, IntakeSignature: strings.TrimSpace(signature),
		Raw: rawJSON, AccountID: locked.AccountID, IntakeAgentID: &who.ID, IntakeWitnessID: &witness,
		StorageHubID: hub}); err != nil {
		return err
	}
	locked.PetrolEngineID, locked.AgentID = &engine, &who.ID
	if err := saveRetrofit(ctx, q, locked); err != nil {
		return err
	}
	if _, err := q.VehicleForUpdate(ctx, locked.VehicleID); err != nil {
		return err
	}
	if err := q.SetVehicleEngineSwap(ctx, db.SetVehicleEngineSwapParams{ID: locked.VehicleID, Engine: &engine}); err != nil {
		return err
	}
	var hubOut any
	if hub != nil {
		hubOut = hub.String()
	}
	return events.Emit(ctx, q, events.Event{Action: "engine.intake", SubjectType: "petrol_engine",
		SubjectID: engine.String(), SubjectLabel: t, Actor: who,
		After: events.Map{"tag": t, "status": "STORED", "retrofit_id": locked.ID.String(),
			"witness_user_id": witness.String(), "storage_hub_id": hubOut}})
}

// install is RetrofitService.install: issue the e-boarder (by id, or by a
// serial that matches stock) and move the job to INSTALLED.
func install(ctx context.Context, q *db.Queries, who *events.Actor, id uuid.UUID, eboarderID *uuid.UUID,
	serialIn string, photos []string) error {
	locked, err := q.RetrofitForUpdate(ctx, id)
	if err != nil {
		return err
	}
	if err := requireStatus(locked, "INTAKE"); err != nil {
		return err
	}
	if locked.PetrolEngineID == nil {
		return apperr.New("MISSING_ENGINE", "Complete engine intake before install.").WithStatus(http.StatusConflict)
	}
	serial := serialIn
	if serial == "" {
		serial = locked.EboarderSerial
	}
	serial = strings.TrimSpace(serial)
	var eb *db.MobilityEboarder
	if eboarderID != nil { // Django .get()s it (500 when unknown); Go answers 404.
		row, err := q.EBoarderForUpdate(ctx, *eboarderID)
		if err != nil {
			return notFound(err, "E-boarder not found.")
		}
		eb = &row
	} else if serial != "" {
		row, err := q.EBoarderBySerialForUpdate(ctx, serial)
		if err == nil {
			eb = &row
		} else if err = notFound(err, ""); !isNotFound(err) {
			return err
		}
	}
	if eb != nil {
		serial = eb.Serial
		if err := issueToVehicle(ctx, q, who, *eb, locked.VehicleID, locked.AccountID); err != nil {
			return err
		}
	}
	if serial == "" {
		return apperr.New("VALIDATION", "eboarder_id or eboarder_serial is required.")
	}
	if len(photos) == 0 {
		var prior []any
		_ = json.Unmarshal(locked.Photos, &prior)
		if len(prior) > 0 {
			locked.Photos = append([]byte(nil), locked.Photos...)
		} else {
			locked.Photos = []byte("[]")
		}
	} else {
		locked.Photos, _ = json.Marshal(photos)
	}
	before := locked.Status
	locked.EboarderSerial, locked.Status = serial, "INSTALLED"
	locked.EboarderID = nil
	var ebOut any
	if eb != nil {
		locked.EboarderID, ebOut = &eb.ID, eb.ID.String()
	}
	if who != nil {
		locked.AgentID = &who.ID
	}
	if err := saveRetrofit(ctx, q, locked); err != nil {
		return err
	}
	return events.Emit(ctx, q, events.Event{Action: "retrofit.installed", SubjectType: "retrofit",
		SubjectID: locked.ID.String(), SubjectLabel: serial, Actor: who, Before: events.Map{"status": before},
		After: events.Map{"status": "INSTALLED", "eboarder_serial": serial, "eboarder_id": ebOut}})
}

func isNotFound(err error) bool {
	e, ok := apperr.As(err)
	return ok && e.Status == http.StatusNotFound
}
