package mobility

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/approval"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/finance"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/mail"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/spend"
)

// MatrixDTO is PriceMatrixDetailSerializer (the list leaves out the last three).
type MatrixDTO struct {
	ID             string         `json:"id"`
	VehicleType    string         `json:"vehicle_type"`
	DailyKobo      int64          `json:"daily_kobo"`
	WeeklyKobo     int64          `json:"weekly_kobo"`
	MonthlyKobo    int64          `json:"monthly_kobo"`
	PayPerSwapKobo int64          `json:"pay_per_swap_kobo"`
	EffectiveFrom  string         `json:"effective_from"`
	Status         string         `json:"status"`
	CreatedAt      jsontime.Field `json:"created_at"`
}

type matrixDetailDTO struct {
	MatrixDTO
	CreatedByID  *string        `json:"created_by_id"`
	ApprovedByID *string        `json:"approved_by_id"`
	UpdatedAt    jsontime.Field `json:"updated_at"`
}

func matrixDTO(m db.MobilityPricematrix) MatrixDTO {
	return MatrixDTO{ID: m.ID.String(), VehicleType: m.VehicleType, DailyKobo: m.DailyKobo, WeeklyKobo: m.WeeklyKobo,
		MonthlyKobo: m.MonthlyKobo, PayPerSwapKobo: m.PayPerSwapKobo, EffectiveFrom: *dateStr(m.EffectiveFrom),
		Status: m.Status, CreatedAt: jsontime.Field(m.CreatedAt)}
}

func matrixDetail(m db.MobilityPricematrix) matrixDetailDTO {
	return matrixDetailDTO{MatrixDTO: matrixDTO(m), CreatedByID: idPtr(m.CreatedByID),
		ApprovedByID: idPtr(m.ApprovedByID), UpdatedAt: jsontime.Field(m.UpdatedAt)}
}

// PricingHandler serves /api/v1/mobility/pricing.
type PricingHandler struct {
	pool   *pgxpool.Pool
	q      *db.Queries
	mailer *mail.Mailer
}

func NewPricingHandler(pool *pgxpool.Pool, mailer *mail.Mailer) *PricingHandler {
	return &PricingHandler{pool: pool, q: db.New(pool), mailer: mailer}
}

const matrixStatuses = "ACTIVE PENDING SCHEDULED REJECTED APPROVED SUPERSEDED"

func matrixOrdering(raw string) string {
	for _, t := range strings.Split(raw, ",") {
		switch t = strings.TrimSpace(t); strings.TrimPrefix(t, "-") {
		case "effective_from", "created_at", "vehicle_type":
			return t
		}
	}
	return ""
}

func (h *PricingHandler) list(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	status, err := listq.Choice(r, "status", strings.Fields(matrixStatuses)...)
	if err == nil {
		err = ensureDefaults(ctx, h.q)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	vt := listq.Exact(r, "vehicle_type")
	total, err := h.q.CountMatrices(ctx, db.CountMatricesParams{Status: status, VehicleType: vt})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	page, size := paginate.Page(r), paginate.Size(r)
	rows, err := h.q.ListMatrices(ctx, db.ListMatricesParams{Status: status, VehicleType: vt,
		Ord: matrixOrdering(r.URL.Query().Get("ordering")), Lim: int32(size), Off: int32(paginate.Offset(page, size))})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]MatrixDTO, len(rows))
	for i, m := range rows {
		out[i] = matrixDTO(m)
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

// object is get_object over the (filtered) matrices, after ensure_defaults.
func (h *PricingHandler) object(r *http.Request) (db.MobilityPricematrix, error) {
	ctx := r.Context()
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.MobilityPricematrix{}, apperr.NotFound("Not found.")
	}
	status, err := listq.Choice(r, "status", strings.Fields(matrixStatuses)...)
	if err != nil {
		return db.MobilityPricematrix{}, err
	}
	if err := ensureDefaults(ctx, h.q); err != nil {
		return db.MobilityPricematrix{}, err
	}
	m, err := h.q.MatrixByID(ctx, id)
	vt := listq.Exact(r, "vehicle_type")
	if database.IsNoRows(err) || (err == nil && ((status != nil && m.Status != *status) ||
		(vt != nil && m.VehicleType != *vt))) {
		return m, apperr.NotFound("No PriceMatrix matches the given query.")
	}
	return m, err
}

func (h *PricingHandler) get(w http.ResponseWriter, r *http.Request) {
	m, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, matrixDetail(m))
}

type matrixCreateReq struct {
	VehicleType *string      `json:"vehicle_type" validate:"required,notblank,max=50"`
	Daily       *int64       `json:"daily_kobo" validate:"required,min=1"`
	Weekly      *int64       `json:"weekly_kobo" validate:"required,min=1"`
	Monthly     *int64       `json:"monthly_kobo" validate:"required,min=1"`
	PPS         *int64       `json:"pay_per_swap_kobo" validate:"required,min=1"`
	From        *decode.Date `json:"effective_from" validate:"required"`
}

// create is PricingService.queue_matrix: a PENDING proposal.
func (h *PricingHandler) create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b matrixCreateReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	if err := ensureDefaults(ctx, h.q); err != nil {
		respond.Error(w, r, err)
		return
	}
	var m db.MobilityPricematrix
	err := h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
		var err error
		m, err = q.InsertMatrix(ctx, db.InsertMatrixParams{ID: ids.New(), VehicleType: normalizeVehicleType(*b.VehicleType),
			DailyKobo: *b.Daily, WeeklyKobo: *b.Weekly, MonthlyKobo: *b.Monthly, PayPerSwapKobo: *b.PPS,
			EffectiveFrom: dateOf(spend.DateOf(b.From.Time)), Status: "PENDING", CreatedByID: actorID(who)})
		if err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "price_matrix.queued", SubjectType: "price_matrix",
			SubjectID: m.ID.String(), Actor: who, After: events.Map{"vehicle_type": *b.VehicleType,
				"status": "PENDING", "effective_from": b.From.String()}})
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.Created(w, matrixDetail(m))
}

func (h *PricingHandler) tx(ctx context.Context, fn func(q *db.Queries, who *events.Actor) error) error {
	return database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		who, err := actor.FromRequest(ctx, q)
		if err != nil {
			return err
		}
		return fn(q, who)
	})
}

func me(ctx context.Context, q *db.Queries) (db.GetUserByIDRow, error) {
	uid, _ := uuid.Parse(reqctx.User(ctx).UserID)
	return q.GetUserByID(ctx, uid)
}

// activate is PricingService.activate_matrix: publish (maker-checker) and
// supersede the previous ACTIVE tariff for that vehicle type.
func (h *PricingHandler) activate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	m, err := h.object(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	if m.Status != "PENDING" && m.Status != "APPROVED" && m.Status != "SCHEDULED" {
		respond.Error(w, r, apperr.Conflict("INVALID_TRANSITION", fmt.Sprintf("Cannot activate matrix in status %s.", m.Status)))
		return
	}
	user, err := me(ctx, h.q)
	if err == nil {
		err = approval.AssertNotSelf(user, m.CreatedByID, "Creator cannot activate their own price matrix.")
	}
	if err == nil {
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			locked, err := q.MatrixForUpdate(ctx, m.ID)
			if err != nil {
				return err
			}
			if err := q.SupersedeMatrices(ctx, db.SupersedeMatricesParams{VehicleType: locked.VehicleType, ID: locked.ID}); err != nil {
				return err
			}
			if err := q.SetMatrixStatus(ctx, db.SetMatrixStatusParams{ID: locked.ID, Status: "ACTIVE",
				ApprovedByID: &user.ID, EffectiveFrom: locked.EffectiveFrom}); err != nil {
				return err
			}
			if err := syncPlanPrices(ctx, q, locked); err != nil {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "price_matrix.activated", SubjectType: "price_matrix",
				SubjectID: locked.ID.String(), Actor: who,
				After: events.Map{"vehicle_type": locked.VehicleType, "pay_per_swap_kobo": locked.PayPerSwapKobo,
					"effective_from": *dateStr(locked.EffectiveFrom), "approved_by_id": user.ID.String(),
					"created_by_id": idOrNil(locked.CreatedByID)},
				Metadata: approval.Metadata(user, locked.CreatedByID)})
		})
	}
	h.respondMatrix(w, r, m.ID, err)
}

func (h *PricingHandler) respondMatrix(w http.ResponseWriter, r *http.Request, id uuid.UUID, err error) {
	var m db.MobilityPricematrix
	if err == nil {
		m, err = h.q.MatrixByID(r.Context(), id)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, matrixDetail(m))
}

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

// holdPolicy is get_hold_policy (first row, created on demand).
func holdPolicy(ctx context.Context, q *db.Queries) (db.MobilityBayholdpolicy, error) {
	p, err := q.FirstHoldPolicy(ctx)
	if database.IsNoRows(err) {
		return q.InsertHoldPolicy(ctx, db.InsertHoldPolicyParams{ID: ids.New(), DefaultHoldMinutes: 15, MaxExtendMinutes: 15})
	}
	return p, err
}

func (h *PricingHandler) getHold(w http.ResponseWriter, r *http.Request) {
	p, err := holdPolicy(r.Context(), h.q)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, map[string]int32{"default_hold_minutes": p.DefaultHoldMinutes, "max_extend_minutes": p.MaxExtendMinutes})
}

type holdReq struct {
	Default *int64 `json:"default_hold_minutes" validate:"required,min=5,max=60"`
	Extend  *int64 `json:"max_extend_minutes" validate:"required,min=5,max=60"`
}

func (h *PricingHandler) putHold(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b holdReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	var out db.MobilityBayholdpolicy
	err := h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
		p, err := holdPolicy(ctx, q)
		if err != nil {
			return err
		}
		before := events.Map{"default_hold_minutes": p.DefaultHoldMinutes, "max_extend_minutes": p.MaxExtendMinutes}
		p.DefaultHoldMinutes, p.MaxExtendMinutes = int32(*b.Default), int32(*b.Extend)
		if err := q.UpdateHoldPolicy(ctx, db.UpdateHoldPolicyParams{ID: p.ID, DefaultHoldMinutes: p.DefaultHoldMinutes,
			MaxExtendMinutes: p.MaxExtendMinutes}); err != nil {
			return err
		}
		out = p
		return events.Emit(ctx, q, events.Event{Action: "hold_policy.updated", SubjectType: "hold_policy",
			SubjectID: p.ID.String(), Actor: who, Before: before,
			After: events.Map{"default_hold_minutes": p.DefaultHoldMinutes, "max_extend_minutes": p.MaxExtendMinutes}})
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, map[string]int32{"default_hold_minutes": out.DefaultHoldMinutes, "max_extend_minutes": out.MaxExtendMinutes})
}
