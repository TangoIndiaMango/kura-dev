package accounts

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
)

var consentChannels = map[string]bool{"WEB": true, "APP": true, "USSD": true, "HUB": true}

// consentChannel is ConsentService._channel: unknown channels count as WEB.
func consentChannel(c string) string {
	c = strings.ToUpper(strings.TrimSpace(c))
	if consentChannels[c] {
		return c
	}
	return "WEB"
}

// grantConsent is ConsentService.grant inside the caller's transaction:
// idempotent at the same policy version; a newer version re-stamps the row.
func grantConsent(ctx context.Context, q *db.Queries, who *events.Actor, acctID uuid.UUID, kuraID,
	purpose, channel, policy string, now time.Time) error {
	channel = consentChannel(channel)
	row, err := q.ActiveConsentForUpdate(ctx, db.ActiveConsentForUpdateParams{AccountID: acctID, Purpose: purpose})
	hasRow := err == nil
	if err != nil && !database.IsNoRows(err) {
		return err
	}
	if hasRow && row.PolicyVersion == policy {
		return nil
	}
	ev := events.Event{Action: "consent.granted", SubjectType: "account", SubjectID: acctID.String(),
		SubjectLabel: kuraID, Actor: who, After: withPurpose(purpose, consentPayload(now, nil, channel, policy))}
	if hasRow {
		ev.Before = consentPayload(row.GrantedAt, row.WithdrawnAt, row.Channel, row.PolicyVersion)
		err = q.RestampConsent(ctx, db.RestampConsentParams{ID: row.ID, GrantedAt: now, Channel: channel,
			PolicyVersion: policy})
	} else {
		err = q.InsertConsent(ctx, db.InsertConsentParams{ID: ids.New(), Purpose: purpose, GrantedAt: now,
			Channel: channel, PolicyVersion: policy, AccountID: acctID})
	}
	if err != nil {
		return err
	}
	return events.Emit(ctx, q, ev)
}

// hasServiceConsent is ConsentService.has_service_consent.
func hasServiceConsent(ctx context.Context, q *db.Queries, acctID uuid.UUID, policy string) (bool, error) {
	row, err := q.ActiveConsentForUpdate(ctx, db.ActiveConsentForUpdateParams{AccountID: acctID, Purpose: "SERVICE"})
	if database.IsNoRows(err) {
		return false, nil
	}
	return err == nil && row.PolicyVersion == policy, err
}
