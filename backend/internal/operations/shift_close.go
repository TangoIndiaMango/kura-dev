package operations

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/finance"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/mail"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/risk"
)

// ReceiptEmail is send_cash_receipt_email_task, run after the deposit
// commits (in the background, like the Django task queue).
func (s *Service) ReceiptEmail(id uuid.UUID) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
		defer cancel()
		q := db.New(s.pool)
		d, err := q.CashDepositReceipt(ctx, id)
		if err != nil {
			s.log.Warn("cash_receipt_missing", "deposit_id", id, "err", err)
			return
		}
		to := strings.TrimSpace(deref(d.OwnerEmail))
		if to == "" {
			s.log.Warn("cash_receipt_no_email", "deposit_id", id, "account", d.AccountKuraID)
			return
		}
		doc, err := finance.CashReceiptDoc(ctx, q, s.receiptKey, d)
		var pdf []byte
		if err == nil {
			pdf, err = finance.RenderReceiptPDF(doc)
		}
		if err != nil {
			s.log.Error("cash_receipt_failed", "deposit_id", id, "err", err)
			return
		}
		url := ""
		if s.clientURL != "" {
			url = s.clientURL + "/wallet/receipt/" + d.ReceiptCode
		}
		c := map[string]any{"receipt_url": url}
		for _, k := range []string{"receipt_code", "amount_label", "purpose_label", "hub_code", "hub_name",
			"operator_name", "agent_name", "account_kura_id", "issued_at", "issued_at_label", "vehicle_plate",
			"battery_out", "battery_in"} {
			v, _ := doc[k].(string)
			c[k] = v
		}
		s.mailer.Send(ctx, mail.Message{To: []string{to}, Template: "cash_receipt", Context: c,
			Subject:     fmt.Sprintf("Kura cash receipt %s · %s", d.ReceiptCode, c["amount_label"]),
			Attachments: []mail.Attachment{{Filename: d.ReceiptCode + ".pdf", Data: pdf, ContentType: "application/pdf"}}})
	}()
}

func deref(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

// openAlert is settlement._open_alert: reuse a live alert with the same
// prefix, else insert one (no audit row).
func openAlert(ctx context.Context, q *db.Queries, hub *uuid.UUID, kind, severity, prefix, message string) error {
	_, err := q.OpenAlertWithPrefix(ctx, db.OpenAlertWithPrefixParams{Hub: hub, Kind: kind, Prefix: prefix})
	if err == nil || !database.IsNoRows(err) {
		return err
	}
	return q.InsertAlert(ctx, db.InsertAlertParams{ID: ids.New(), Kind: kind, Severity: severity,
		Message: truncate(message, 2000), HubID: hub, DeliveryChannel: "IN_APP"})
}

// OpenAlert is AlertService.open (audited, no actor).
func OpenAlert(ctx context.Context, q *db.Queries, kind, message, severity string, hub *uuid.UUID) error {
	id := ids.New()
	if err := q.InsertAlert(ctx, db.InsertAlertParams{ID: id, Kind: kind, Severity: severity, Message: message,
		HubID: hub, DeliveryChannel: "IN_APP"}); err != nil {
		return err
	}
	return events.Emit(ctx, q, events.Event{Action: "alert.opened", SubjectType: "alert", SubjectID: id.String(),
		SubjectLabel: kind, After: events.Map{"status": "OPEN", "severity": severity, "is_resolved": false}})
}

func abs(n int64) int64 {
	if n < 0 {
		return -n
	}
	return n
}

// CloseShift is ShiftService.close_shift (also records the count on an
// auto-closed window, keeping its close time).
func CloseShift(ctx context.Context, q *db.Queries, id uuid.UUID, counted int64, actor uuid.UUID, who *events.Actor) error {
	sh, err := q.ShiftForUpdate(ctx, id)
	if database.IsNoRows(err) {
		return apperr.NotFound("Shift not found.")
	}
	if err != nil {
		return err
	}
	late := sh.Status == "CLOSED" && sh.AutoClosed && sh.ClosingCashKobo == nil
	if sh.Status != "OPEN" && !late {
		return apperr.Conflict("INVALID_TRANSITION", "Shift is already closed.")
	}
	if counted < 0 {
		return apperr.New("VALIDATION_ERROR", "Closing cash cannot be negative.").
			WithDetails(apperr.Details{"closing_cash_kobo": []string{"non_negative"}})
	}
	deposits, err := q.ShiftDepositTotal(ctx, sh.ID)
	if err != nil {
		return err
	}
	expected := sh.OpeningCashKobo + deposits
	variance := counted - expected
	before := events.Map{"status": sh.Status, "closing_cash_kobo": sh.ClosingCashKobo,
		"expected_cash_kobo": sh.ExpectedCashKobo, "variance_kobo": sh.VarianceKobo}
	closed := time.Now()
	if late && sh.ClosedAt != nil {
		closed = *sh.ClosedAt
	}
	if err := q.SaveShiftClose(ctx, db.SaveShiftCloseParams{ID: sh.ID, ClosingCashKobo: &counted,
		ExpectedCashKobo: &expected, VarianceKobo: &variance, ClosedAt: &closed}); err != nil {
		return err
	}
	hub, err := q.HubRow(ctx, sh.HubID)
	if err != nil {
		return err
	}
	material := abs(variance) >= VarianceFlagKobo
	if material {
		if _, err := risk.Emit(ctx, q, risk.Event{RuleCode: "OVERRIDE_CASH_CORR", SubjectType: "shift",
			SubjectID: sh.ID.String(), ActionTaken: "FLAG", Context: map[string]any{"expected_cash_kobo": expected,
				"closing_cash_kobo": counted, "variance_kobo": variance, "hub_id": sh.HubID.String()}}); err != nil {
			return err
		}
		sev := "WARNING"
		if abs(variance) >= 50_000 {
			sev = "CRITICAL"
		}
		prefix := "shift-var:" + sh.ID.String() + ":"
		if err := openAlert(ctx, q, &sh.HubID, "SHIFT_CASH_VARIANCE", sev, prefix, fmt.Sprintf(
			"%s %s drawer variance %s (expected %s, counted %s).", prefix, hub.Code, finance.FormatNaira(variance),
			finance.FormatNaira(expected), finance.FormatNaira(counted))); err != nil {
			return err
		}
	}
	ev := events.Event{Action: "shift.closed", SubjectType: "shift", SubjectID: sh.ID.String(),
		SubjectLabel: hub.Code + " · closed", Actor: who, Before: before,
		After: events.Map{"status": "CLOSED", "expected_cash_kobo": expected, "closing_cash_kobo": counted,
			"variance_kobo": variance}}
	if material {
		ev.Notify = []events.NotifySpec{{UserID: actor, Title: "Cash variance on shift close",
			Body: fmt.Sprintf("%s: expected %s, counted %s (variance %s).", hub.Code, finance.FormatNaira(expected),
				finance.FormatNaira(counted), finance.FormatNaira(variance)),
			Source: "Shifts", Severity: events.Warning, LinkPath: "/payments/cash/" + sh.ID.String(),
			TemplateCode: "shift.cash_variance", DedupeKey: "shift.cash_variance:" + sh.ID.String()}}
	}
	return events.Emit(ctx, q, ev)
}

// ConfirmLodge is CashSettlementService.confirm_lodge: clear the agent's
// cash float into psp_clearing once the shift's cash is banked.
func ConfirmLodge(ctx context.Context, q *db.Queries, id uuid.UUID, ref string, amount *int64, actor uuid.UUID,
	who *events.Actor) error {
	ref = strings.TrimSpace(ref)
	if ref == "" {
		return apperr.New("VALIDATION_ERROR", "lodge_ref is required.").
			WithDetails(apperr.Details{"lodge_ref": []string{"required"}})
	}
	sh, err := q.ShiftForUpdate(ctx, id)
	if database.IsNoRows(err) {
		return apperr.NotFound("Shift not found.")
	}
	if err != nil {
		return err
	}
	if sh.Status != "CLOSED" {
		return apperr.Conflict("INVALID_TRANSITION", "Lodge cash only after the shift is closed.")
	}
	if sh.LodgeRef != "" && sh.LodgeRef == ref {
		return nil
	}
	if sh.LodgedAt != nil {
		return apperr.Conflict("INVALID_TRANSITION", "Shift cash already lodged.")
	}
	deposits, err := q.ShiftDepositTotal(ctx, sh.ID)
	if err != nil {
		return err
	}
	lodge := deposits
	if amount != nil {
		lodge = *amount
	}
	if lodge < 0 {
		return apperr.New("VALIDATION_ERROR", "Lodge amount cannot be negative.").
			WithDetails(apperr.Details{"amount_kobo": []string{"non_negative"}})
	}
	hub, err := q.HubRow(ctx, sh.HubID)
	if err != nil {
		return err
	}
	if lodge != deposits && abs(lodge-deposits) >= VarianceFlagKobo {
		prefix := "settle:" + sh.ID.String() + ":"
		if err := openAlert(ctx, q, &sh.HubID, "SETTLEMENT_MISMATCH", "WARNING", prefix, fmt.Sprintf(
			"%s lodge %s ≠ shift deposits %s (ref %s).", prefix, finance.FormatNaira(lodge),
			finance.FormatNaira(deposits), ref)); err != nil {
			return err
		}
	}
	if lodge > 0 {
		if _, err := finance.Post(ctx, q, "AGENT_CASH", truncate("LODGE-"+ref, 100),
			fmt.Sprintf("Cash lodge %s for shift %s", ref, sh.ID), []finance.Entry{
				{Code: "psp_clearing", Type: finance.Clearing, Debit: lodge},
				{Code: "cash_float:" + sh.AgentID.String(), Type: finance.Asset, Credit: lodge}}); err != nil {
			return err
		}
	}
	before := events.Map{"lodge_ref": sh.LodgeRef, "lodged_amount_kobo": sh.LodgedAmountKobo}
	if err := q.SaveShiftLodge(ctx, db.SaveShiftLodgeParams{ID: sh.ID, LodgeRef: ref, LodgedAmountKobo: &lodge}); err != nil {
		return err
	}
	return events.Emit(ctx, q, events.Event{Action: "shift.cash_lodged", SubjectType: "shift",
		SubjectID: sh.ID.String(), SubjectLabel: hub.Code + " · " + ref, Actor: who, Before: before,
		After: events.Map{"lodge_ref": ref, "lodged_amount_kobo": lodge, "deposit_total_kobo": deposits},
		Notify: []events.NotifySpec{{UserID: actor, Title: "Cash lodge recorded",
			Body:   fmt.Sprintf("%s: %s · %s", hub.Code, finance.FormatNaira(lodge), ref),
			Source: "Shifts", Severity: events.Info, LinkPath: "/payments/cash/" + sh.ID.String(),
			TemplateCode: "shift.cash_lodged", DedupeKey: "shift.cash_lodged:" + sh.ID.String() + ":" + ref}}})
}
