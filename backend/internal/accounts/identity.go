package accounts

import (
	"context"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/integrations/va"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/media"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/djsign"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
)

var docTypes = map[string]bool{"NIN": true, "BVN": true, "VOTER": true, "DRIVERS_LICENCE": true, "PASSPORT": true}

// IdentityService is accounts.services.identity (+ review / withdraw).
type IdentityService struct {
	pool   *pgxpool.Pool
	q      *db.Queries
	cdn    media.Cloudinary
	va     *va.Service
	policy string // consent policy version
	secret string // SECRET_KEY: ID numbers are signed with it (core.helpers.crypto)
}

func NewIdentityService(pool *pgxpool.Pool, cdn media.Cloudinary, vaSvc *va.Service, policy, secret string) *IdentityService {
	return &IdentityService{pool: pool, q: db.New(pool), cdn: cdn, va: vaSvc, policy: policy, secret: secret}
}

// SubmitInput is IdentitySubmitSerializer's validated data.
type SubmitInput struct {
	DisplayName, IDType, IDNumber, Channel string
	Face, Front, Back                      uuid.UUID
	ConsentService, ConsentDataSharing     bool
}

// Submit is IdentityService.submit. account is set for staff-assisted
// submits (kyc/submit), where staff upload the photos and record consent.
func (s *IdentityService) Submit(ctx context.Context, user db.AccountsUser, in SubmitInput, account *uuid.UUID,
	staff *db.AccountsUser) (KYC, error) {
	var out KYC
	var jobs []vaJob
	err := database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		docType := strings.ToUpper(strings.TrimSpace(in.IDType))
		number := alnum(in.IDNumber)
		name := strings.TrimSpace(in.DisplayName)
		var acct db.AccountsAccount
		if account != nil {
			a, err := q.AccountByID(ctx, *account)
			if err != nil {
				return err
			}
			acct = a
			if name == "" {
				name = a.DisplayName
			}
		}
		if utf8.RuneCountInString(name) < 2 {
			return apperr.New("VALIDATION_ERROR", "Full name is required.").
				WithDetails(apperr.Details{"display_name": []string{"required"}})
		}
		if !docTypes[docType] {
			return apperr.New("VALIDATION_ERROR", "Unsupported ID type.").
				WithDetails(apperr.Details{"id_type": []string{"invalid"}})
		}
		if account == nil {
			res, err := completeProfile(ctx, q, user, name, "", "", "")
			if err != nil {
				return err
			}
			jobs = append(jobs, res.VA...)
			if acct, err = ownAccount(ctx, q, user.ID, "Complete profile before submitting ID."); err != nil {
				return err
			}
		}
		consenter, channel := user, in.Channel
		if staff != nil {
			consenter = *staff
			if channel == "" && staff.ID != user.ID {
				channel = "HUB"
			}
		}
		if err := s.recordConsent(ctx, q, consenter, acct, in); err != nil {
			return err
		}
		existing, err := q.IdentityDocByTypeForUpdate(ctx, db.IdentityDocByTypeForUpdateParams{AccountID: acct.ID,
			DocType: docType})
		hasExisting := err == nil
		if err != nil && !database.IsNoRows(err) {
			return err
		}
		keep := number == "" && hasExisting && existing.NumberEncrypted != ""
		if !keep && len(number) < 8 {
			return apperr.New("VALIDATION_ERROR", "ID number looks too short.").
				WithDetails(apperr.Details{"id_number": []string{"invalid"}})
		}
		owner := user.ID
		if staff != nil {
			owner = staff.ID
		}
		if _, err := ownedAsset(ctx, q, owner, &in.Face); err != nil {
			return err
		}
		for _, id := range []uuid.UUID{in.Front, in.Back} {
			if _, err := ownedAsset(ctx, q, owner, &id); err != nil {
				return err
			}
		}
		drv, err := getOrCreateDriver(ctx, q, user.ID, acct.ID)
		if err != nil {
			return err
		}
		face := in.Face
		if err := q.SetDriverPhotoAccount(ctx, db.SetDriverPhotoAccountParams{ID: drv.ID, PhotoID: &face,
			AccountID: acct.ID}); err != nil {
			return err
		}
		drv.PhotoID, drv.AccountID = &face, acct.ID

		enc, last4 := existing.NumberEncrypted, existing.NumberLast4
		if !keep {
			last4 = number[max(0, len(number)-4):]
			if enc, err = djsign.Dumps(number, s.secret, "kura.identity.v1"); err != nil {
				return err
			}
		}
		front, back := in.Front, in.Back
		if hasExisting {
			err = q.ResubmitIdentityDoc(ctx, db.ResubmitIdentityDocParams{ID: existing.ID, DocType: docType,
				NumberEncrypted: enc, NumberLast4: last4, FrontImageID: &front, BackImageID: &back})
		} else {
			existing.ID = ids.New()
			err = q.InsertIdentityDoc(ctx, db.InsertIdentityDocParams{ID: existing.ID, DocType: docType,
				NumberEncrypted: enc, NumberLast4: last4, AccountID: acct.ID, FrontImageID: &front, BackImageID: &back})
		}
		if err != nil {
			return err
		}
		if err := q.SetAccountKycStatus(ctx, db.SetAccountKycStatusParams{ID: acct.ID, KycStatus: "PENDING"}); err != nil {
			return err
		}
		if err := s.finishOnboarding(ctx, q, user.ID); err != nil {
			return err
		}
		if v, err := q.VirtualAccountRow(ctx, acct.ID); err != nil && !database.IsNoRows(err) {
			return err
		} else if err != nil || v.Status != "ACTIVE" || v.Nuban == nil || *v.Nuban == "" {
			jobs = append(jobs, vaJob{Account: acct.ID, BVNOrNIN: number})
		}
		if staff != nil && staff.ID != user.ID {
			if err := events.Emit(ctx, q, events.Event{Action: "kyc.submitted_by_admin", SubjectType: "account",
				SubjectID: acct.ID.String(), SubjectLabel: firstNonEmpty(acct.KuraID, acct.DisplayName),
				Actor: actorOf(*staff), After: events.Map{"doc_type": docType, "id_last4": last4,
					"kyc_status": "PENDING"}}); err != nil {
				return err
			}
		}
		doc, err := q.IdentityDocByID(ctx, existing.ID) // the submitted document, not merely the newest
		if err != nil {
			return err
		}
		out, err = kycPayload(ctx, q, s.cdn, acct.ID, &drv, &doc)
		return err
	})
	if err != nil {
		return KYC{}, err
	}
	s.scheduleVA(jobs)
	return out, nil
}

// recordConsent is _record_consent: SERVICE consent is required before we
// hold ID data (granted now or already on file); DATA_SHARING is opt-in.
func (s *IdentityService) recordConsent(ctx context.Context, q *db.Queries, who db.AccountsUser,
	acct db.AccountsAccount, in SubmitInput) error {
	now := time.Now()
	if in.ConsentService {
		if err := grantConsent(ctx, q, actorOf(who), acct.ID, acct.KuraID, "SERVICE", in.Channel, s.policy, now); err != nil {
			return err
		}
	} else if ok, err := hasServiceConsent(ctx, q, acct.ID, s.policy); err != nil {
		return err
	} else if !ok {
		return apperr.New("CONSENT_REQUIRED", "Agree to the Kura service terms to submit your ID.").
			WithDetails(apperr.Details{"consent_service": []string{"required"}})
	}
	if in.ConsentDataSharing {
		return grantConsent(ctx, q, actorOf(who), acct.ID, acct.KuraID, "DATA_SHARING", in.Channel, s.policy, now)
	}
	return nil
}

// finishOnboarding moves a rider still at PIN / PROFILE to DONE.
func (s *IdentityService) finishOnboarding(ctx context.Context, q *db.Queries, user uuid.UUID) error {
	u, err := q.GetUserByID(ctx, user)
	if err != nil || (u.OnboardingStep != stepPIN && u.OnboardingStep != stepProfile) {
		return err
	}
	return q.SetUserOnboardingStep(ctx, db.SetUserOnboardingStepParams{ID: user, OnboardingStep: stepDone})
}

func (s *IdentityService) scheduleVA(jobs []vaJob) {
	if s.va == nil || len(jobs) == 0 {
		return
	}
	out := make([]va.Job, len(jobs))
	for i, j := range jobs {
		out[i] = va.Job{Account: j.Account, BVNOrNIN: j.BVNOrNIN}
	}
	s.va.Schedule(out...)
}

// ownAccount is IdentityService._own_account: the rider's driver account,
// else their first owned account.
func ownAccount(ctx context.Context, q *db.Queries, user uuid.UUID, missing string) (db.AccountsAccount, error) {
	if d, err := q.DriverRowByUser(ctx, user); err == nil {
		return q.AccountByID(ctx, d.AccountID)
	} else if !database.IsNoRows(err) {
		return db.AccountsAccount{}, err
	}
	a, err := q.FirstOwnedAccount(ctx, user)
	if database.IsNoRows(err) {
		return a, apperr.New("ACCOUNT_REQUIRED", missing)
	}
	return a, err
}

// getOrCreateDriver is Driver.objects.get_or_create(user=..., defaults={"account": ...}).
func getOrCreateDriver(ctx context.Context, q *db.Queries, user, account uuid.UUID) (db.AccountsDriver, error) {
	d, err := q.DriverRowByUser(ctx, user)
	if database.IsNoRows(err) {
		return q.InsertDriverRow(ctx, db.InsertDriverRowParams{ID: ids.New(), AccountID: account, UserID: user})
	}
	return d, err
}
