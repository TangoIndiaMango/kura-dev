// Package support ports the support app: help-desk cases (SupportCaseViewSet
// and SupportCaseService).
package support

import (
	"context"
	"crypto/rand"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
)

// slaHours is SLA_HOURS by priority (48h fallback).
var slaHours = map[string]int{"URGENT": 4, "HIGH": 8, "NORMAL": 48, "LOW": 72}

func slaDue(priority string) time.Time {
	h, ok := slaHours[priority]
	if !ok {
		h = 48
	}
	return time.Now().Add(time.Duration(h) * time.Hour)
}

func caseCode() string {
	var b strings.Builder
	b.WriteString("CS-")
	for i := 0; i < 6; i++ {
		n, _ := rand.Int(rand.Reader, big.NewInt(10))
		b.WriteString(n.String())
	}
	return b.String()
}

func truncate(s string, n int) string {
	if r := []rune(s); len(r) > n {
		return string(r[:n])
	}
	return s
}

// attachment is _resolve_attachment → resolve_owned_asset.
func attachment(ctx context.Context, q *db.Queries, actor *uuid.UUID, asset *uuid.UUID) (*db.CoreMediaasset, error) {
	if asset == nil {
		return nil, nil
	}
	if actor == nil {
		return nil, apperr.New("VALIDATION_ERROR", "Actor required to attach media.")
	}
	a, err := q.MediaAssetFull(ctx, *asset)
	if database.IsNoRows(err) {
		return nil, apperr.New("VALIDATION_ERROR", "Unknown media asset.").
			WithDetails(apperr.Details{"asset_id": []string{"invalid"}})
	}
	if err != nil {
		return nil, err
	}
	if a.UploadedByID != nil && *a.UploadedByID != *actor {
		return nil, apperr.New("FORBIDDEN", "You cannot attach media you did not upload.").WithStatus(http.StatusForbidden)
	}
	return &a, nil
}

// payment is _resolve_payment.
func payment(ctx context.Context, q *db.Queries, account uuid.UUID, id *uuid.UUID) (*uuid.UUID, error) {
	if id == nil {
		return nil, nil
	}
	p, err := q.PaymentByID(ctx, *id)
	if database.IsNoRows(err) {
		return nil, apperr.New("VALIDATION_ERROR", "Unknown payment.").
			WithDetails(apperr.Details{"payment_id": []string{"invalid"}})
	}
	if err != nil {
		return nil, err
	}
	if p.AccountID != account {
		return nil, apperr.New("FORBIDDEN", "Payment does not belong to this account.").WithStatus(http.StatusForbidden)
	}
	return &p.ID, nil
}

// noteKind / noteBody: an attachment with no text is an ATTACHMENT event
// whose body is the file name.
func noteKind(text string, a *db.CoreMediaasset) string {
	if a != nil && text == "" {
		return "ATTACHMENT"
	}
	return "NOTE"
}

func noteBody(text string, a *db.CoreMediaasset) string {
	if text == "" && a != nil {
		text = a.OriginalFilename
	}
	return truncate(text, 4000)
}

func assetID(a *db.CoreMediaasset) *uuid.UUID {
	if a == nil {
		return nil
	}
	return &a.ID
}

// OpenIn is SupportCaseService.open_case's arguments.
type OpenIn struct {
	Account                 uuid.UUID
	AccountLabel            string // display_name or kura_id (staff notice)
	Subject, Kind, Priority string
	Driver, OpenedBy        *uuid.UUID
	Actor                   *events.Actor
	Body                    string
	Attachment, Payment     *uuid.UUID
}

// OpenCase is SupportCaseService.open_case; returns the case id and code.
func OpenCase(ctx context.Context, q *db.Queries, in OpenIn) (uuid.UUID, string, error) {
	subject := strings.TrimSpace(in.Subject)
	if subject == "" {
		return uuid.Nil, "", apperr.New("VALIDATION_ERROR", "Case subject is required.")
	}
	asset, err := attachment(ctx, q, in.OpenedBy, in.Attachment)
	if err != nil {
		return uuid.Nil, "", err
	}
	pay, err := payment(ctx, q, in.Account, in.Payment)
	if err != nil {
		return uuid.Nil, "", err
	}
	id, code := ids.New(), ""
	for i := 0; i < 8 && code == ""; i++ {
		c := caseCode()
		taken, err := q.CaseCodeTaken(ctx, c)
		if err != nil {
			return uuid.Nil, "", err
		}
		if !taken {
			code = c
		}
	}
	if code == "" {
		return uuid.Nil, "", apperr.New("INTEGRATION_ERROR", "Could not allocate case code.")
	}
	due := slaDue(in.Priority)
	if err := q.InsertCase(ctx, db.InsertCaseParams{ID: id, Code: code, Kind: in.Kind, Priority: in.Priority,
		Subject: truncate(subject, 200), SlaDueAt: &due, AccountID: in.Account, DriverID: in.Driver,
		OpenedByID: in.OpenedBy, PaymentID: pay}); err != nil {
		return uuid.Nil, "", err
	}
	text := strings.TrimSpace(in.Body)
	if text != "" || asset != nil {
		if err := q.InsertCaseEvent(ctx, db.InsertCaseEventParams{ID: ids.New(), Kind: noteKind(text, asset),
			Body: noteBody(text, asset), ActorID: in.OpenedBy, CaseID: id, AttachmentID: assetID(asset)}); err != nil {
			return uuid.Nil, "", err
		}
	}
	var payID any
	if pay != nil {
		payID = pay.String()
	}
	err = events.Emit(ctx, q, events.Event{Action: "support_case.opened", SubjectType: "support_case",
		SubjectID: id.String(), SubjectLabel: code, Actor: in.Actor,
		Metadata: events.Map{"account_id": in.Account.String(), "kind": in.Kind, "has_attachment": asset != nil,
			"payment_id": payID}})
	if err == nil {
		err = notifyStaff(ctx, q, id, nil, "New case "+code, in.AccountLabel+": "+truncate(subject, 200),
			"support.opened:"+id.String())
	}
	return id, code, err
}

// notifyStaff is notify_case_staff: the active assignee, else up to 25
// active Super Admins / Ops Managers.
func notifyStaff(ctx context.Context, q *db.Queries, caseID uuid.UUID, assignee *uuid.UUID, title, body, dedupe string) error {
	var users []uuid.UUID
	if assignee != nil {
		if u, err := q.ActiveUser(ctx, *assignee); err == nil && u.IsActive {
			users = []uuid.UUID{u.ID}
		} else if err != nil && !database.IsNoRows(err) {
			return err
		}
	}
	if users == nil {
		var err error
		if users, err = q.RiskReviewers(ctx); err != nil {
			return err
		}
	}
	for _, u := range users {
		if err := events.Notify(ctx, q, events.NotifySpec{UserID: u, Title: title, Body: body, Source: "Support",
			Severity: events.Info, TemplateCode: "support.case.update", LinkPath: "/cases/" + caseID.String(),
			DedupeKey: dedupe + ":" + u.String()}); err != nil {
			return err
		}
	}
	return nil
}

// notifyRider is notify_case_rider (active account owner only).
func notifyRider(ctx context.Context, q *db.Queries, caseID, owner uuid.UUID, title, body, dedupe string) error {
	u, err := q.ActiveUser(ctx, owner)
	if database.IsNoRows(err) || (err == nil && !u.IsActive) {
		return nil
	}
	if err != nil {
		return err
	}
	return events.Notify(ctx, q, events.NotifySpec{UserID: owner, Title: title, Body: body, Source: "Support",
		Severity: events.Info, TemplateCode: "support.case.update", LinkPath: "/account/cases/" + caseID.String(),
		DedupeKey: dedupe + ":" + owner.String()})
}

// titleCase is str.title() for the status line ("Resolved").
func titleCase(s string) string {
	words := strings.Fields(strings.ToLower(strings.ReplaceAll(s, "_", " ")))
	for i, w := range words {
		words[i] = strings.ToUpper(w[:1]) + w[1:]
	}
	return strings.Join(words, " ")
}

func userLabel(email, phone *string, id uuid.UUID) string {
	if email != nil && *email != "" {
		return *email
	}
	if phone != nil && *phone != "" {
		return *phone
	}
	return id.String()
}
