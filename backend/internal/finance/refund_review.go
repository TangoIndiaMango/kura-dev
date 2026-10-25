package finance

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
)

// Refunds are never sent automatically: each unused Paystack payment waits
// in REFUND_REVIEW until finance approves it (-> REFUND_PENDING, sent by the
// worker -> REFUNDED) or rejects it (REFUND_REJECTED, with a note).

var refundStatuses = map[string]bool{"REFUND_REVIEW": true, "REFUND_PENDING": true, "REFUNDED": true,
	"REFUND_REJECTED": true}

// RefundDTO is one row of the refunds list.
type RefundDTO struct {
	ID          string         `json:"id"`
	Reference   string         `json:"reference"`
	AmountKobo  int64          `json:"amount_kobo"`
	Status      string         `json:"status"`
	Reason      string         `json:"reason"`
	Channel     string         `json:"channel"`
	Account     string         `json:"account"`
	KuraID      string         `json:"kura_id"`
	AccountName string         `json:"account_name"`
	Purpose     string         `json:"purpose"`
	Swap        *string        `json:"swap"`
	Reservation *string        `json:"reservation"`
	CreatedAt   jsontime.Field `json:"created_at"`
	UpdatedAt   jsontime.Field `json:"updated_at"`
}

// refundFilter is ?status=&search=&start_date=&end_date= (Lagos days).
type refundFilter struct {
	status, q *string
	from, to  *time.Time
}

func parseRefundFilter(r *http.Request) (refundFilter, error) {
	var f refundFilter
	qp := decode.Params(r)
	if st := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("status"))); st != "" {
		if !refundStatuses[st] {
			return f, apperr.Field("status", "Unknown refund status.")
		}
		f.status = &st
	}
	if q := strings.TrimSpace(r.URL.Query().Get("search")); q != "" {
		q = escapeLike(q)
		f.q = &q
	}
	if d := qp.Date("start_date"); d != nil {
		t := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, lagos)
		f.from = &t
	}
	if d := qp.Date("end_date"); d != nil {
		t := time.Date(d.Year(), d.Month(), d.Day()+1, 0, 0, 0, 0, lagos)
		f.to = &t
	}
	return f, qp.Err()
}

// refunds is GET /finance/refunds/: every refund (newest first, cursor
// pages), narrowed by status, search and date range.
func (h *Handler) refunds(w http.ResponseWriter, r *http.Request) {
	f, err := parseRefundFilter(r)
	var at *paginate.Key
	if err == nil {
		at, err = paginate.Cursor(r)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	size := paginate.Size(r)
	p := db.RefundsPageParams{Status: f.status, Q: f.q, FromAt: f.from, ToAt: f.to, Lim: int32(size + 1)}
	if at != nil {
		p.AfterAt, p.Back = &at.CreatedAt, at.Back
		p.AfterID, _ = uuid.Parse(at.ID)
	}
	rows, err := h.q.RefundsPage(r.Context(), p)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows = paginate.Display(rows, size, p.Back)
	out := make([]RefundDTO, len(rows))
	for i, x := range rows {
		out[i] = RefundDTO{ID: x.ID.String(), Reference: x.Reference, AmountKobo: x.AmountKobo, Status: x.Status,
			Reason: x.FailureReason, Channel: x.Channel, Account: x.AccountID.String(), KuraID: x.KuraID,
			AccountName: x.DisplayName, Purpose: x.Purpose, Swap: idPtr(x.SwapID), Reservation: idPtr(x.ReservationID),
			CreatedAt: jsontime.Field(x.CreatedAt), UpdatedAt: jsontime.Field(x.UpdatedAt)}
	}
	respond.OK(w, paginate.BuildCursorPage(r, out, size, at, func(d RefundDTO) paginate.Key {
		return paginate.Key{CreatedAt: time.Time(d.CreatedAt), ID: d.ID}
	}))
}

// refundStats is GET /finance/refunds/stats/ (same search + dates): the KPIs.
func (h *Handler) refundStats(w http.ResponseWriter, r *http.Request) {
	f, err := parseRefundFilter(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	s, err := h.q.RefundStats(r.Context(), db.RefundStatsParams{Q: f.q, FromAt: f.from, ToAt: f.to})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, map[string]any{"review_count": s.ReviewCount, "review_kobo": s.ReviewKobo,
		"approved_count": s.ApprovedCount, "approved_kobo": s.ApprovedKobo, "sent_count": s.SentCount,
		"sent_kobo": s.SentKobo, "rejected_count": s.RejectedCount})
}

// reviewRefund is POST /finance/refunds/{id}/approve/ and /reject/ {note}.
func (h *Handler) reviewRefund(approve bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(r.PathValue("id"))
		if err != nil {
			respond.Error(w, r, apperr.NotFound("Refund not found."))
			return
		}
		var in struct {
			Note string `json:"note" validate:"max=500"`
		}
		if err := decode.JSON(r, &in); err != nil {
			respond.Error(w, r, err)
			return
		}
		note := strings.TrimSpace(in.Note)
		if !approve && note == "" {
			respond.Error(w, r, apperr.Field("note", "Say why the refund is rejected."))
			return
		}
		err = database.InTx(r.Context(), h.pool, func(tx pgx.Tx) error {
			q := db.New(tx)
			who, err := actor.FromRequest(r.Context(), q)
			if err != nil {
				return err
			}
			return reviewRefund(r.Context(), q, id, approve, note, who)
		})
		if err != nil {
			respond.Error(w, r, err)
			return
		}
		respond.OK(w, map[string]any{"id": id.String(), "status": map[bool]string{true: "REFUND_PENDING",
			false: "REFUND_REJECTED"}[approve]})
	}
}

func reviewRefund(ctx context.Context, q *db.Queries, id uuid.UUID, approve bool, note string, who *events.Actor) error {
	c, err := q.CheckoutByIDForUpdate(ctx, id)
	if database.IsNoRows(err) {
		return apperr.NotFound("Refund not found.")
	}
	if err != nil {
		return err
	}
	if c.Status != "REFUND_REVIEW" {
		return apperr.Conflict("INVALID_TRANSITION", "This refund is "+c.Status+", not awaiting review.")
	}
	status, reason := "REFUND_PENDING", c.FailureReason
	if !approve {
		status, reason = "REFUND_REJECTED", c.FailureReason+" · rejected: "+note
	}
	if err := q.SettleCheckout(ctx, db.SettleCheckoutParams{ID: c.ID, Status: status, PaymentID: c.PaymentID,
		FailureReason: truncateStr(reason, 255), Channel: c.Channel}); err != nil {
		return err
	}
	action := "refund.approved"
	if !approve {
		action = "refund.rejected"
	}
	return events.Emit(ctx, q, events.Event{Action: action, SubjectType: "checkout", SubjectID: c.ID.String(),
		SubjectLabel: c.Reference, Actor: who,
		Before: events.Map{"status": c.Status},
		After: events.Map{"status": status, "amount_kobo": c.AmountKobo, "note": note,
			"reviewed_at": jsontime.FormatISO(time.Now())}})
}

func truncateStr(s string, n int) string {
	if r := []rune(s); len(r) > n {
		return string(r[:n])
	}
	return s
}
