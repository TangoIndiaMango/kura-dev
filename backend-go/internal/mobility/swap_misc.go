package mobility

import (
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/risk"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/support"
)

type mismatchIn struct {
	AccountID       uuid.UUID  `json:"account_id" validate:"required"`
	Subject         string     `json:"subject"`
	Reason          string     `json:"reason" validate:"required,max=400"`
	HubID           *uuid.UUID `json:"hub_id"`
	ReservationCode string     `json:"reservation_code" validate:"max=40"`
}

// identityMismatch is record_identity_mismatch: MANUAL_FLAG risk event +
// IDENTITY support case + audit.
func (b *Bay) identityMismatch(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var in mismatchIn
	err := decode.JSON(r, &in)
	note := strings.TrimSpace(in.Reason)
	subject := strings.TrimSpace(in.Subject)
	if subject == "" {
		subject = "Identity mismatch at hub bay"
	}
	var acct db.AccountsAccount
	if err == nil {
		if acct, err = b.q.AccountByID(ctx, in.AccountID); database.IsNoRows(err) {
			err = apperr.New("NOT_FOUND", "Account not found.").WithStatus(http.StatusNotFound)
		}
	}
	var out map[string]any
	if err == nil {
		err = b.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			var hub, code any
			if in.HubID != nil {
				hub = in.HubID.String()
			}
			if in.ReservationCode != "" {
				code = in.ReservationCode
			}
			riskID, err := risk.Emit(ctx, q, risk.Event{RuleCode: "MANUAL_FLAG", SubjectType: "account",
				SubjectID: acct.ID.String(), AccountID: &acct.ID, Severity: "HIGH", ActionTaken: "BLOCK",
				Context: map[string]any{"kind": "IDENTITY_MISMATCH", "reason": truncate(note, 400), "hub_id": hub,
					"reservation_code": code}})
			if err != nil {
				return err
			}
			label := acct.DisplayName
			if label == "" {
				label = acct.KuraID
			}
			opener := actorID(who)
			caseID, caseCode, err := support.OpenCase(ctx, q, support.OpenIn{Account: acct.ID, AccountLabel: label,
				Subject: truncate(subject, 200), Kind: "IDENTITY", Priority: "HIGH", OpenedBy: opener, Actor: who,
				Body: truncate(note, 4000)})
			if err != nil {
				return err
			}
			subjLabel := acct.DisplayName
			if subjLabel == "" {
				subjLabel = acct.ID.String()
			}
			out = map[string]any{"risk_event_id": riskID.String(), "case_id": caseID.String(), "case_code": caseCode}
			return events.Emit(ctx, q, events.Event{Action: "identity.mismatch", SubjectType: "account",
				SubjectID: acct.ID.String(), SubjectLabel: subjLabel, Actor: who,
				Metadata: events.Map{"risk_event_id": riskID.String(), "case_id": caseID.String(), "case_code": caseCode,
					"hub_id": hub, "reservation_code": code, "reason": truncate(note, 400)}})
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, out)
}

func (b *Bay) velocityStatus(w http.ResponseWriter, r *http.Request) {
	raw, present := r.URL.Query()["vehicle_id"]
	var err error
	var vid uuid.UUID
	if !present {
		err = apperr.Field("vehicle_id", "This field is required.")
	} else if vid, err = uuid.Parse(strings.TrimSpace(raw[len(raw)-1])); err != nil {
		err = apperr.Field("vehicle_id", "Must be a valid UUID.")
	}
	var out map[string]any
	if err == nil {
		out, err = risk.VelocityStatus(r.Context(), b.q, vid)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, out)
}

type exceptionIn struct {
	VehicleID uuid.UUID  `json:"vehicle_id" validate:"required"`
	Note      string     `json:"note" validate:"required,max=400"`
	HubID     *uuid.UUID `json:"hub_id"`
	AccountID *uuid.UUID `json:"account_id"`
}

func (b *Bay) requestException(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var in exceptionIn
	err := decode.JSON(r, &in)
	var e db.RiskRiskevent
	if err == nil {
		var who *events.Actor
		if who, err = actor.FromRequest(ctx, b.q); err == nil {
			e, err = risk.RequestException(ctx, b.pool, in.VehicleID, in.Note, who, who.ID, in.HubID,
				b.knownAccount(ctx, in.AccountID))
		}
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, map[string]any{"risk_event_id": e.ID.String(), "status": e.Status, "exception_requested": true})
}

type riderPinIn struct {
	AccountID uuid.UUID `json:"account_id" validate:"required"`
	Pin       string    `json:"pin" validate:"required,min=4,max=8"`
}

// verifyRiderPin: the rider types their PIN on the agent's device; the grant
// is issued for the account owner.
func (b *Bay) verifyRiderPin(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var in riderPinIn
	err := decode.JSON(r, &in)
	var acct db.AccountsAccount
	if err == nil {
		if acct, err = b.q.AccountByID(ctx, in.AccountID); database.IsNoRows(err) || (err == nil && acct.OwnerUserID == uuid.Nil) {
			err = apperr.New("NOT_FOUND", "Account not found.").WithStatus(http.StatusNotFound)
		}
	}
	var tok string
	var exp jsontime.Raw
	if err == nil {
		t, e, verr := b.verifyPin(ctx, acct.OwnerUserID, in.Pin)
		tok, exp, err = t, jsontime.Raw(e), verr
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, map[string]any{"status": "verified", "pin_grant": tok, "expires_at": exp})
}

type hubStatusIn struct {
	Status string `json:"status" validate:"required,oneof=ONLINE OFFLINE MAINTENANCE CLOSED"`
	Note   string `json:"note"`
}
