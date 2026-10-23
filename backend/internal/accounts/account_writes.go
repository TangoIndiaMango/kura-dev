package accounts

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
)

// AccountProfileSerializer.
type profileReq struct {
	DisplayName string `json:"display_name" validate:"required,max=200"`
	FirstName   string `json:"first_name" validate:"max=150"`
	LastName    string `json:"last_name" validate:"max=150"`
	IDType      string `json:"id_type" validate:"max=40"`
	IDNumber    string `json:"id_number" validate:"max=80"`
}

// completeProfileTx runs complete_profile in its own transaction, then
// requests the NUBAN for a newly created account.
func (h *AccountHandler) completeProfileTx(ctx context.Context, user db.AccountsUser, name, first, last,
	idNumber string) (uuid.UUID, error) {
	var res profileResult
	err := database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		var err error
		res, err = completeProfile(ctx, db.New(tx), user, name, first, last, idNumber)
		return err
	})
	if err != nil {
		return uuid.Nil, err
	}
	h.ids.scheduleVA(res.VA)
	return res.Account.ID, nil
}

// create is POST /accounts/: the rider completes their profile.
func (h *AccountHandler) create(w http.ResponseWriter, r *http.Request) {
	var b profileReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	user, err := h.caller(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	id, err := h.completeProfileTx(r.Context(), user, b.DisplayName, b.FirstName, b.LastName, b.IDNumber)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	acct, err := h.q.AccountByID(r.Context(), id)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.Created(w, toAccountDTO(acct))
}

// patch is PATCH /accounts/{id}/: only the owner renames (Identity flow).
// Django reads request.data directly here, without a serializer.
func (h *AccountHandler) patch(w http.ResponseWriter, r *http.Request) {
	row, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	var raw map[string]any
	if err := decode.JSON(r, &raw); err != nil {
		respond.Error(w, r, err)
		return
	}
	text := func(k string) string { s, _ := raw[k].(string); return s }
	name := strings.TrimSpace(text("display_name"))
	if name == "" {
		respond.Error(w, r, apperr.New("VALIDATION_ERROR", "display_name is required.").
			WithDetails(apperr.Details{"display_name": []string{"required"}}))
		return
	}
	p := reqctx.User(r.Context())
	if row.OwnerUserID.String() != p.UserID {
		respond.Error(w, r, apperr.New("PERMISSION_DENIED",
			"Operators update their own full name on Identity. Staff cannot rename them.").WithStatus(http.StatusForbidden))
		return
	}
	user, err := h.caller(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	id, err := h.completeProfileTx(r.Context(), user, name, text("first_name"), text("last_name"), "")
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondAccount(w, r, id, isCRMStaff(p))
}

// respondAccount answers with the CRM detail (staff) or AccountSerializer.
func (h *AccountHandler) respondAccount(w http.ResponseWriter, r *http.Request, id uuid.UUID, crm bool) {
	rows, err := h.q.CrmRows(r.Context(), []uuid.UUID{id})
	if err == nil && len(rows) == 0 {
		err = apperr.NotFound("No Account matches the given query.")
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	if !crm {
		respond.OK(w, plainAccount(rows[0]))
		return
	}
	d, err := crmDetail(r.Context(), h.q, rows[0], h.cdn)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, d)
}

type reasonOnlyReq struct {
	Reason string `json:"reason" validate:"required,max=255"`
}

type messageReq struct {
	Message string `json:"message" validate:"required,max=280"`
}

// AccountCooperativeSerializer: cooperative_id is required but may be null.
type coopReq struct {
	CooperativeID *uuid.UUID `json:"cooperative_id"`
}

// staffAction runs a staff mutation on {id} and answers with the CRM
// detail. The serializer is validated before get_object, as in Django.
func staffAction[T any](h *AccountHandler, run func(ctx context.Context, staff db.AccountsUser, acct db.CrmRowsRow, b T) error) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var b T
		if err := decode.JSON(r, &b); err != nil {
			respond.Error(w, r, err)
			return
		}
		h.runStaffAction(w, r, func(ctx context.Context, staff db.AccountsUser, row db.CrmRowsRow) error {
			return run(ctx, staff, row, b)
		})
	}
}

func (h *AccountHandler) runStaffAction(w http.ResponseWriter, r *http.Request,
	run func(ctx context.Context, staff db.AccountsUser, row db.CrmRowsRow) error) {
	row, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	staff, err := h.caller(r)
	if err == nil {
		err = run(r.Context(), staff, row)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondAccount(w, r, row.ID, true)
}

// setStatus is AccountService.suspend / reinstate.
func (h *AccountHandler) setStatus(ctx context.Context, staff db.AccountsUser, row db.CrmRowsRow, suspend bool,
	reason string) error {
	if row.Status == "DEREGISTERED" {
		verb := "reinstated"
		if suspend {
			verb = "suspended"
		}
		return apperr.Conflict("INVALID_TRANSITION", "Deregistered accounts cannot be "+verb+".")
	}
	label := firstNonEmpty(row.KuraID, row.DisplayName, row.ID.String())
	ev := events.Event{Action: "account.reinstated", SubjectType: "account", SubjectID: row.ID.String(),
		SubjectLabel: label, Actor: actorOf(staff), Before: events.Map{"status": row.Status},
		After: events.Map{"status": "ACTIVE"}}
	note := events.NotifySpec{UserID: staff.ID, Title: "Operator reinstated", Body: label + " is active again.",
		Source: "Users", LinkPath: "/operators/" + row.ID.String(), TemplateCode: "account.reinstated",
		DedupeKey: "account.reinstated:" + row.ID.String()}
	status := "ACTIVE"
	if suspend {
		status = "SUSPENDED"
		ev.Action, ev.After, ev.Metadata = "account.suspended", events.Map{"status": status}, events.Map{"reason": reason}
		note.Title, note.Body = "Operator suspended", fmt.Sprintf("%s suspended: %s", label, truncate(reason, 120))
		note.TemplateCode, note.DedupeKey = "account.suspended", "account.suspended:"+row.ID.String()
	}
	ev.Notify = []events.NotifySpec{note}
	return database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		if err := q.SetAccountStatus(ctx, db.SetAccountStatusParams{ID: row.ID, Status: status}); err != nil {
			return err
		}
		return events.Emit(ctx, q, ev)
	})
}

func (h *AccountHandler) suspend() http.HandlerFunc {
	return staffAction(h, func(ctx context.Context, staff db.AccountsUser, row db.CrmRowsRow, b reasonOnlyReq) error {
		reason := strings.TrimSpace(b.Reason)
		if utf8.RuneCountInString(reason) < 3 {
			return apperr.New("VALIDATION_ERROR", "Suspension reason is required.").
				WithDetails(apperr.Details{"reason": []string{"required"}})
		}
		return h.setStatus(ctx, staff, row, true, reason)
	})
}

func (h *AccountHandler) reinstate(w http.ResponseWriter, r *http.Request) {
	h.runStaffAction(w, r, func(ctx context.Context, staff db.AccountsUser, row db.CrmRowsRow) error {
		return h.setStatus(ctx, staff, row, false, "")
	})
}

// notifyRider is AccountService.notify_rider: an in-app note to the owner.
func (h *AccountHandler) notifyRider() http.HandlerFunc {
	return staffAction(h, func(ctx context.Context, staff db.AccountsUser, row db.CrmRowsRow, b messageReq) error {
		text := strings.TrimSpace(b.Message)
		if utf8.RuneCountInString(text) < 3 {
			return apperr.New("VALIDATION_ERROR", "Write a short note the operator can act on.").
				WithDetails(apperr.Details{"message": []string{"required"}})
		}
		return events.EmitTx(ctx, h.pool, events.Event{Action: "account.ops_note", SubjectType: "account",
			SubjectID: row.ID.String(), SubjectLabel: firstNonEmpty(row.KuraID, row.DisplayName, row.ID.String()),
			Actor: actorOf(staff), Before: events.Map{}, After: events.Map{},
			Metadata: events.Map{"message": truncate(text, 280)},
			Notify: []events.NotifySpec{{UserID: row.OwnerUserID, Title: "Note from Kura ops",
				Body: truncate(text, 160), Source: "Users", LinkPath: "/account/identity",
				TemplateCode: "account.ops_note",
				DedupeKey:    fmt.Sprintf("account.ops_note:%s:%d", row.ID, time.Now().Unix())}}})
	})
}

// setCooperative is CooperativeService.assign_account. The cooperative is
// checked before the account is loaded, as in the view.
func (h *AccountHandler) setCooperative(w http.ResponseWriter, r *http.Request) {
	present := decode.Keys(r)["cooperative_id"]
	var b coopReq
	err := decode.JSON(r, &b)
	if err == nil && !present {
		err = apperr.Field("cooperative_id", "This field is required.")
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	if b.CooperativeID != nil {
		ok, err := h.q.CooperativeExists(r.Context(), *b.CooperativeID)
		if err == nil && !ok {
			err = apperr.New("VALIDATION_ERROR", "Unknown cooperative.").
				WithDetails(apperr.Details{"cooperative_id": []string{"invalid"}})
		}
		if err != nil {
			respond.Error(w, r, err)
			return
		}
	}
	h.runStaffAction(w, r, func(ctx context.Context, staff db.AccountsUser, row db.CrmRowsRow) error {
		return database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
			q := db.New(tx)
			locked, err := q.AccountForUpdate(ctx, row.ID)
			if err != nil {
				return err
			}
			if err := q.SetAccountCooperative(ctx, db.SetAccountCooperativeParams{ID: row.ID,
				CooperativeID: b.CooperativeID}); err != nil {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "account.cooperative_assigned", SubjectType: "account",
				SubjectID: row.ID.String(), SubjectLabel: firstNonEmpty(locked.KuraID, locked.DisplayName),
				Actor: actorOf(staff), Before: events.Map{"cooperative_id": uuidOrEmpty(locked.CooperativeID)},
				After: events.Map{"cooperative_id": uuidOrEmpty(b.CooperativeID)}})
		})
	})
}

func uuidOrEmpty(id *uuid.UUID) string {
	if id == nil {
		return ""
	}
	return id.String()
}
