package mobility

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
)

const vehicleStatuses = "oneof=ACTIVE PENDING SUSPENDED RETIRED"

// vehicleWriteReq is VehicleWriteSerializer.
type vehicleWriteReq struct {
	AccountID         *uuid.UUID `json:"account_id"`
	VehicleModelID    *uuid.UUID `json:"vehicle_model_id"`
	RegistrationPlate *string    `json:"registration_plate" validate:"omitempty,notblank,max=30"`
	HardwareID        *string    `json:"hardware_id" validate:"omitempty,max=64"`
	Vin               *string    `json:"vin" validate:"omitempty,max=32"`
	Status            *string    `json:"status" validate:"omitempty,oneof=ACTIVE PENDING SUSPENDED RETIRED"`
}

// missing is VehicleWriteSerializer.validate (full writes only).
func (b vehicleWriteReq) missing() error {
	details := apperr.Details{}
	if b.AccountID == nil {
		details["account_id"] = []string{"This field is required."}
	}
	if b.VehicleModelID == nil {
		details["vehicle_model_id"] = []string{"This field is required."}
	}
	if b.RegistrationPlate == nil || *b.RegistrationPlate == "" {
		details["registration_plate"] = []string{"This field is required."}
	}
	if len(details) > 0 {
		return apperr.Validation(details)
	}
	return nil
}

func unknownModel() error {
	return apperr.New("VALIDATION_ERROR", "Unknown vehicle model.").
		WithDetails(apperr.Details{"vehicle_model_id": []string{"invalid"}})
}

// create is VehicleService.create; owners may only register on their own
// account (account_id defaults to it when they have exactly one).
func (h *VehicleHandler) create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b vehicleWriteReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	p := reqctx.User(ctx)
	uid, _ := uuid.Parse(p.UserID)
	own, err := ownAccounts(ctx, h.q, uid)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	if b.AccountID == nil && len(own) == 1 {
		b.AccountID = &own[0]
	}
	if err := b.missing(); err != nil {
		respond.Error(w, r, err)
		return
	}
	if !(p.Can("accounts:read") || p.Can("vehicles:read")) && !contains(own, *b.AccountID) {
		respond.Error(w, r, apperr.New("FORBIDDEN", "You can only register vehicles on your own account.").WithStatus(403))
		return
	}
	id := ids.New()
	err = database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		if _, err := q.VehicleModelByID(ctx, *b.VehicleModelID); database.IsNoRows(err) {
			return unknownModel()
		} else if err != nil {
			return err
		}
		plate := strings.ToUpper(strings.TrimSpace(*b.RegistrationPlate))
		if taken, err := q.PlateTaken(ctx, db.PlateTakenParams{RegistrationPlate: plate, Exclude: uuid.Nil}); err != nil {
			return err
		} else if taken {
			return apperr.Conflict("DUPLICATE", "A vehicle with this registration already exists.")
		}
		var hw *string
		if b.HardwareID != nil {
			if s := strings.ToUpper(strings.TrimSpace(*b.HardwareID)); s != "" {
				hw = &s
			}
		}
		if hw != nil {
			if taken, err := q.HardwareTaken(ctx, db.HardwareTakenParams{HardwareID: hw, Exclude: uuid.Nil}); err != nil {
				return err
			} else if taken {
				return apperr.Conflict("DUPLICATE", "Another vehicle already uses this hardware ID.")
			}
		}
		acct, err := q.AccountByID(ctx, *b.AccountID)
		if database.IsNoRows(err) {
			return apperr.New("VALIDATION_ERROR", "Unknown account.").
				WithDetails(apperr.Details{"account_id": []string{"invalid"}})
		} else if err != nil {
			return err
		}
		status := "ACTIVE"
		if b.Status != nil && *b.Status != "" {
			status = *b.Status
		}
		vin := ""
		if b.Vin != nil {
			vin = strings.ToUpper(strings.TrimSpace(*b.Vin))
		}
		if err := q.InsertVehicle(ctx, db.InsertVehicleParams{ID: id, RegistrationPlate: plate, Status: status,
			AccountID: acct.ID, VehicleModelID: *b.VehicleModelID, HardwareID: hw, Vin: vin}); err != nil {
			return err
		}
		who, err := actor.FromRequest(ctx, q)
		if err != nil {
			return err
		}
		me, err := q.UserRow(ctx, uid)
		if err != nil {
			return err
		}
		step := me.OnboardingStep
		if step == "vehicle" && acct.OwnerUserID == uid {
			step = "plan"
			if err := q.SetUserOnboardingStep(ctx, db.SetUserOnboardingStepParams{ID: uid, OnboardingStep: step}); err != nil {
				return err
			}
		}
		if err := maybePromoteFleet(ctx, q, acct.ID, who); err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "vehicle.created", SubjectType: "vehicle",
			SubjectID: id.String(), SubjectLabel: plate, Actor: who,
			After: events.Map{"registration_plate": plate, "account_id": acct.ID.String(), "status": status,
				"hardware_id": optStr(hw), "onboarding_step": step}})
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	v, err := h.load(ctx, id)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out, err := h.dtos(ctx, []db.VehicleRowsRow{v})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.Created(w, out[0])
}

func optStr(p *string) any {
	if p == nil {
		return nil
	}
	return *p
}

// maybePromoteFleet is VehicleService._maybe_promote_fleet: INDIVIDUAL →
// FLEET once the account has 2+ vehicles.
func maybePromoteFleet(ctx context.Context, q *db.Queries, account uuid.UUID, who *events.Actor) error {
	a, err := q.AccountForUpdate(ctx, account)
	if database.IsNoRows(err) || (err == nil && a.Kind == "FLEET") {
		return nil
	}
	if err != nil {
		return err
	}
	n, err := q.AccountVehicleTotal(ctx, account)
	if err != nil || n < 2 {
		return err
	}
	if err := q.SetAccountKind(ctx, db.SetAccountKindParams{ID: account, Kind: "FLEET"}); err != nil {
		return err
	}
	return events.Emit(ctx, q, events.Event{Action: "account.promoted_fleet", SubjectType: "account",
		SubjectID: account.String(), SubjectLabel: a.DisplayName, Actor: who, Before: events.Map{"kind": a.Kind},
		After: events.Map{"kind": "FLEET"}, Metadata: events.Map{"reason": "vehicle_count_gte_2"}})
}

// patch is VehicleService.update.
func (h *VehicleHandler) patch() http.HandlerFunc {
	return vehicleAction(h, func(ctx context.Context, cur db.VehicleRowsRow, b vehicleWriteReq, keys map[string]bool) error {
		return h.vehicleTx(ctx, cur.ID, func(q *db.Queries, v db.MobilityVehicle, who *events.Actor) error {
			before := vehicleSnap(v)
			if b.RegistrationPlate != nil && *b.RegistrationPlate != "" {
				plate := strings.ToUpper(strings.TrimSpace(*b.RegistrationPlate))
				if taken, err := q.PlateTaken(ctx, db.PlateTakenParams{RegistrationPlate: plate, Exclude: v.ID}); err != nil {
					return err
				} else if taken {
					return apperr.Conflict("DUPLICATE", "A vehicle with this registration already exists.")
				}
				v.RegistrationPlate = plate
			}
			if b.VehicleModelID != nil {
				if _, err := q.VehicleModelByID(ctx, *b.VehicleModelID); database.IsNoRows(err) {
					return unknownModel()
				} else if err != nil {
					return err
				}
				v.VehicleModelID = *b.VehicleModelID
			}
			if b.AccountID != nil {
				v.AccountID = *b.AccountID
			}
			if b.Status != nil && *b.Status != "" {
				v.Status = *b.Status
			}
			if keys["hardware_id"] {
				var hw *string
				if b.HardwareID != nil {
					if s := strings.TrimSpace(*b.HardwareID); s != "" { // update keeps case (create upper-cases)
						hw = &s
					}
				}
				if hw != nil {
					if taken, err := q.HardwareTaken(ctx, db.HardwareTakenParams{HardwareID: hw, Exclude: v.ID}); err != nil {
						return err
					} else if taken {
						return apperr.Conflict("DUPLICATE", "Another vehicle already uses this hardware_id.")
					}
				}
				v.HardwareID = hw
			}
			if keys["vin"] {
				v.Vin = ""
				if b.Vin != nil {
					v.Vin = strings.ToUpper(strings.TrimSpace(*b.Vin))
				}
			}
			if err := saveVehicle(ctx, q, v); err != nil {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "vehicle.updated", SubjectType: "vehicle",
				SubjectID: v.ID.String(), SubjectLabel: v.RegistrationPlate, Actor: who, Before: before,
				After: vehicleSnap(v)})
		})
	})
}
