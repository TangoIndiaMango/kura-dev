package va

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/djsign"
)

// identitySalt is core.helpers.crypto's signing salt for ID numbers.
const identitySalt = "kura.identity.v1"

// RetryResult is the sweep summary.
type RetryResult struct {
	Retried  int `json:"retried"`
	Assigned int `json:"assigned"`
	GaveUp   int `json:"gave_up"`
}

// RetryPending is retry_pending_virtual_accounts: re-request NUBANs still
// PENDING once their retry is due (a failed call or a webhook that never
// came). When the schedule is spent, ops hear about it once.
func (s *Service) RetryPending(ctx context.Context, limit int) (RetryResult, error) {
	var out RetryResult
	due, err := s.q.DueVirtualAccounts(ctx, dbDueParams(time.Now(), limit))
	if err != nil {
		return out, err
	}
	for _, account := range due {
		out.Retried++
		_ = s.Provision(ctx, account, s.identityNumber(ctx, account)) // failures are recorded on the row
		v, err := s.q.VirtualAccountRow(ctx, account)
		if err != nil {
			return out, err
		}
		if strings.HasSuffix(v.LastError, "[rate_limited]") {
			break // the PSP asked us to slow down; the next sweep continues
		}
		if v.Status == "ACTIVE" {
			out.Assigned++
			continue
		}
		if v.NextAttemptAt != nil {
			continue
		}
		out.GaveUp++
		acct, err := s.q.AccountForVA(ctx, account)
		if err != nil {
			return out, err
		}
		if err := events.EmitTx(ctx, s.pool, events.Event{Action: "virtual_account.provision_gave_up",
			SubjectType: "virtual_account", SubjectID: account.String(), SubjectLabel: acct.KuraID,
			After:    events.Map{"attempts": v.ProvisionAttempts, "status": v.Status},
			Metadata: events.Map{"last_error": v.LastError}}); err != nil {
			return out, err
		}
		body := fmt.Sprintf("%s (%s) still has no NUBAN after %d tries. Check their ID and the PSP dashboard.",
			acct.KuraID, acct.DisplayName, v.ProvisionAttempts)
		if v.LastError != "" {
			body += " Last error: " + v.LastError
		}
		s.notifyReviewers(ctx, "Transfer account not issued", body, "/operators/"+account.String(),
			"va.gave_up:"+account.String())
	}
	return out, nil
}

// identityNumber is _identity_number: the latest BVN/NIN on file, for PSP
// customer validation on retry ("" when none or unreadable).
func (s *Service) identityNumber(ctx context.Context, account uuid.UUID) string {
	token, err := s.q.LatestBVNOrNIN(ctx, account)
	if err != nil {
		if !database.IsNoRows(err) {
			s.log.Warn("va_retry_id_lookup_failed", "account_id", account.String(), "err", err)
		}
		return ""
	}
	var number string
	if err := djsign.Loads(token, []string{s.secret}, identitySalt, &number); err != nil {
		s.log.Warn("va_retry_id_decrypt_failed", "account_id", account.String())
		return ""
	}
	return number
}

func dbDueParams(now time.Time, limit int) db.DueVirtualAccountsParams {
	return db.DueVirtualAccountsParams{NextAttemptAt: &now, Limit: int32(limit)}
}
