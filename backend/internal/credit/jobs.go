package credit

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/finance"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platformcfg"
)

var riskRank = map[string]int{"NORMAL": 0, "WATCH": 1, "RESTRICTED": 2, "FROZEN": 3}

func disabled(ctx context.Context, q *db.Queries) (bool, error) {
	on, err := platformcfg.IsEnabled(ctx, q, "credit")
	return !on, err
}

// RecomputeScores is jobs.recompute_scores (ScoreService.recompute per
// ACTIVE account, oldest first).
func RecomputeScores(ctx context.Context, pool *pgxpool.Pool, limit int) (map[string]any, error) {
	q := db.New(pool)
	if off, err := disabled(ctx, q); err != nil || off {
		return map[string]any{"skipped": true, "reason": "CREDIT_DISABLED", "recomputed": 0}, err
	}
	accts, err := q.ActiveAccountsForScoring(ctx, int32(limit))
	if err != nil {
		return nil, err
	}
	for _, a := range accts {
		if err := database.InTx(ctx, pool, func(tx pgx.Tx) error { return recompute(ctx, db.New(tx), a) }); err != nil {
			return nil, err
		}
	}
	return map[string]any{"recomputed": len(accts)}, nil
}

func recompute(ctx context.Context, q *db.Queries, a db.AccountsAccount) error {
	elig, err := Evaluate(ctx, q, a, "")
	if err != nil {
		return err
	}
	cfg, err := platformcfg.Effective(ctx, q, "credit")
	if err != nil {
		return err
	}
	p := elig.progress
	per, _ := p["swaps_per_week"].(float64)
	score, factors, limit := computeScore(p["active_days"].(int64), p["on_time_pct"].(int64), per,
		platformcfg.Int(cfg, "min_active_days"), platformcfg.Int(cfg, "min_on_time_pct"),
		platformcfg.Int(cfg, "max_amount_kobo"))
	id := ids.New()
	f, _ := json.Marshal(factors)
	if err := q.InsertCreditScore(ctx, db.InsertCreditScoreParams{ID: id, Score: int16(score), Factors: f,
		RecommendedLimitKobo: limit, Version: "v1", ComputedBy: "SYSTEM", AccountID: a.ID}); err != nil {
		return err
	}
	if err := q.EnsureCreditLine(ctx, db.EnsureCreditLineParams{ID: ids.New(), LimitKobo: limit, AccountID: a.ID}); err != nil {
		return err
	}
	if err := q.SaveCreditLineScoreOpen(ctx, db.SaveCreditLineScoreOpenParams{AccountID: a.ID, ScoreID: &id,
		LimitKobo: limit}); err != nil {
		return err
	}
	return events.Emit(ctx, q, events.Event{Action: "credit.score_recomputed", SubjectType: "credit_score",
		SubjectID: id.String(), After: events.Map{"score": score, "recommended_limit_kobo": limit}})
}

// AutoDebitLoans is jobs.auto_debit_loans: one daily installment per open
// loan from the wallet; a miss walks ACTIVE → GRACE → RESTRICTED → DEFAULTED.
func AutoDebitLoans(ctx context.Context, pool *pgxpool.Pool, log *slog.Logger, limit int) (map[string]any, error) {
	q := db.New(pool)
	if off, err := disabled(ctx, q); err != nil || off {
		return map[string]any{"skipped": true, "reason": "CREDIT_DISABLED", "debited": 0, "missed": 0}, err
	}
	now := time.Now()
	today := now.UTC().Format("2006-01-02")
	day, _ := time.Parse("2006-01-02", today)
	loans, err := q.DebitableLoans(ctx, int32(limit))
	if err != nil {
		return nil, err
	}
	debited, missed, paidOff := 0, 0, 0
	for _, l := range loans {
		remaining := max(0, l.TotalDueKobo-l.RepaidKobo)
		if remaining <= 0 {
			continue
		}
		already, err := q.AutoDebitedOn(ctx, db.AutoDebitedOnParams{LoanID: l.ID, Day: pgDate(day)})
		if err != nil {
			return nil, err
		}
		if already {
			continue
		}
		amount := min(l.DailyInstallmentKobo, remaining)
		idem := "auto-debit:" + l.ID.String() + ":" + today
		paid := false
		err = database.InTx(ctx, pool, func(tx pgx.Tx) error {
			tq := db.New(tx)
			locked, err := tq.LoanForUpdate(ctx, l.ID)
			if err != nil {
				return err
			}
			acct, err := tq.AccountByID(ctx, locked.AccountID)
			if err != nil {
				return err
			}
			p, err := finance.LoanRepayDebit(ctx, tq, finance.Account{ID: acct.ID, KuraID: acct.KuraID}, amount, 0,
				amount, cutStr(idem, 64))
			if err != nil {
				return err
			}
			if err := tq.InsertAutoRepayment(ctx, db.InsertAutoRepaymentParams{ID: ids.New(), AmountKobo: amount,
				IdempotencyKey: cutStr("repay:"+idem, 64), LoanID: locked.ID, PaymentID: &p.ID}); err != nil {
				return err
			}
			locked.RepaidKobo += amount
			if locked.RepaidKobo >= locked.TotalDueKobo {
				locked.Status, locked.SwapCreditRemainingKobo, paid = "PAID", 0, true
			} else if locked.Status == "GRACE" {
				locked.Status, locked.GraceUntil = "ACTIVE", nil
			}
			return saveLoan(ctx, tq, locked)
		})
		if err != nil {
			if _, domain := apperrAs(err); !domain {
				log.Error("auto_debit_failed", "loan", l.ID, "err", err)
			}
			missed++
			if err := markMiss(ctx, pool, l.ID, now); err != nil {
				return nil, err
			}
			continue
		}
		debited++
		if paid {
			paidOff++
		}
		if err := events.EmitTx(ctx, pool, events.Event{Action: "credit.auto_debit_ok", SubjectType: "loan",
			SubjectID: l.ID.String(), After: events.Map{"amount_kobo": amount}}); err != nil {
			return nil, err
		}
	}
	return map[string]any{"debited": debited, "missed": missed, "paid_off": paidOff}, nil
}

func cutStr(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}

func saveLoan(ctx context.Context, q *db.Queries, l db.CreditLoan) error {
	return q.SaveLoanState(ctx, db.SaveLoanStateParams{ID: l.ID, RepaidKobo: l.RepaidKobo, Status: l.Status,
		SwapCreditRemainingKobo: l.SwapCreditRemainingKobo, GraceUntil: l.GraceUntil})
}
