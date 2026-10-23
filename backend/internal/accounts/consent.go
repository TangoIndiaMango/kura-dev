package accounts

import (
	"context"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
)

// ConsentRow is _row_payload.
type ConsentRow struct {
	Granted       bool    `json:"granted"`
	GrantedAt     *string `json:"granted_at"`
	WithdrawnAt   *string `json:"withdrawn_at"`
	Channel       *string `json:"channel"`
	PolicyVersion *string `json:"policy_version"`
}

// ConsentState is ConsentService.state for /auth/me.
type ConsentState struct {
	PolicyVersion       string     `json:"policy_version"`
	Service             ConsentRow `json:"service"`
	DataSharing         ConsentRow `json:"data_sharing"`
	NeedsServiceConsent bool       `json:"needs_service_consent"`
	PromptRequired      bool       `json:"prompt_required"`
}

// consentState picks, per purpose, the active row else the latest withdrawn.
func consentState(ctx context.Context, q *db.Queries, accountID uuid.UUID, kycStatus, policy string) (ConsentState, error) {
	rows, err := q.ConsentRows(ctx, accountID)
	if err != nil {
		return ConsentState{}, err
	}
	latest := map[string]db.ConsentRowsRow{}
	for _, r := range rows {
		cur, seen := latest[r.Purpose]
		if !seen || (r.WithdrawnAt == nil && cur.WithdrawnAt != nil) {
			latest[r.Purpose] = r
		}
	}
	service, hasService := latest["SERVICE"]
	needs := !(hasService && service.WithdrawnAt == nil && service.PolicyVersion == policy)
	return ConsentState{
		PolicyVersion:       policy,
		Service:             consentRow(latest, "SERVICE"),
		DataSharing:         consentRow(latest, "DATA_SHARING"),
		NeedsServiceConsent: needs,
		PromptRequired:      needs && kycStatus != "NONE",
	}, nil
}

// consentRow formats like Python isoformat() on aware UTC datetimes.
func consentRow(latest map[string]db.ConsentRowsRow, purpose string) ConsentRow {
	r, ok := latest[purpose]
	if !ok {
		return ConsentRow{}
	}
	granted := jsontime.FormatISO(r.GrantedAt)
	out := ConsentRow{Granted: r.WithdrawnAt == nil, GrantedAt: &granted,
		Channel: &r.Channel, PolicyVersion: &r.PolicyVersion}
	if r.WithdrawnAt != nil {
		w := jsontime.FormatISO(*r.WithdrawnAt)
		out.WithdrawnAt = &w
	}
	return out
}
