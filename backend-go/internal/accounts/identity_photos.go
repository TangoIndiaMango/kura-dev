package accounts

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
)

// AdjustPhotos is IdentityService.adjust_photos: re-upload the ID card (and
// optionally the face) while review is pending, or to complete a verified
// identity that is missing photos.
func (s *IdentityService) AdjustPhotos(ctx context.Context, user db.AccountsUser, front, back uuid.UUID,
	face *uuid.UUID) (KYC, error) {
	var out KYC
	err := database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		acct, err := ownAccount(ctx, q, user.ID, "Complete profile before submitting ID.")
		if err != nil {
			return err
		}
		if acct.KycStatus != "PENDING" && acct.KycStatus != "VERIFIED" {
			return apperr.New("INVALID_TRANSITION", "Photo updates are only allowed while KYC is pending review.")
		}
		drv, err := q.DriverRowByUser(ctx, user.ID)
		hasDriver := err == nil
		if err != nil && !database.IsNoRows(err) {
			return err
		}
		if acct.KycStatus == "VERIFIED" {
			probe, err := q.LatestIdentityDoc(ctx, acct.ID)
			if err != nil && !database.IsNoRows(err) {
				return err
			}
			incomplete := err != nil || probe.FrontImageID == nil || probe.BackImageID == nil ||
				!hasDriver || drv.PhotoID == nil
			if !incomplete {
				return apperr.New("INVALID_TRANSITION",
					"Identity is already complete. Contact support to change ID photos.")
			}
		}
		for _, id := range []uuid.UUID{front, back} {
			if _, err := ownedAsset(ctx, q, user.ID, &id); err != nil {
				return err
			}
		}
		doc, err := q.LatestIdentityDocForUpdate(ctx, acct.ID)
		if database.IsNoRows(err) {
			return apperr.New("KYC_REQUIRED", "Submit identity first, then attach photos.")
		}
		if err != nil {
			return err
		}
		if face != nil {
			if _, err := ownedAsset(ctx, q, user.ID, face); err != nil {
				return err
			}
			if hasDriver {
				if err := q.SetDriverPhoto(ctx, db.SetDriverPhotoParams{ID: drv.ID, PhotoID: face}); err != nil {
					return err
				}
				drv.PhotoID = face
			}
		}
		before := events.Map{"photos_requested": doc.PhotosRequested, "front_image_id": uuidOrNil(doc.FrontImageID),
			"back_image_id": uuidOrNil(doc.BackImageID)}
		if err := q.SetIdentityDocPhotos(ctx, db.SetIdentityDocPhotosParams{ID: doc.ID, FrontImageID: &front,
			BackImageID: &back}); err != nil {
			return err
		}
		doc.FrontImageID, doc.BackImageID, doc.PhotosRequested, doc.RequestNote = &front, &back, false, ""
		if err := events.Emit(ctx, q, events.Event{Action: "kyc.photos_updated", SubjectType: "account",
			SubjectID: acct.ID.String(), SubjectLabel: firstNonEmpty(acct.KuraID, acct.DisplayName, acct.ID.String()),
			Actor: actorOf(user), Before: before, After: events.Map{"photos_requested": false,
				"front_image_id": front.String(), "back_image_id": back.String()}}); err != nil {
			return err
		}
		var d *db.AccountsDriver
		if hasDriver {
			d = &drv
		}
		out, err = kycPayload(ctx, q, s.cdn, acct.ID, d, &doc)
		return err
	})
	return out, err
}

// Withdraw is withdraw_identity: a rider removes a not-yet-verified ID pack.
func (s *IdentityService) Withdraw(ctx context.Context, user db.AccountsUser) (KYC, error) {
	var out KYC
	err := database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		acct, err := ownAccount(ctx, q, user.ID, "Complete profile before withdrawing ID.")
		if err != nil {
			return err
		}
		if acct, err = q.AccountForUpdate(ctx, acct.ID); err != nil {
			return err
		}
		if acct.KycStatus == "VERIFIED" {
			return apperr.New("INVALID_TRANSITION",
				"Verified identity cannot be withdrawn. Contact support if you need a change.")
		}
		removed, err := q.DeleteIdentityDocs(ctx, acct.ID)
		if err != nil {
			return err
		}
		var rider *db.AccountsDriver
		if d, err := q.DriverRowByUser(ctx, user.ID); err == nil && d.AccountID == acct.ID {
			if d.PhotoID != nil {
				if err := q.SetDriverPhoto(ctx, db.SetDriverPhotoParams{ID: d.ID, PhotoID: nil}); err != nil {
					return err
				}
				d.PhotoID = nil
			}
			rider = &d
		} else if err != nil && !database.IsNoRows(err) {
			return err
		}
		if err := q.SetAccountKycStatus(ctx, db.SetAccountKycStatusParams{ID: acct.ID, KycStatus: "NONE"}); err != nil {
			return err
		}
		if err := events.Emit(ctx, q, events.Event{Action: "kyc.withdrawn", SubjectType: "account",
			SubjectID: acct.ID.String(), SubjectLabel: firstNonEmpty(acct.KuraID, acct.DisplayName, acct.ID.String()),
			Actor: actorOf(user), Before: events.Map{"kyc_status": acct.KycStatus},
			After: events.Map{"kyc_status": "NONE", "docs_removed": removed}}); err != nil {
			return err
		}
		out, err = kycPayload(ctx, q, s.cdn, acct.ID, rider, nil)
		return err
	})
	return out, err
}

func uuidOrNil(id *uuid.UUID) any {
	if id == nil {
		return nil
	}
	return id.String()
}
