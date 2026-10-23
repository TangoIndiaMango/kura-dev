package support

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/scope"
)

// openReq is OpenCaseSerializer.
type openReq struct {
	AccountID  *uuid.UUID `json:"account_id"`
	Subject    string     `json:"subject" validate:"required,max=200"`
	Kind       *string    `json:"kind" validate:"omitempty,oneof=GENERAL PAYMENT_DISPUTE IDENTITY ENGINE_RELEASE RISK_REFERRAL OTHER"`
	Priority   *string    `json:"priority" validate:"omitempty,oneof=LOW NORMAL HIGH URGENT"`
	Body       string     `json:"body"`
	DriverID   *uuid.UUID `json:"driver_id"`
	AssignedTo *uuid.UUID `json:"assigned_to_id"`
	Attachment *uuid.UUID `json:"attachment_asset_id"`
	PaymentID  *uuid.UUID `json:"payment_id"`
}

func or(p *string, d string) string {
	if p == nil {
		return d
	}
	return *p
}

func (h *Handler) tx(ctx context.Context, fn func(q *db.Queries, who *events.Actor) error) error {
	return database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		who, err := actor.FromRequest(ctx, q)
		if err != nil {
			return err
		}
		return fn(q, who)
	})
}

func me(ctx context.Context) uuid.UUID {
	id, _ := uuid.Parse(reqctx.User(ctx).UserID)
	return id
}

// resolveAccount is _resolve_account.
func (h *Handler) resolveAccount(ctx context.Context, id *uuid.UUID) (db.AccountsAccount, error) {
	own, err := scope.OwnAccounts(ctx, h.q, me(ctx))
	if err != nil {
		return db.AccountsAccount{}, err
	}
	if id == nil {
		if len(own) != 1 {
			return db.AccountsAccount{}, apperr.New("VALIDATION_ERROR", "account_id is required.")
		}
		id = &own[0]
	}
	a, err := h.q.AccountByID(ctx, *id)
	if database.IsNoRows(err) {
		return a, apperr.NotFound("No Account matches the given query.")
	}
	if err == nil && !reqctx.User(ctx).Can("cases:manage") && !contains(own, a.ID) {
		err = apperr.New("FORBIDDEN", "You can only open cases on your own account.").WithStatus(http.StatusForbidden)
	}
	return a, err
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	keys := decode.Keys(r)
	var b openReq
	err := decode.JSON(r, &b)
	if e, ok := apperr.As(err); ok && keys["account_id"] && b.AccountID == nil && e.Details["account_id"] == nil {
		e.Details["account_id"] = []string{"This field may not be null."}
	} else if err == nil && keys["account_id"] && b.AccountID == nil {
		err = apperr.Field("account_id", "This field may not be null.")
	}
	var acct db.AccountsAccount
	if err == nil {
		acct, err = h.resolveAccount(ctx, b.AccountID)
	}
	if err == nil && b.DriverID != nil {
		if d, derr := h.q.DriverRowByID(ctx, *b.DriverID); database.IsNoRows(derr) || (derr == nil && d.AccountID != acct.ID) {
			err = apperr.NotFound("No Driver matches the given query.")
		} else {
			err = derr
		}
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	label := acct.DisplayName
	if label == "" {
		label = acct.KuraID
	}
	uid := me(ctx)
	var id uuid.UUID
	err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
		var err error
		id, _, err = OpenCase(ctx, q, OpenIn{Account: acct.ID, AccountLabel: label, Subject: b.Subject,
			Kind: or(b.Kind, "GENERAL"), Priority: or(b.Priority, "NORMAL"), Driver: b.DriverID, OpenedBy: &uid,
			Actor: who, Body: b.Body, Attachment: b.Attachment, Payment: b.PaymentID})
		return err
	})
	if err == nil && b.AssignedTo != nil && reqctx.User(ctx).Can("cases:manage") {
		err = h.assignTo(ctx, id, b.AssignedTo)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondDetail(w, r, id, http.StatusCreated)
}

type noteReq struct {
	Body       string     `json:"body"`
	Attachment *uuid.UUID `json:"attachment_asset_id"`
}

// addNote is SupportCaseService.add_note: the owner's notes page staff,
// everyone else's page the owner.
func (h *Handler) addNote(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b noteReq
	err := decode.JSON(r, &b)
	var c db.CaseRowsRow
	if err == nil {
		c, err = h.object(r)
	}
	if err == nil {
		uid := me(ctx)
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			asset, err := attachment(ctx, q, &uid, b.Attachment)
			if err != nil {
				return err
			}
			text := strings.TrimSpace(b.Body)
			if text == "" && asset == nil {
				return apperr.New("VALIDATION_ERROR", "Note body or attachment is required.")
			}
			evID := ids.New()
			if err := q.InsertCaseEvent(ctx, db.InsertCaseEventParams{ID: evID, Kind: noteKind(text, asset),
				Body: noteBody(text, asset), ActorID: &uid, CaseID: c.ID, AttachmentID: assetID(asset)}); err != nil {
				return err
			}
			if err := events.Emit(ctx, q, events.Event{Action: "support_case.note", SubjectType: "support_case",
				SubjectID: c.ID.String(), SubjectLabel: c.Code, Actor: who,
				Metadata: events.Map{"event_id": evID.String(), "has_attachment": asset != nil}}); err != nil {
				return err
			}
			body := text
			if body == "" {
				body = "Photo attached"
			}
			title, dedupe := "Update on "+c.Code, "support.note:"+evID.String()
			if c.OwnerUserID == uid {
				return notifyStaff(ctx, q, c.ID, c.AssignedToID, title, truncate(body, 180), dedupe)
			}
			return notifyRider(ctx, q, c.ID, c.OwnerUserID, title, truncate(body, 180), dedupe)
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondDetail(w, r, c.ID, http.StatusCreated)
}

type statusReq struct {
	Status string `json:"status" validate:"required,oneof=OPEN PENDING RESOLVED CLOSED"`
	Note   string `json:"note"`
}

func (h *Handler) setStatus(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b statusReq
	err := decode.JSON(r, &b)
	var c db.CaseRowsRow
	if err == nil {
		c, err = h.object(r)
	}
	if err == nil {
		uid := me(ctx)
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			locked, err := q.CaseForUpdate(ctx, c.ID)
			if err != nil {
				return err
			}
			prev := locked.Status
			if err := q.SaveCaseStatus(ctx, db.SaveCaseStatusParams{ID: c.ID, Status: b.Status}); err != nil {
				return err
			}
			body := truncate(strings.TrimSpace(b.Note), 4000)
			if body == "" {
				body = prev + " → " + b.Status
			}
			if err := q.InsertCaseEvent(ctx, db.InsertCaseEventParams{ID: ids.New(), Kind: "STATUS", Body: body,
				ActorID: &uid, CaseID: c.ID}); err != nil {
				return err
			}
			if err := events.Emit(ctx, q, events.Event{Action: "support_case.status", SubjectType: "support_case",
				SubjectID: c.ID.String(), SubjectLabel: c.Code, Actor: who,
				Metadata: events.Map{"from": prev, "to": b.Status}}); err != nil {
				return err
			}
			return notifyRider(ctx, q, c.ID, c.OwnerUserID, "Case "+c.Code+" updated",
				"Status is now "+titleCase(b.Status)+".", "support.status:"+c.ID.String()+":"+b.Status)
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondDetail(w, r, c.ID, http.StatusOK)
}
