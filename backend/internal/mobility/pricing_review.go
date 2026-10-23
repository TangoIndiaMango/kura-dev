package mobility

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/finance"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/mail"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/spend"
)

type scheduleReq struct {
	From   *decode.Date `json:"effective_from"`
	Notice bool         `json:"send_customer_notice"`
}

// schedule is MatrixLifecycleService.schedule_matrix: PENDING → SCHEDULED,
// optionally telling affected owners.
func (h *PricingHandler) schedule(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b scheduleReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	m, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	bad := func(s string) error {
		return apperr.Conflict("INVALID_TRANSITION", "Cannot schedule matrix in status "+s+".")
	}
	if m.Status != "PENDING" {
		respond.Error(w, r, bad(m.Status))
		return
	}
	target := spend.DateOf(m.EffectiveFrom.Time)
	if b.From != nil {
		target = spend.DateOf(b.From.Time)
	}
	if spend.LagosToday(time.Now()).After(target) {
		respond.Error(w, r, apperr.New("VALIDATION_ERROR", "Scheduled effective date must be today or later."))
		return
	}
	var locked db.MobilityPricematrix
	err = database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		var err error
		if locked, err = q.MatrixForUpdate(ctx, m.ID); err != nil {
			return err
		}
		if locked.Status != "PENDING" {
			return bad(locked.Status)
		}
		locked.EffectiveFrom, locked.Status = dateOf(target), "SCHEDULED"
		return q.SetMatrixStatus(ctx, db.SetMatrixStatusParams{ID: locked.ID, Status: "SCHEDULED",
			ApprovedByID: locked.ApprovedByID, EffectiveFrom: locked.EffectiveFrom})
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	sent := 0
	if b.Notice {
		if sent, err = h.customerNotice(ctx, locked); err != nil {
			respond.Error(w, r, err)
			return
		}
	}
	err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
		return events.Emit(ctx, q, events.Event{Action: "price_matrix.scheduled", SubjectType: "price_matrix",
			SubjectID: locked.ID.String(), Actor: who, After: events.Map{"vehicle_type": locked.VehicleType,
				"status": "SCHEDULED", "effective_from": target.ISO(), "customer_notice_sent": b.Notice,
				"customer_notice_count": sent}})
	})
	h.respondMatrix(w, r, m.ID, err)
}

// customerNotice is _dispatch_customer_notice: in-app + email + SMS rows per
// owner of a vehicle of that type, plus the templated email.
func (h *PricingHandler) customerNotice(ctx context.Context, m db.MobilityPricematrix) (int, error) {
	owners, err := h.q.TariffNoticeOwners(ctx, m.VehicleType)
	if err != nil {
		return 0, err
	}
	from := *dateStr(m.EffectiveFrom)
	body := fmt.Sprintf("New %s rates take effect %s: PPS %s, daily %s.", strings.ToLower(m.VehicleType), from,
		finance.FormatNaira(m.PayPerSwapKobo), finance.FormatNaira(m.DailyKobo))
	sent, seen := 0, map[uuid.UUID]bool{}
	for _, o := range owners {
		if seen[o.ID] {
			continue
		}
		seen[o.ID] = true
		params := events.Map{"vehicle_type": m.VehicleType, "effective_from": from,
			"pay_per_swap_kobo": m.PayPerSwapKobo, "daily_kobo": m.DailyKobo, "weekly_kobo": m.WeeklyKobo,
			"monthly_kobo": m.MonthlyKobo, "first_name": o.FirstName}
		email, phone := strings.TrimSpace(deref(o.Email)), strings.TrimSpace(deref(o.Phone))
		for _, ch := range []string{events.InApp, events.Email, events.SMS} {
			if (ch == events.Email && email == "") || (ch == events.SMS && phone == "") {
				continue
			}
			if err := events.Notify(ctx, h.q, events.NotifySpec{UserID: o.ID, Title: "Tariff change notice",
				Body: body, Source: "Pricing", Severity: events.Info, Channels: []string{ch},
				TemplateCode: "tariff.customer_notice", LinkPath: "/plans", Params: params,
				DedupeKey: fmt.Sprintf("tariff.notice:%s:%s:%s", m.ID, o.ID, ch)}); err != nil {
				return sent, err
			}
		}
		if email != "" && h.mailer != nil {
			h.mailer.Send(ctx, mail.Message{To: []string{email}, Subject: "Kura tariff change — effective " + from,
				Template: "tariff_customer_notice", Context: map[string]any{"first_name": firstOf(o.FirstName, "there"),
					"vehicle_type": titleWords(strings.ReplaceAll(m.VehicleType, "_", " ")), "effective_from": from,
					"daily": finance.FormatNaira(m.DailyKobo), "weekly": finance.FormatNaira(m.WeeklyKobo),
					"monthly": finance.FormatNaira(m.MonthlyKobo), "pay_per_swap": finance.FormatNaira(m.PayPerSwapKobo)}})
		}
		sent++
	}
	return sent, nil
}

// titleWords is str.title().
func titleWords(s string) string {
	out := []rune(strings.ToLower(s))
	start := true
	for i, c := range out {
		if c == ' ' {
			start = true
			continue
		}
		if start {
			out[i] = []rune(strings.ToUpper(string(c)))[0]
		}
		start = false
	}
	return string(out)
}

type rejectReq struct {
	Reason string `json:"reason" validate:"max=500"`
}

// reject is MatrixLifecycleService.reject_matrix.
func (h *PricingHandler) reject(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b rejectReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	m, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	bad := func(s string) error {
		return apperr.Conflict("INVALID_TRANSITION", "Cannot reject matrix in status "+s+".")
	}
	if m.Status != "PENDING" && m.Status != "SCHEDULED" {
		respond.Error(w, r, bad(m.Status))
		return
	}
	err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
		locked, err := q.MatrixForUpdate(ctx, m.ID)
		if err != nil {
			return err
		}
		if locked.Status != "PENDING" && locked.Status != "SCHEDULED" {
			return bad(locked.Status)
		}
		if err := q.SetMatrixStatus(ctx, db.SetMatrixStatusParams{ID: locked.ID, Status: "REJECTED",
			ApprovedByID: locked.ApprovedByID, EffectiveFrom: locked.EffectiveFrom}); err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "price_matrix.rejected", SubjectType: "price_matrix",
			SubjectID: locked.ID.String(), Actor: who, After: events.Map{"vehicle_type": locked.VehicleType,
				"status": "REJECTED", "reason": truncate(b.Reason, 500)}})
	})
	h.respondMatrix(w, r, m.ID, err)
}
