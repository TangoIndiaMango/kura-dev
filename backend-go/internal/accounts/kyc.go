package accounts

import (
	"context"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/media"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
)

// KYC is accounts.helpers.kyc.kyc_payload.
type KYC struct {
	Status          string  `json:"status"`
	AccountStatus   string  `json:"account_status"`
	IDType          *string `json:"id_type"`
	IDLast4         *string `json:"id_last4"`
	DocumentStatus  *string `json:"document_status"`
	VerifiedVia     *string `json:"verified_via"`
	RejectReason    *string `json:"reject_reason"`
	RequestNote     *string `json:"request_note"`
	PhotosRequested bool    `json:"photos_requested"`
	FaceAssetID     *string `json:"face_asset_id"`
	PhotoURL        *string `json:"photo_url"`
	IDFrontAssetID  *string `json:"id_front_asset_id"`
	IDBackAssetID   *string `json:"id_back_asset_id"`
	IDFrontURL      *string `json:"id_front_url"`
	IDBackURL       *string `json:"id_back_url"`
	VAStatus        *string `json:"virtual_account_status"`
	VANuban         *string `json:"virtual_account_nuban"`
	NextAction      string  `json:"next_action"`
}

// buildKYC derives the identity state and the rider's next step. doc is
// the document to describe; nil loads the latest (kyc_payload(doc=None)).
func buildKYC(ctx context.Context, q *db.Queries, cdn media.Cloudinary, acct db.AccountsAccount, photoID *uuid.UUID,
	hasDriver bool, given ...*db.AccountsIdentitydocument) (KYC, error) {
	k := KYC{Status: acct.KycStatus, AccountStatus: acct.Status}
	var doc db.AccountsIdentitydocument
	var err error
	if len(given) > 0 && given[0] != nil {
		doc = *given[0]
	} else {
		doc, err = q.LatestIdentityDoc(ctx, acct.ID)
	}
	hasDoc := err == nil
	if err != nil && !database.IsNoRows(err) {
		return k, err
	}
	if k.Status == "PENDING" && !hasDoc {
		k.Status = "NONE"
	}
	if va, err := q.VirtualAccountFor(ctx, acct.ID); err == nil {
		k.VAStatus, k.VANuban = &va.Status, va.Nuban
	} else if !database.IsNoRows(err) {
		return k, err
	}

	photosRequested := hasDoc && doc.PhotosRequested
	missingCards := !hasDoc || doc.FrontImageID == nil || doc.BackImageID == nil
	missingFace := !hasDriver || photoID == nil
	verifiedIncomplete := k.Status == "VERIFIED" && (missingCards || missingFace)

	switch {
	case k.Status == "PENDING" && hasDoc && photosRequested, verifiedIncomplete:
		k.NextAction = "upload_photos"
	case k.Status == "PENDING" && hasDoc:
		k.NextAction = "wait_for_review"
	case k.Status == "PENDING_PSP":
		k.NextAction = "wait_for_va"
	case k.Status == "NONE" || k.Status == "PROVISIONAL":
		k.NextAction = "submit"
	case k.Status == "REJECTED":
		k.NextAction = "resubmit"
	default:
		k.NextAction = "none"
	}
	k.PhotosRequested = photosRequested || verifiedIncomplete

	if photoID != nil {
		k.FaceAssetID = strPtr(photoID.String())
		if k.PhotoURL, err = assetURL(ctx, q, cdn, photoID); err != nil {
			return k, err
		}
	}
	if hasDoc {
		k.IDType, k.IDLast4, k.DocumentStatus = &doc.DocType, &doc.NumberLast4, &doc.Status
		k.VerifiedVia, k.RejectReason = nonEmpty(doc.VerifiedVia), nonEmpty(doc.RejectReason)
		k.RequestNote = nonEmpty(doc.RequestNote)
		if doc.FrontImageID != nil {
			k.IDFrontAssetID = strPtr(doc.FrontImageID.String())
		}
		if doc.BackImageID != nil {
			k.IDBackAssetID = strPtr(doc.BackImageID.String())
		}
		if k.IDFrontURL, err = assetURL(ctx, q, cdn, doc.FrontImageID); err != nil {
			return k, err
		}
		if k.IDBackURL, err = assetURL(ctx, q, cdn, doc.BackImageID); err != nil {
			return k, err
		}
	}
	if k.RequestNote == nil && verifiedIncomplete {
		k.RequestNote = strPtr("Face and ID card photos are required to complete verification.")
	}
	return k, nil
}

// assetURL resolves a media asset id to its delivery URL (nil if absent).
func assetURL(ctx context.Context, q *db.Queries, cdn media.Cloudinary, id *uuid.UUID) (*string, error) {
	if id == nil {
		return nil, nil
	}
	a, err := q.MediaAssetByID(ctx, *id)
	if database.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return cdn.DeliveryURL(&media.Asset{Provider: a.Provider, StorageKey: a.StorageKey,
		ResourceType: a.ResourceType, Visibility: a.Visibility}), nil
}

// kycPayload is kyc_payload(account, driver=..., doc=...): a nil driver
// means the account's first driver, a nil doc the latest document.
func kycPayload(ctx context.Context, q *db.Queries, cdn media.Cloudinary, accountID uuid.UUID,
	drv *db.AccountsDriver, doc *db.AccountsIdentitydocument) (KYC, error) {
	acct, err := q.AccountByID(ctx, accountID)
	if err != nil {
		return KYC{}, err
	}
	if drv == nil {
		d, err := q.FirstDriverRow(ctx, accountID)
		if err == nil {
			drv = &d
		} else if !database.IsNoRows(err) {
			return KYC{}, err
		}
	}
	var photo *uuid.UUID
	if drv != nil {
		photo = drv.PhotoID
	}
	return buildKYC(ctx, q, cdn, acct, photo, drv != nil, doc)
}

func strPtr(s string) *string { return &s }

// nonEmpty is Python's `x if x else None` for strings.
func nonEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
