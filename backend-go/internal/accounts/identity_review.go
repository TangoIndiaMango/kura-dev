package accounts

import (
	"context"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
)

var verifyVia = map[string]bool{"PSP": true, "PROVIDER": true, "MANUAL": true}

func noDocument() error {
	return apperr.New("KYC_REQUIRED", "Operator has not submitted an identity document yet.")
}

// review runs fn on the account's latest document (locked) and returns the
// KYC payload for that document afterwards.
func (s *IdentityService) review(ctx context.Context, accountID uuid.UUID,
	fn func(q *db.Queries, acct db.AccountsAccount, doc *db.AccountsIdentitydocument) error) (KYC, error) {
	var out KYC
	err := database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		acct, err := q.AccountByID(ctx, accountID)
		if err != nil {
			return err
		}
		doc, err := q.LatestIdentityDocForUpdate(ctx, accountID)
		if database.IsNoRows(err) {
			return noDocument()
		}
		if err != nil {
			return err
		}
		if err := fn(q, acct, &doc); err != nil {
			return err
		}
		out, err = kycPayload(ctx, q, s.cdn, accountID, nil, &doc)
		return err
	})
	return out, err
}

// ownerNote is _notify_owner's notification to the account owner.
func ownerNote(acct db.AccountsAccount, title, body, template, dedupe string) []events.NotifySpec {
	return []events.NotifySpec{{UserID: acct.OwnerUserID, Title: title, Body: body, Source: "Users",
		LinkPath: "/account/identity", TemplateCode: template, DedupeKey: dedupe}}
}

func accountLabel(a db.AccountsAccount) string {
	return firstNonEmpty(a.KuraID, a.DisplayName, a.ID.String())
}

// Verify is verify_identity: needs both ID card photos and a face photo.
func (s *IdentityService) Verify(ctx context.Context, staff db.AccountsUser, accountID uuid.UUID, via, note string) (KYC, error) {
	via = strings.ToUpper(strings.TrimSpace(via))
	if via == "" {
		via = "MANUAL"
	}
	if !verifyVia[via] {
		return KYC{}, apperr.New("VALIDATION_ERROR", "Invalid verification channel.").
			WithDetails(apperr.Details{"via": []string{"invalid"}})
	}
	return s.review(ctx, accountID, func(q *db.Queries, acct db.AccountsAccount, doc *db.AccountsIdentitydocument) error {
		if doc.FrontImageID == nil || doc.BackImageID == nil {
			return apperr.New("KYC_PHOTOS_REQUIRED", "Front and back ID card photos are required before verification.")
		}
		drv, err := q.FirstDriverRow(ctx, acct.ID)
		if err != nil && !database.IsNoRows(err) {
			return err
		}
		if err != nil || drv.PhotoID == nil {
			return apperr.New("KYC_PHOTOS_REQUIRED", "A face photo is required before verification.")
		}
		if doc.Status == "VERIFIED" && acct.KycStatus == "VERIFIED" {
			return nil
		}
		now := time.Now()
		before := events.Map{"kyc_status": acct.KycStatus, "doc_status": doc.Status}
		if err := q.SetIdentityDocReview(ctx, db.SetIdentityDocReviewParams{ID: doc.ID, Status: "VERIFIED",
			VerifiedVia: via, VerifiedAt: &now}); err != nil {
			return err
		}
		doc.Status, doc.VerifiedVia, doc.VerifiedAt, doc.RejectReason = "VERIFIED", via, &now, ""
		doc.PhotosRequested, doc.RequestNote = false, ""
		if err := q.SetAccountKycStatus(ctx, db.SetAccountKycStatusParams{ID: acct.ID, KycStatus: "VERIFIED"}); err != nil {
			return err
		}
		label := accountLabel(acct)
		return events.Emit(ctx, q, events.Event{Action: "kyc.verified", SubjectType: "account",
			SubjectID: acct.ID.String(), SubjectLabel: label, Actor: actorOf(staff), Before: before,
			After:    events.Map{"kyc_status": "VERIFIED", "doc_status": "VERIFIED"},
			Metadata: events.Map{"via": via, "note": truncate(note, 200)},
			Notify: ownerNote(acct, "Identity verified", fmt.Sprintf("Your KURA identity (%s) is verified. "+
				"Full funding and credit unlock when risk allows.", label), "kyc.verified", "kyc.verified:"+acct.ID.String())})
	})
}

// Reject is reject_identity.
func (s *IdentityService) Reject(ctx context.Context, staff db.AccountsUser, accountID uuid.UUID, reason string) (KYC, error) {
	reason = strings.TrimSpace(reason)
	if utf8.RuneCountInString(reason) < 3 {
		return KYC{}, apperr.New("VALIDATION_ERROR", "Rejection reason is required.").
			WithDetails(apperr.Details{"reason": []string{"required"}})
	}
	return s.review(ctx, accountID, func(q *db.Queries, acct db.AccountsAccount, doc *db.AccountsIdentitydocument) error {
		before := events.Map{"kyc_status": acct.KycStatus, "doc_status": doc.Status}
		stored := truncate(reason, 255)
		if err := q.SetIdentityDocReview(ctx, db.SetIdentityDocReviewParams{ID: doc.ID, Status: "REJECTED",
			RejectReason: stored}); err != nil {
			return err
		}
		doc.Status, doc.VerifiedVia, doc.VerifiedAt, doc.RejectReason = "REJECTED", "", nil, stored
		doc.PhotosRequested, doc.RequestNote = false, ""
		if err := q.SetAccountKycStatus(ctx, db.SetAccountKycStatusParams{ID: acct.ID, KycStatus: "REJECTED"}); err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "kyc.rejected", SubjectType: "account",
			SubjectID: acct.ID.String(), SubjectLabel: accountLabel(acct), Actor: actorOf(staff), Before: before,
			After:    events.Map{"kyc_status": "REJECTED", "doc_status": "REJECTED"},
			Metadata: events.Map{"reason": reason},
			Notify: ownerNote(acct, "Identity needs a resubmit", truncate(reason, 160), "kyc.rejected",
				fmt.Sprintf("kyc.rejected:%s:%d", acct.ID, time.Now().Unix()))})
	})
}

// RequestPhotos is request_identity_photos: ask the rider to fix photos
// while review is pending.
func (s *IdentityService) RequestPhotos(ctx context.Context, staff db.AccountsUser, accountID uuid.UUID, note string) (KYC, error) {
	note = strings.TrimSpace(note)
	if utf8.RuneCountInString(note) < 3 {
		return KYC{}, apperr.New("VALIDATION_ERROR", "Tell the operator what to fix (e.g. blurry ID front).").
			WithDetails(apperr.Details{"note": []string{"required"}})
	}
	acct, err := s.q.AccountByID(ctx, accountID)
	if err != nil {
		return KYC{}, err
	}
	if acct.KycStatus != "PENDING" {
		return KYC{}, apperr.New("INVALID_TRANSITION",
			"Photo adjustments can only be requested while KYC is pending review.")
	}
	return s.review(ctx, accountID, func(q *db.Queries, acct db.AccountsAccount, doc *db.AccountsIdentitydocument) error {
		before := events.Map{"kyc_status": acct.KycStatus, "photos_requested": doc.PhotosRequested,
			"request_note": doc.RequestNote}
		stored := truncate(note, 255)
		if err := q.SetIdentityDocPhotoRequest(ctx, db.SetIdentityDocPhotoRequestParams{ID: doc.ID,
			RequestNote: stored}); err != nil {
			return err
		}
		doc.PhotosRequested, doc.RequestNote = true, stored
		return events.Emit(ctx, q, events.Event{Action: "kyc.photos_requested", SubjectType: "account",
			SubjectID: acct.ID.String(), SubjectLabel: accountLabel(acct), Actor: actorOf(staff), Before: before,
			After:    events.Map{"kyc_status": acct.KycStatus, "photos_requested": true, "request_note": stored},
			Metadata: events.Map{"note": truncate(note, 200)},
			Notify: ownerNote(acct, "Update your ID photos", truncate(note, 160), "kyc.photos_requested",
				fmt.Sprintf("kyc.photos_requested:%s:%d", acct.ID, time.Now().Unix()))})
	})
}
