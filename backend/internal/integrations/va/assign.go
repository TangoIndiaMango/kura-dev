package va

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
)

// RetryDelays is RETRY_DELAYS: 5 m, 15 m, then hourly for 24 h.
var RetryDelays = func() []time.Duration {
	d := []time.Duration{5 * time.Minute, 15 * time.Minute}
	for i := 0; i < 24; i++ {
		d = append(d, time.Hour)
	}
	return d
}()

// Assigned is the activated NUBAN.
type Assigned struct {
	NUBAN, BankName, AccountName, Reference string
}

// Assign is WalletService.assign_virtual_account — the only write path that
// activates a NUBAN (PSP webhook / assign success / dev fallback).
func Assign(ctx context.Context, pool *pgxpool.Pool, account uuid.UUID, nuban, bank, name, ref string) (Assigned, error) {
	digits := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, nuban)
	if len(digits) != 10 {
		return Assigned{}, apperr.New("VALIDATION_ERROR", "PSP NUBAN must be 10 digits.").
			WithDetails(apperr.Details{"nuban": []string{"invalid"}})
	}
	bank, name = strings.TrimSpace(bank), strings.TrimSpace(name)
	if bank == "" || name == "" {
		return Assigned{}, apperr.New("VALIDATION_ERROR", "PSP bank_name and account_name are required.")
	}
	out := Assigned{NUBAN: digits, BankName: bank, AccountName: name, Reference: strings.TrimSpace(ref)}
	err := database.InTx(ctx, pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		if err := q.EnsurePendingVA(ctx, db.EnsurePendingVAParams{ID: ids.New(), AccountID: account}); err != nil {
			return err
		}
		id, err := q.VAForUpdate(ctx, account)
		if err != nil {
			return err
		}
		taken, err := q.NubanTaken(ctx, db.NubanTakenParams{Nuban: &digits, ID: id})
		if err != nil {
			return err
		}
		if taken {
			return apperr.New("VALIDATION_ERROR", "NUBAN already assigned to another account.").
				WithDetails(apperr.Details{"nuban": []string{"conflict"}})
		}
		return q.ActivateVA(ctx, db.ActivateVAParams{ID: id, Nuban: &digits, BankName: bank, AccountName: name,
			PspReference: out.Reference})
	})
	return out, err
}

// attachDev is attach_dev_virtual_account (DEBUG only): a unique 99xxxxxxxx
// NUBAN so local riders can fund without a live PSP account.
func (s *Service) attachDev(ctx context.Context, acct db.AccountForVARow, code, reason, ref string) error {
	if !s.allowDev {
		return apperr.New("INTEGRATION_ERROR", "Dev virtual accounts are disabled outside DEBUG.")
	}
	ref = strings.TrimSpace(ref)
	if ref == "" {
		ref = "dev-va:" + acct.KuraID
	}
	nuban, err := s.devNUBAN(ctx)
	if err != nil {
		return err
	}
	v, err := Assign(ctx, s.pool, acct.ID, nuban, "Wema Bank / KURA DEV",
		truncate("KURA / "+acct.DisplayName, 150), truncate(ref, 100))
	if err != nil {
		return err
	}
	if err := events.EmitTx(ctx, s.pool, events.Event{Action: "virtual_account.dev_attached",
		SubjectType: "virtual_account", SubjectID: acct.ID.String(), SubjectLabel: acct.KuraID,
		After: events.Map{"nuban": v.NUBAN, "bank_name": v.BankName, "status": "ACTIVE", "provider": code,
			"dev": true},
		Metadata: events.Map{"reason": truncate(reason, 200), "psp_reference": v.Reference}}); err != nil {
		return err
	}
	s.log.Warn("va_dev_attached", "account_id", acct.ID.String(), "nuban", v.NUBAN, "reason", truncate(reason, 120))
	return nil
}

func (s *Service) devNUBAN(ctx context.Context) (string, error) {
	for i := 0; i < 24; i++ {
		n, err := rand.Int(rand.Reader, big.NewInt(100_000_000))
		if err != nil {
			return "", err
		}
		digits := fmt.Sprintf("99%08d", n.Int64())
		taken, err := s.q.NubanTaken(ctx, db.NubanTakenParams{Nuban: &digits, ID: uuid.Nil})
		if err != nil {
			return "", err
		}
		if !taken {
			return digits, nil
		}
	}
	return "", apperr.New("INTEGRATION_ERROR", "Could not allocate a unique dev NUBAN.")
}

// recordAttempt is _record_attempt: count this try and schedule the next
// (none once the schedule is spent). Active accounts are left alone.
func (s *Service) recordAttempt(ctx context.Context, account uuid.UUID, errMsg string) error {
	v, err := s.q.VirtualAccountRow(ctx, account)
	if database.IsNoRows(err) {
		return nil
	}
	if err != nil || v.Status == "ACTIVE" {
		return err
	}
	now := time.Now()
	attempts := v.ProvisionAttempts + 1
	var next *time.Time
	if int(attempts) <= len(RetryDelays) {
		t := now.Add(RetryDelays[attempts-1])
		next = &t
	}
	return s.q.RecordVAAttempt(ctx, db.RecordVAAttemptParams{ID: v.ID, ProvisionAttempts: attempts,
		LastAttemptAt: &now, NextAttemptAt: next, LastError: truncate(errMsg, 255)})
}

// alertAccountProblem tells risk reviewers once a day per PSP error code.
func (s *Service) alertAccountProblem(ctx context.Context, code, message, errCode string) {
	title := strings.ToUpper(code[:1]) + strings.ToLower(code[1:])
	day := time.Now().In(lagos).Format(time.DateOnly)
	s.notifyReviewers(ctx, title+" cannot issue transfer accounts",
		fmt.Sprintf("%s refused NUBAN requests for every rider: %s. Riders stay on 'pending' and are "+
			"retried automatically once this is fixed.", title, message),
		"/operators", fmt.Sprintf("va.psp_account:%s:%s:%s", code, errCode, day))
}

// notifyReviewers is risk.services.notify_staff.notify_risk_reviewers.
func (s *Service) notifyReviewers(ctx context.Context, title, body, link, dedupe string) {
	reviewers, err := s.q.RiskReviewerIDs(ctx)
	if err != nil {
		s.log.Error("notify_risk_reviewers_failed", "err", err)
		return
	}
	for _, id := range reviewers {
		err := events.Notify(ctx, s.q, events.NotifySpec{UserID: id, Title: title, Body: body, Source: "Risk",
			Severity: events.Warning, Channels: []string{events.InApp}, TemplateCode: "risk.event.opened",
			LinkPath: link, DedupeKey: dedupe + ":" + id.String()})
		if err != nil {
			s.log.Error("notify_risk_reviewers_failed", "user_id", id.String(), "err", err)
		}
	}
}
