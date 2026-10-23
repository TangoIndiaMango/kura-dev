package accounts

import (
	"context"
	"encoding/json"
	"sort"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/media"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
)

// AccountDTO is accounts.serializers.AccountSerializer.
type AccountDTO struct {
	ID                  string         `json:"id"`
	KuraID              string         `json:"kura_id"`
	OwnerUser           string         `json:"owner_user"`
	Kind                string         `json:"kind"`
	DisplayName         string         `json:"display_name"`
	Status              string         `json:"status"`
	KycStatus           string         `json:"kyc_status"`
	RegistrationChannel string         `json:"registration_channel"`
	CreatedAt           jsontime.Field `json:"created_at"`
}

func toAccountDTO(a db.AccountsAccount) AccountDTO {
	return AccountDTO{ID: a.ID.String(), KuraID: a.KuraID, OwnerUser: a.OwnerUserID.String(),
		Kind: a.Kind, DisplayName: a.DisplayName, Status: a.Status, KycStatus: a.KycStatus,
		RegistrationChannel: a.RegistrationChannel, CreatedAt: jsontime.Field(a.CreatedAt)}
}

// Me is the GET /auth/me body (accounts.selectors.me_payload).
type Me struct {
	User              UserDTO         `json:"user"`
	Account           *AccountDTO     `json:"account"`
	Capabilities      []string        `json:"capabilities"`
	OnboardingStep    string          `json:"onboarding_step"`
	IsDriver          bool            `json:"is_driver"`
	IsStaff           bool            `json:"is_staff"`
	HasPin            bool            `json:"has_pin"`
	PhotoURL          *string         `json:"photo_url"`
	NotificationPrefs map[string]bool `json:"notification_prefs"`
	KYC               *KYC            `json:"kyc"`
	Consent           *ConsentState   `json:"consent"`
}

// MeService builds the profile payload every app loads on start.
type MeService struct {
	q      *db.Queries
	cdn    media.Cloudinary
	policy string
}

func NewMeService(q *db.Queries, cdn media.Cloudinary, policy string) *MeService {
	return &MeService{q: q, cdn: cdn, policy: policy}
}

var staffRoles = map[string]bool{"SUPER_ADMIN": true, "OPS_MANAGER": true, "HUB_AGENT": true,
	"COMMERCIAL_ADMIN": true}

// Payload mirrors me_payload, including reconcile_onboarding's healing.
func (s *MeService) Payload(ctx context.Context, userID uuid.UUID, caps map[string]bool) (Me, error) {
	u, err := s.q.GetUserByID(ctx, userID)
	if err != nil {
		return Me{}, err
	}
	if step := reconciledStep(u.OnboardingStep, u.PinHash != ""); step != u.OnboardingStep {
		if err := s.q.SetOnboardingStep(ctx, db.SetOnboardingStepParams{ID: u.ID, OnboardingStep: step}); err != nil {
			return Me{}, err
		}
		u.OnboardingStep = step
	}
	user, err := loadUserDTO(ctx, s.q, userID)
	if err != nil {
		return Me{}, err
	}
	out := Me{User: user, Capabilities: sortedCaps(caps), OnboardingStep: u.OnboardingStep,
		IsDriver: u.Role == "DRIVER", IsStaff: u.IsStaff || staffRoles[u.Role],
		HasPin: u.PinHash != "", NotificationPrefs: NormalizePrefs(u.NotificationPrefs)}

	acct, photoID, hasDriver, err := s.accountFor(ctx, userID)
	if err != nil {
		return Me{}, err
	}
	if out.PhotoURL, err = assetURL(ctx, s.q, s.cdn, u.AvatarID); err != nil {
		return Me{}, err
	}
	if out.PhotoURL == nil && hasDriver {
		if out.PhotoURL, err = assetURL(ctx, s.q, s.cdn, photoID); err != nil {
			return Me{}, err
		}
	}
	if acct != nil {
		dto := toAccountDTO(*acct)
		out.Account = &dto
		k, err := buildKYC(ctx, s.q, s.cdn, *acct, photoID, hasDriver)
		if err != nil {
			return Me{}, err
		}
		c, err := consentState(ctx, s.q, acct.ID, acct.KycStatus, s.policy)
		if err != nil {
			return Me{}, err
		}
		out.KYC, out.Consent = &k, &c
	}
	return out, nil
}

// accountFor is the driver's account, else the user's first owned account.
func (s *MeService) accountFor(ctx context.Context, userID uuid.UUID) (*db.AccountsAccount, *uuid.UUID, bool, error) {
	d, err := s.q.DriverForUser(ctx, userID)
	if err == nil {
		a, err := s.q.AccountByID(ctx, d.AccountID)
		if err != nil {
			return nil, nil, false, err
		}
		return &a, d.PhotoID, true, nil
	}
	if !database.IsNoRows(err) {
		return nil, nil, false, err
	}
	a, err := s.q.FirstOwnedAccount(ctx, userID)
	if database.IsNoRows(err) {
		return nil, nil, false, nil
	}
	if err != nil {
		return nil, nil, false, err
	}
	return &a, nil, false, nil
}

// reconciledStep: a set PIN moves past "pin"; vehicle/plan are home tasks.
func reconciledStep(step string, hasPin bool) string {
	if hasPin && step == "pin" {
		step = "profile"
	}
	if step == "vehicle" || step == "plan" {
		step = "home"
	}
	return step
}

var prefKeys = []string{"email", "push", "swap_sms", "payment_alerts", "plan_expiry", "loan_updates"}

// NormalizePrefs is normalized_notif_prefs: known keys, default on, truthy.
func NormalizePrefs(raw []byte) map[string]bool {
	var in map[string]any
	_ = json.Unmarshal(raw, &in)
	out := make(map[string]bool, len(prefKeys))
	for _, k := range prefKeys {
		v, ok := in[k]
		out[k] = !ok || truthy(v)
	}
	return out
}

func truthy(v any) bool {
	switch x := v.(type) {
	case nil:
		return false
	case bool:
		return x
	case float64:
		return x != 0
	case string:
		return x != ""
	default:
		return true
	}
}

func sortedCaps(caps map[string]bool) []string {
	out := make([]string, 0, len(caps))
	for c := range caps {
		out = append(out, c)
	}
	sort.Strings(out)
	return out
}
