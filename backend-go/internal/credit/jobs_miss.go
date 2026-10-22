package credit

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platformcfg"
)

func apperrAs(err error) (*apperr.Error, bool) { return apperr.As(err) }

// markMiss is jobs._mark_miss: advance the miss ladder (config grace and
// default windows), restrict / close the credit line, raise account risk.
func markMiss(ctx context.Context, pool *pgxpool.Pool, id uuid.UUID, now time.Time) error {
	return database.InTx(ctx, pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		cfg, err := platformcfg.Effective(ctx, q, "credit")
		if err != nil {
			return err
		}
		grace := max(1, orDefault(platformcfg.Int(cfg, "grace_days"), 3))
		after := max(1, orDefault(platformcfg.Int(cfg, "default_after_restricted_days"), 7))
		l, err := q.LoanForUpdate(ctx, id)
		if err != nil {
			return err
		}
		acct, err := q.AccountByID(ctx, l.AccountID)
		if err != nil {
			return err
		}
		before := l.Status
		raise := ""
		switch l.Status {
		case "ACTIVE":
			until := now.Add(time.Duration(grace) * 24 * time.Hour)
			l.Status, l.GraceUntil = "GRACE", &until
		case "GRACE":
			if l.GraceUntil != nil && !now.Before(*l.GraceUntil) {
				l.Status, l.SwapCreditRemainingKobo, raise = "RESTRICTED", 0, "WATCH"
				if err := q.SetCreditLinesStatus(ctx, db.SetCreditLinesStatusParams{AccountID: l.AccountID,
					Status: "RESTRICTED"}); err != nil {
					return err
				}
			}
		case "RESTRICTED":
			since := l.UpdatedAt
			if l.GraceUntil != nil {
				since = *l.GraceUntil
			}
			if !now.Before(since.Add(time.Duration(after) * 24 * time.Hour)) {
				l.Status, l.SwapCreditRemainingKobo, raise = "DEFAULTED", 0, "RESTRICTED"
				if err := q.SetCreditLinesStatus(ctx, db.SetCreditLinesStatusParams{AccountID: l.AccountID,
					Status: "CLOSED"}); err != nil {
					return err
				}
			}
		}
		if l.Status != before {
			if err := saveLoan(ctx, q, l); err != nil {
				return err
			}
		}
		risk, current := acct.RiskStatus, acct.RiskStatus
		if current == "" {
			current = "NORMAL"
		}
		if raise != "" && riskRank[raise] > riskRank[current] {
			if err := q.SetAccountRiskStatus(ctx, db.SetAccountRiskStatusParams{ID: acct.ID, RiskStatus: raise}); err != nil {
				return err
			}
			risk = raise
		}
		return events.Emit(ctx, q, events.Event{Action: "credit.auto_debit_miss", SubjectType: "loan",
			SubjectID: l.ID.String(), Before: events.Map{"status": before},
			After: events.Map{"status": l.Status, "risk_status": risk},
			Notify: []events.NotifySpec{{UserID: acct.OwnerUserID, Title: "Credit repayment missed",
				Body:     "Fund your wallet — auto-debit could not collect today's installment.",
				Severity: events.Warning, DedupeKey: "credit.miss:" + l.ID.String() + ":" + now.UTC().Format("2006-01-02")}}})
	})
}

func orDefault(v, d int64) int64 {
	if v == 0 {
		return d
	}
	return v
}
