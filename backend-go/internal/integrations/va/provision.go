// Package va ports integrations.services.va: request a dedicated NUBAN from
// the account's PSP, record retries, and fall back to a dev NUBAN in DEBUG.
package va

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/integrations/psp"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
)

// pspAccountErrors are failures about our merchant account, not the rider.
var pspAccountErrors = map[string]bool{"feature_unavailable": true, "invalid_key": true, "unauthorized": true}

// Service provisions virtual accounts.
type Service struct {
	pool     *pgxpool.Pool
	q        *db.Queries
	settings psp.Settings
	allowDev bool
	secret   string // SECRET_KEY, to read signed ID numbers
	log      *slog.Logger
	// ports overrides provider lookup (tests).
	ports func(code string) (psp.Port, error)
}

func New(pool *pgxpool.Pool, settings psp.Settings, allowDev bool, secret string, log *slog.Logger) *Service {
	s := &Service{pool: pool, q: db.New(pool), settings: settings, allowDev: allowDev, secret: secret, log: log}
	s.ports = func(code string) (psp.Port, error) { return psp.Get(code, settings) }
	return s
}

// Job is one NUBAN request (schedule_va_provision's arguments).
type Job struct {
	Account  uuid.UUID
	BVNOrNIN string
}

// Schedule is schedule_va_provision: called after the caller's commit, it
// asks the PSP for each NUBAN in order before the response, like Django's
// on_commit. It runs detached from the request context so a client
// disconnect can't cut a PSP call short, and it never fails the request:
// a failed call is recorded on the row and retried by the sweep. Accounts
// already holding a NUBAN are skipped.
func (s *Service) Schedule(jobs ...Job) {
	ctx := context.Background()
	for _, j := range jobs {
		v, err := s.q.VirtualAccountRow(ctx, j.Account)
		if err == nil && v.Status == "ACTIVE" && v.Nuban != nil && *v.Nuban != "" {
			continue
		}
		if err := s.Provision(ctx, j.Account, j.BVNOrNIN); err != nil {
			s.log.Error("va_schedule_failed", "account_id", j.Account.String(), "err", err)
		}
	}
}

// Provision is provision_virtual_account_for.
func (s *Service) Provision(ctx context.Context, accountID uuid.UUID, bvnOrNIN string) error {
	acct, err := s.q.AccountForVA(ctx, accountID)
	if err != nil {
		return err
	}
	code := acct.Psp
	if code == "" {
		code = s.settings.DefaultPSP
	}
	port, err := s.ports(code)
	if err != nil {
		return err
	}
	if err := s.q.EnsureWallet(ctx, db.EnsureWalletParams{ID: ids.New(), AccountID: acct.ID}); err != nil {
		return err
	}
	if err := s.q.EnsurePendingVA(ctx, db.EnsurePendingVAParams{ID: ids.New(), AccountID: acct.ID}); err != nil {
		return err
	}
	s.log.Info("va_provision_start", "account_id", acct.ID.String(), "kura_id", acct.KuraID, "psp", code)
	res, err := port.ProvisionVirtualAccount(ctx, psp.VARequest{AccountID: acct.ID.String(),
		DisplayName: acct.DisplayName, Email: deref(acct.Email), Phone: deref(acct.Phone), BVNOrNIN: bvnOrNIN})
	if err != nil {
		return s.failed(ctx, acct, code, err)
	}
	if res.Reference != "" {
		if err := s.q.SetVAReference(ctx, db.SetVAReferenceParams{AccountID: acct.ID, PspReference: res.Reference}); err != nil {
			return err
		}
	}
	if res.Pending { // accepted; the NUBAN arrives by webhook, retry in case it never does
		if err := s.recordAttempt(ctx, acct.ID, ""); err != nil {
			return err
		}
	}
	if !res.Pending && res.NUBAN != "" && res.BankName != "" && res.AccountName != "" {
		v, err := Assign(ctx, s.pool, acct.ID, res.NUBAN, res.BankName, res.AccountName, res.Reference)
		if err != nil {
			return err
		}
		return events.EmitTx(ctx, s.pool, events.Event{Action: "virtual_account.assigned",
			SubjectType: "virtual_account", SubjectID: acct.ID.String(), SubjectLabel: acct.KuraID,
			After:    events.Map{"nuban": v.NUBAN, "bank_name": v.BankName, "status": "ACTIVE", "provider": code},
			Metadata: events.Map{"psp_reference": v.Reference}})
	}
	if s.allowDev {
		return s.attachDev(ctx, acct, code, "psp_pending_dev_shortcut", res.Reference)
	}
	if err := s.q.SetAccountKycStatus(ctx, db.SetAccountKycStatusParams{ID: acct.ID, KycStatus: "PENDING_PSP"}); err != nil {
		return err
	}
	s.log.Info("va_provision_pending", "account_id", acct.ID.String(), "psp_reference", res.Reference)
	return events.EmitTx(ctx, s.pool, events.Event{Action: "virtual_account.provision_pending",
		SubjectType: "virtual_account", SubjectID: acct.ID.String(), SubjectLabel: acct.KuraID,
		After:    events.Map{"kyc_status": "PENDING_PSP", "provider": code},
		Metadata: events.Map{"psp_reference": res.Reference}})
}

// failed handles a refused / failed PSP call: keep the customer code, fall
// back to a dev NUBAN in DEBUG, else mark PENDING_PSP, schedule a retry and
// alert ops when the problem is our merchant account.
func (s *Service) failed(ctx context.Context, acct db.AccountForVARow, code string, cause error) error {
	var pe *psp.Error
	customer := ""
	if errors.As(cause, &pe) {
		customer = pe.CustomerCode
	}
	if customer != "" {
		if err := s.q.SetVAReference(ctx, db.SetVAReferenceParams{AccountID: acct.ID, PspReference: customer}); err != nil {
			return err
		}
	}
	if s.allowDev {
		return s.attachDev(ctx, acct, code, cause.Error(), customer)
	}
	if err := s.q.SetAccountKycStatus(ctx, db.SetAccountKycStatusParams{ID: acct.ID, KycStatus: "PENDING_PSP"}); err != nil {
		return err
	}
	msg, errCode := pspErrorMessage(cause)
	recorded := msg
	if errCode != "" {
		recorded = fmt.Sprintf("%s [%s]", msg, errCode)
	}
	if err := s.recordAttempt(ctx, acct.ID, recorded); err != nil {
		return err
	}
	if pspAccountErrors[errCode] || strings.Contains(cause.Error(), "(401)") {
		if errCode == "" {
			errCode = "unauthorized"
		}
		s.alertAccountProblem(ctx, code, msg, errCode)
	}
	s.log.Error("va_provision_failed", "account_id", acct.ID.String(), "psp", code, "err", cause)
	if err := events.EmitTx(ctx, s.pool, events.Event{Action: "virtual_account.provision_failed",
		SubjectType: "virtual_account", SubjectID: acct.ID.String(), SubjectLabel: acct.KuraID,
		After:    events.Map{"kyc_status": "PENDING_PSP", "provider": code},
		Metadata: events.Map{"psp_reference": customer, "error": truncate(cause.Error(), 200)}}); err != nil {
		return err
	}
	return cause
}

// pspErrorMessage is _psp_error: the provider's own message and code from
// the HTTP body when it is JSON, else the error text.
func pspErrorMessage(err error) (string, string) {
	var pe *psp.Error
	if errors.As(err, &pe) && pe.Body != "" {
		var body map[string]any
		if json.Unmarshal([]byte(pe.Body), &body) == nil {
			if m, ok := body["message"]; ok && m != nil && m != "" {
				c, _ := body["code"].(string)
				return fmt.Sprint(m), c
			}
		}
	}
	return err.Error(), ""
}

func deref(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

// truncate is Python's s[:n] (code points, not bytes).
func truncate(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n])
}

var lagos = func() *time.Location {
	loc, err := time.LoadLocation("Africa/Lagos")
	if err != nil {
		panic(err)
	}
	return loc
}()
