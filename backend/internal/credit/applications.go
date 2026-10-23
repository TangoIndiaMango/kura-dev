package credit

import (
	"context"
	"fmt"
	"net/http"
	"slices"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platformcfg"
)

// commas is Python's f"{n:,}".
func commas(n int64) string {
	s := fmt.Sprint(n)
	out := []byte{}
	for i := range s {
		if i > 0 && s[i] != '-' && (len(s)-i)%3 == 0 {
			out = append(out, ',')
		}
		out = append(out, s[i])
	}
	return string(out)
}

func truncate(s string, n int) string {
	if r := []rune(s); len(r) > n {
		return string(r[:n])
	}
	return s
}

// appPayload is ApplicationService._application_payload.
func appPayload(ctx context.Context, q *db.Queries, a db.CreditCreditapplication) (map[string]any, error) {
	out := map[string]any{"id": a.ID.String(), "status": a.Status, "amount_kobo": a.AmountKobo,
		"tenor_days": a.TenorDays, "interest_rate_bps": a.InterestRateBps, "disbursement": a.Disbursement,
		"decision_reason": a.DecisionReason, "loan_id": nil, "swap_credit_remaining_kobo": nil,
		"created_at": jsontime.FormatISO(a.CreatedAt)}
	loan, err := q.LoanByApplication(ctx, a.ID)
	if err == nil {
		out["loan_id"], out["swap_credit_remaining_kobo"] = loan.ID.String(), loan.SwapCreditRemainingKobo
	} else if !database.IsNoRows(err) {
		return nil, err
	}
	return out, nil
}

// ApplyIn is ApplicationService.apply's arguments.
type ApplyIn struct {
	Account       db.AccountsAccount
	Amount, Tenor int64
	Key           string
	Actor         *events.Actor
}

// Apply is ApplicationService.apply (PIN grant checked by the caller).
func Apply(ctx context.Context, q *db.Queries, in ApplyIn) (map[string]any, error) {
	cfg, err := platformcfg.Effective(ctx, q, "credit")
	if err != nil {
		return nil, err
	}
	lo, hi := platformcfg.Int(cfg, "min_amount_kobo"), platformcfg.Int(cfg, "max_amount_kobo")
	if in.Amount < lo || in.Amount > hi {
		return nil, apperr.New("CREDIT_LIMIT", fmt.Sprintf("Amount must be between %d and %d kobo.", lo, hi))
	}
	tenors := []int64{}
	if list, ok := cfg["tenor_days"].([]any); ok {
		for _, t := range list {
			if f, ok := t.(float64); ok {
				tenors = append(tenors, int64(f))
			}
		}
	}
	if !slices.Contains(tenors, in.Tenor) {
		parts := make([]string, len(tenors))
		for i, t := range tenors {
			parts[i] = fmt.Sprint(t)
		}
		return nil, apperr.New("VALIDATION_ERROR", fmt.Sprintf("tenor_days must be one of [%s].", joinComma(parts)))
	}
	if a, err := q.ApplicationByKey(ctx, in.Key); err == nil {
		return appPayload(ctx, q, a)
	} else if !database.IsNoRows(err) {
		return nil, err
	}
	el, err := Evaluate(ctx, q, in.Account, "")
	if err != nil {
		return nil, err
	}
	if !el.Eligible {
		return nil, apperr.New("CREDIT_INELIGIBLE", "Account is not eligible for swap credit.").
			WithStatus(http.StatusForbidden).WithDetails(apperr.Details{"blockers": el.Blockers})
	}
	if in.Amount > el.Limit {
		return nil, apperr.New("CREDIT_LIMIT", "Amount exceeds recommended limit.").
			WithDetails(apperr.Details{"recommended_limit_kobo": el.Limit})
	}
	today := time.Now().UTC()
	n, err := q.ApplicationsToday(ctx, db.ApplicationsTodayParams{AccountID: in.Account.ID,
		Day: pgtype.Date{Time: time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, time.UTC), Valid: true}})
	if err != nil {
		return nil, err
	}
	if n >= 3 {
		return nil, apperr.New("THROTTLED", "Max 3 credit applications per day.").WithStatus(http.StatusTooManyRequests)
	}
	if err := q.EnsureCreditLine(ctx, db.EnsureCreditLineParams{ID: ids.New(), LimitKobo: el.Limit,
		AccountID: in.Account.ID}); err != nil {
		return nil, err
	}
	line, err := q.CreditLineForUpdate(ctx, in.Account.ID)
	if err != nil {
		return nil, err
	}
	app := db.CreditCreditapplication{ID: ids.New(), AmountKobo: in.Amount, TenorDays: int16(in.Tenor),
		InterestRateBps: int32(platformcfg.Int(cfg, "interest_rate_bps")), Disbursement: "SWAP_CREDIT",
		Status: "SUBMITTED", IdempotencyKey: in.Key, AccountID: in.Account.ID, CreditLineID: &line.ID}
	if err := q.InsertApplication(ctx, db.InsertApplicationParams{ID: app.ID, AmountKobo: app.AmountKobo,
		TenorDays: app.TenorDays, InterestRateBps: app.InterestRateBps, IdempotencyKey: app.IdempotencyKey,
		AccountID: app.AccountID, CreditLineID: app.CreditLineID}); err != nil {
		return nil, err
	}
	if err := events.Emit(ctx, q, events.Event{Action: "credit.application_submitted",
		SubjectType: "credit_application", SubjectID: app.ID.String(), Actor: in.Actor,
		After: events.Map{"amount_kobo": in.Amount, "tenor_days": in.Tenor, "status": "SUBMITTED"},
		Notify: []events.NotifySpec{{UserID: in.Account.OwnerUserID, Title: "Credit application received",
			Body:     fmt.Sprintf("We received your ₦%s swap-credit request.", commas(in.Amount/100)),
			Severity: events.Info, DedupeKey: "credit.apply:" + app.ID.String()}}}); err != nil {
		return nil, err
	}
	if auto := platformcfg.Int(cfg, "auto_approve_max_kobo"); auto > 0 && in.Amount <= auto {
		if err := disburse(ctx, q, &app, nil, nil, "auto_approve"); err != nil {
			return nil, err
		}
	}
	fresh, err := q.ApplicationByID(ctx, app.ID)
	if err != nil {
		return nil, err
	}
	return appPayload(ctx, q, fresh)
}

func joinComma(parts []string) string {
	out := ""
	for i, p := range parts {
		if i > 0 {
			out += ", "
		}
		out += p
	}
	return out
}

// disburse is ApplicationService._disburse: open the SWAP_CREDIT loan.
func disburse(ctx context.Context, q *db.Queries, app *db.CreditCreditapplication, decider *uuid.UUID, who *events.Actor,
	reason string) error {
	if app.Disbursement != "SWAP_CREDIT" {
		return apperr.New("DISBURSEMENT_FORBIDDEN", "Only SWAP_CREDIT disbursement is allowed (D10).")
	}
	interest := app.AmountKobo * int64(app.InterestRateBps) / 10_000
	total := app.AmountKobo + interest
	daily := max(1, total/int64(app.TenorDays))
	now := time.Now()
	loanID := ids.New()
	if err := q.InsertLoan(ctx, db.InsertLoanParams{ID: loanID, PrincipalKobo: app.AmountKobo, InterestKobo: interest,
		TotalDueKobo: total, DailyInstallmentKobo: daily, StartsAt: now,
		DueAt: now.AddDate(0, 0, int(app.TenorDays)), AccountID: app.AccountID, ApplicationID: app.ID}); err != nil {
		return err
	}
	if decider != nil {
		app.DecidedByID = decider
	}
	app.Status, app.DecisionReason = "DISBURSED", truncate(reason, 255)
	if err := q.SaveApplicationDecision(ctx, db.SaveApplicationDecisionParams{ID: app.ID, Status: app.Status,
		DecidedByID: app.DecidedByID, DecisionReason: app.DecisionReason}); err != nil {
		return err
	}
	if app.CreditLineID != nil {
		if err := q.ActivateCreditLine(ctx, db.ActivateCreditLineParams{ID: *app.CreditLineID, LimitKobo: app.AmountKobo}); err != nil {
			return err
		}
	}
	acct, err := q.AccountByID(ctx, app.AccountID)
	if err != nil {
		return err
	}
	return events.Emit(ctx, q, events.Event{Action: "credit.loan_disbursed", SubjectType: "loan",
		SubjectID: loanID.String(), Actor: who,
		After: events.Map{"principal_kobo": app.AmountKobo, "swap_credit_remaining_kobo": app.AmountKobo,
			"tenor_days": app.TenorDays},
		Notify: []events.NotifySpec{{UserID: acct.OwnerUserID, Title: "Swap credit approved",
			Body:     fmt.Sprintf("₦%s swap credit is ready. Repay over %d days.", commas(app.AmountKobo/100), app.TenorDays),
			Severity: events.Info, DedupeKey: "credit.disburse:" + loanID.String()}}})
}

// Decide is approve (disburse) / decline for a SUBMITTED application.
func Decide(ctx context.Context, q *db.Queries, id uuid.UUID, approve bool, decider uuid.UUID, who *events.Actor,
	reason string) (map[string]any, error) {
	app, err := q.ApplicationByID(ctx, id)
	if err != nil {
		return nil, err
	}
	done := "DECLINED"
	verb := "decline"
	if approve {
		if err := platformcfg.RequireEnabled(ctx, q, "credit"); err != nil {
			return nil, err
		}
		done, verb = "DISBURSED", "approve"
	}
	if app.Status == done {
		return appPayload(ctx, q, app)
	}
	if app.Status != "SUBMITTED" {
		return nil, apperr.Conflict("INVALID_TRANSITION", fmt.Sprintf("Cannot %s application in %s.", verb, app.Status))
	}
	app, err = q.ApplicationForUpdate(ctx, id)
	if err != nil {
		return nil, err
	}
	if app.Status == done {
		return appPayload(ctx, q, app)
	}
	if approve {
		if reason == "" {
			reason = "approved"
		}
		app.Status, app.DecidedByID, app.DecisionReason = "APPROVED", &decider, truncate(reason, 255)
		if err := q.SaveApplicationDecision(ctx, db.SaveApplicationDecisionParams{ID: app.ID, Status: app.Status,
			DecidedByID: app.DecidedByID, DecisionReason: app.DecisionReason}); err != nil {
			return nil, err
		}
		if err := disburse(ctx, q, &app, &decider, who, reason); err != nil {
			return nil, err
		}
	} else {
		if reason == "" {
			reason = "declined"
		}
		app.Status, app.DecidedByID, app.DecisionReason = "DECLINED", &decider, truncate(reason, 255)
		if err := q.SaveApplicationDecision(ctx, db.SaveApplicationDecisionParams{ID: app.ID, Status: app.Status,
			DecidedByID: app.DecidedByID, DecisionReason: app.DecisionReason}); err != nil {
			return nil, err
		}
		acct, err := q.AccountByID(ctx, app.AccountID)
		if err != nil {
			return nil, err
		}
		body := app.DecisionReason
		if body == "" {
			body = "Your credit request was declined."
		}
		if err := events.Emit(ctx, q, events.Event{Action: "credit.application_declined",
			SubjectType: "credit_application", SubjectID: app.ID.String(), Actor: who,
			After: events.Map{"status": app.Status, "reason": app.DecisionReason},
			Notify: []events.NotifySpec{{UserID: acct.OwnerUserID, Title: "Credit application declined", Body: body,
				Severity: events.Warning, DedupeKey: "credit.decline:" + app.ID.String()}}}); err != nil {
			return nil, err
		}
	}
	fresh, err := q.ApplicationByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return appPayload(ctx, q, fresh)
}
