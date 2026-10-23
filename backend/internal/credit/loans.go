package credit

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/finance"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platformcfg"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/risk"
)

// loanListPayload is LoanService.loan_list_payload.
func loanListPayload(l db.LoanRowsRow) map[string]any {
	return map[string]any{"id": l.ID.String(), "status": l.Status, "principal_kobo": l.PrincipalKobo,
		"total_due_kobo": l.TotalDueKobo, "repaid_kobo": l.RepaidKobo,
		"remaining_due_kobo": max(0, l.TotalDueKobo-l.RepaidKobo), "daily_installment_kobo": l.DailyInstallmentKobo,
		"swap_credit_remaining_kobo": l.SwapCreditRemainingKobo, "starts_at": jsontime.FormatISO(l.StartsAt),
		"due_at": jsontime.FormatISO(l.DueAt), "application_id": l.ApplicationID.String(),
		"account_id": l.AccountID.String()}
}

// loanPayload is LoanService.loan_payload (with the repayment schedule).
func loanPayload(l db.LoanRowsRow) map[string]any {
	out := loanListPayload(l)
	out["interest_kobo"] = l.InterestKobo
	out["grace_until"] = nil
	if l.GraceUntil != nil {
		out["grace_until"] = jsontime.FormatISO(*l.GraceUntil)
	}
	out["schedule"] = schedule(l)
	return out
}

// schedule is _build_schedule (UTC dates, like date() on stored datetimes).
func schedule(l db.LoanRowsRow) []map[string]any {
	start := utcDay(l.StartsAt)
	tenor := max(1, int(l.TenorDays))
	daily := l.DailyInstallmentKobo
	var paid int64
	if daily != 0 {
		paid = l.RepaidKobo / daily
	}
	today := utcDay(time.Now())
	rows := make([]map[string]any, tenor)
	for i := 0; i < tenor; i++ {
		due := start.AddDate(0, 0, i+1)
		status := "SCHEDULED"
		switch {
		case int64(i) < paid:
			status = "PAID"
		case due.Before(today):
			status = "MISSED"
		case due.Equal(today):
			status = "DUE"
		}
		rows[i] = map[string]any{"due_on": due.Format("2006-01-02"), "amount_kobo": daily, "status": status}
	}
	return rows
}

// LoadLoan returns the loan row with its tenor and owner.
func LoadLoan(ctx context.Context, q *db.Queries, id uuid.UUID) (db.LoanRowsRow, error) {
	rows, err := q.LoanRows(ctx, []uuid.UUID{id})
	if err == nil && len(rows) == 0 {
		err = apperr.NotFound("No Loan matches the given query.")
	}
	if err != nil {
		return db.LoanRowsRow{}, err
	}
	return rows[0], nil
}

// Repay is LoanService.repay (PIN grant checked by the caller):
// interest-first allocation, wallet debit, PAID when settled.
func Repay(ctx context.Context, q *db.Queries, loanID uuid.UUID, amount int64, key string, who *events.Actor) (map[string]any, error) {
	if err := platformcfg.RequireEnabled(ctx, q, "credit"); err != nil {
		return nil, err
	}
	l, err := LoadLoan(ctx, q, loanID)
	if err != nil {
		return nil, err
	}
	if amount <= 0 {
		return nil, apperr.New("VALIDATION_ERROR", "amount_kobo must be positive.")
	}
	if l.Status != "ACTIVE" && l.Status != "GRACE" && l.Status != "RESTRICTED" {
		return nil, apperr.Conflict("INVALID_TRANSITION", fmt.Sprintf("Cannot repay loan in status %s.", l.Status))
	}
	if r, err := q.RepaymentByKey(ctx, key); err == nil {
		prev, err := LoadLoan(ctx, q, r.LoanID)
		if err != nil {
			return nil, err
		}
		return loanPayload(prev), nil
	} else if !database.IsNoRows(err) {
		return nil, err
	}
	pay := min(amount, max(0, l.TotalDueKobo-l.RepaidKobo))
	if pay <= 0 {
		return nil, apperr.Conflict("LOAN_PAID", "Loan is already fully repaid.")
	}
	locked, err := q.LoanForUpdate(ctx, l.ID)
	if err != nil {
		return nil, err
	}
	repID := ids.New()
	if err := q.InsertRepayment(ctx, db.InsertRepaymentParams{ID: repID, AmountKobo: pay, IdempotencyKey: key,
		LoanID: l.ID}); err != nil {
		return nil, err
	}
	interestLeft := max(0, locked.InterestKobo-min(locked.RepaidKobo, locked.InterestKobo))
	interest := min(pay, interestLeft)
	acct, err := q.AccountByID(ctx, l.AccountID)
	if err != nil {
		return nil, err
	}
	p, err := finance.LoanRepayDebit(ctx, q, finance.Account{ID: acct.ID, KuraID: acct.KuraID}, pay, interest,
		pay-interest, "loan-repay-pay:"+key)
	if err != nil {
		return nil, err
	}
	if err := q.SaveRepayment(ctx, db.SaveRepaymentParams{ID: repID, PaymentID: &p.ID}); err != nil {
		return nil, err
	}
	locked.RepaidKobo += pay
	if locked.RepaidKobo >= locked.TotalDueKobo {
		locked.Status, locked.SwapCreditRemainingKobo = "PAID", 0
	}
	if err := q.SaveLoanRepaid(ctx, db.SaveLoanRepaidParams{ID: l.ID, RepaidKobo: locked.RepaidKobo,
		Status: locked.Status, SwapCreditRemainingKobo: locked.SwapCreditRemainingKobo}); err != nil {
		return nil, err
	}
	if err := events.Emit(ctx, q, events.Event{Action: "credit.loan_repaid", SubjectType: "loan",
		SubjectID: l.ID.String(), Actor: who,
		After: events.Map{"amount_kobo": pay, "interest_kobo": interest, "principal_kobo": pay - interest,
			"repaid_kobo": locked.RepaidKobo, "status": locked.Status},
		Notify: []events.NotifySpec{{UserID: acct.OwnerUserID, Title: "Loan repayment received",
			Body:     fmt.Sprintf("₦%s applied to your swap-credit loan.", commas(pay/100)),
			Severity: events.Info, DedupeKey: "credit.repay:" + repID.String()}}}); err != nil {
		return nil, err
	}
	fresh, err := LoadLoan(ctx, q, l.ID)
	if err != nil {
		return nil, err
	}
	return loanPayload(fresh), nil
}

// ActiveSwapCredit is LoanService.active_swap_credit_kobo.
func ActiveSwapCredit(ctx context.Context, q *db.Queries, account uuid.UUID) (int64, error) {
	l, err := q.ActiveCreditLoan(ctx, account)
	if database.IsNoRows(err) {
		return 0, nil
	}
	return l.SwapCreditRemainingKobo, err
}

// ConsumeSwapCredit is consume_swap_credit: draw the swap fee from the
// active loan's swap credit into a CREDIT payment (receivable + revenue).
func ConsumeSwapCredit(ctx context.Context, q *db.Queries, acct db.AccountsAccount, amount int64, reference string,
	hub *uuid.UUID) (db.FinancePayment, error) {
	if err := platformcfg.RequireEnabled(ctx, q, "credit"); err != nil {
		return db.FinancePayment{}, err
	}
	if amount <= 0 {
		return db.FinancePayment{}, apperr.New("VALIDATION_ERROR", "amount_kobo must be positive.")
	}
	if line, err := q.CreditLineForUpdate(ctx, acct.ID); err == nil && (line.Status == "RESTRICTED" || line.Status == "CLOSED") {
		return db.FinancePayment{}, apperr.Conflict("CREDIT_LINE_BLOCKED", "Credit line is "+line.Status+".")
	} else if err != nil && !database.IsNoRows(err) {
		return db.FinancePayment{}, err
	}
	l, err := q.ActiveCreditLoanForUpdate(ctx, acct.ID)
	if database.IsNoRows(err) {
		return db.FinancePayment{}, apperr.Conflict("CREDIT_UNAVAILABLE", "No active swap-credit loan.")
	}
	if err != nil {
		return db.FinancePayment{}, err
	}
	if l.SwapCreditRemainingKobo < amount {
		return db.FinancePayment{}, apperr.Conflict("CREDIT_INSUFFICIENT", "Swap credit remaining is less than the swap fee.").
			WithDetails(map[string]any{"available_kobo": l.SwapCreditRemainingKobo,
				"shortfall_kobo": amount - l.SwapCreditRemainingKobo})
	}
	l.SwapCreditRemainingKobo -= amount
	if err := q.SaveLoanCredit(ctx, db.SaveLoanCreditParams{ID: l.ID, SwapCreditRemainingKobo: l.SwapCreditRemainingKobo}); err != nil {
		return db.FinancePayment{}, err
	}
	net, vat := finance.SplitVAT(amount)
	p, err := finance.CreatePayment(ctx, q, finance.PaymentIn{Account: acct.ID, Channel: "CREDIT", Amount: amount,
		VAT: vat, Purpose: "SWAP", Status: "SUCCESS", IdemKey: truncate("swap-credit:"+reference, 64), Hub: hub})
	if err != nil {
		return p, err
	}
	entries := []finance.Entry{{Code: "asset:loan_receivable", Type: finance.Asset, Debit: amount},
		{Code: "revenue:swap", Type: finance.Revenue, Credit: net}}
	if vat != 0 {
		entries = append(entries, finance.Entry{Code: "vat_payable", Type: finance.Liability, Credit: vat})
	}
	if _, err := finance.Post(ctx, q, "SWAP_FEE", truncate("CREDIT-"+p.ReceiptCode, 100),
		"Swap on credit "+p.ReceiptCode, entries); err != nil {
		return p, err
	}
	return p, events.Emit(ctx, q, events.Event{Action: "credit.swap_consumed", SubjectType: "loan",
		SubjectID: l.ID.String(), After: events.Map{"amount_kobo": amount,
			"swap_credit_remaining_kobo": l.SwapCreditRemainingKobo, "reference": reference,
			"payment_id": p.ID.String()}})
}

// CheckBustout is check_credit_bustout: within 7 days of disbursement, 3+
// completed swaps today and ≥3× the prior 30-day daily average closes the
// line. Errors are swallowed by the caller, like Django.
func CheckBustout(ctx context.Context, q *db.Queries, acct db.AccountsAccount, swapID *uuid.UUID) (bool, error) {
	now := time.Now()
	l, err := q.RecentLoanForBustout(ctx, db.RecentLoanForBustoutParams{AccountID: acct.ID, StartsAt: now.AddDate(0, 0, -7)})
	if database.IsNoRows(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	today, err := q.CompletedSwapsOnDay(ctx, db.CompletedSwapsOnDayParams{AccountID: acct.ID, Day: pgDate(utcDay(now))})
	if err != nil || today < 3 {
		return false, err
	}
	days, err := q.SwapDayCounts(ctx, db.SwapDayCountsParams{AccountID: acct.ID, CompletedAt: ptr(l.StartsAt.AddDate(0, 0, -30)),
		CompletedAt_2: ptr(l.StartsAt)})
	if err != nil {
		return false, err
	}
	avg := 0.0
	if len(days) > 0 {
		var sum int32
		for _, d := range days {
			sum += d.N
		}
		avg = float64(sum) / float64(len(days))
	}
	baseline := max(avg, 0.5)
	if float64(today) < baseline*3 {
		return false, nil
	}
	ctxMap := map[string]any{"today_swaps": today, "baseline_avg": pyRound(baseline, 2), "swap_id": nil,
		"loan_id": l.ID.String()}
	if swapID != nil {
		ctxMap["swap_id"] = swapID.String()
	}
	line, err := q.CreditLineForUpdate(ctx, acct.ID)
	hasLine := err == nil
	if err != nil && !database.IsNoRows(err) {
		return false, err
	}
	if hasLine && line.Status == "CLOSED" {
		return false, nil
	}
	if _, err := q.LoanForUpdate(ctx, l.ID); err != nil {
		return false, err
	}
	if hasLine {
		if err := q.SetCreditLineStatus(ctx, db.SetCreditLineStatusParams{ID: line.ID, Status: "CLOSED"}); err != nil {
			return false, err
		}
	}
	if err := q.RestrictLoan(ctx, l.ID); err != nil {
		return false, err
	}
	if _, err := risk.Emit(ctx, q, risk.Event{RuleCode: "CREDIT_BUSTOUT", SubjectType: "loan", SubjectID: l.ID.String(),
		AccountID: &acct.ID, Context: ctxMap, ActionTaken: "CLOSE_LINE", Severity: "HIGH"}); err != nil {
		return false, err
	}
	return true, events.Emit(ctx, q, events.Event{Action: "credit.line_closed_bustout", SubjectType: "loan",
		SubjectID: l.ID.String(), After: ctxMap,
		Notify: []events.NotifySpec{{UserID: acct.OwnerUserID, Title: "Swap credit paused",
			Body:     "Unusual swap activity was flagged. Your credit line is closed pending review.",
			Severity: events.Warning, DedupeKey: "credit.bustout:" + l.ID.String()}}})
}

func ptr[T any](v T) *T { return &v }
