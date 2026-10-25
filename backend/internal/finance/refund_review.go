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
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
)

// Refunds are never sent automatically: each unused Paystack payment waits
// in REFUND_REVIEW until finance approves it (-> REFUND_PENDING, sent by the
// worker -> REFUNDED) or rejects it (REFUND_REJECTED, with a note).

var refundStatuses = map[string]bool{"REFUND_REVIEW": true, "REFUND_PENDING": true, "REFUNDED": true,
	"REFUND_REJECTED": true}

func refundJSON(r db.RefundsByStatusRow) map[string]any {
	out := map[string]any{"id": r.ID.String(), "reference": r.Reference, "amount_kobo": r.AmountKobo,
		"status": r.Status, "reason": r.FailureReason, "channel": r.Channel, "account": r.AccountID.String(),
		"kura_id": r.KuraID, "account_name": r.DisplayName, "purpose": r.Purpose,
		"created_at": jsontime.FormatISO(r.CreatedAt), "updated_at": jsontime.FormatISO(r.UpdatedAt)}
	if r.SwapID != nil {
		out["swap"] = r.SwapID.String()
	}
	if r.ReservationID != nil {
		out["reservation"] = r.ReservationID.String()
	}
	return out
}

// refunds is GET /finance/refunds/?status=REFUND_REVIEW (default).
func (h *Handler) refunds(w http.ResponseWriter, r *http.Request) {
	status := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("status")))
	if status == "" {
		status = "REFUND_REVIEW"
	}
	if !refundStatuses[status] {
		respond.Error(w, r, apperr.Field("status", "Unknown refund status."))
		return
	}
	rows, err := h.q.RefundsByStatus(r.Context(), db.RefundsByStatusParams{Status: status, Limit: 200})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]map[string]any, 0, len(rows))
	for _, x := range rows {
		out = append(out, refundJSON(x))
	}
	respond.OK(w, map[string]any{"results": out})
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
