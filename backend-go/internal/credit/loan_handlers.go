package credit

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

type loanItem struct {
	body map[string]any
	at   time.Time
	id   string
}

func (l loanItem) MarshalJSON() ([]byte, error) { return json.Marshal(l.body) }

func (h *Handler) loans(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	all, acct, err := h.scopeAccount(ctx)
	var at *paginate.Key
	if err == nil {
		at, err = paginate.Cursor(r)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	size := paginate.Size(r)
	p := db.LoansPageParams{AllRows: all, Account: acct, Lim: int32(size + 1)}
	if at != nil {
		p.AfterAt, p.Back = &at.CreatedAt, at.Back
		p.AfterID, _ = uuid.Parse(at.ID)
	}
	rows, err := h.q.LoansPage(ctx, p)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows = paginate.Display(rows, size, p.Back)
	out := make([]loanItem, 0, len(rows))
	for _, x := range rows {
		l, err := LoadLoan(ctx, h.q, x.ID)
		if err != nil {
			respond.Error(w, r, err)
			return
		}
		out = append(out, loanItem{loanListPayload(l), l.CreatedAt, l.ID.String()})
	}
	respond.OK(w, paginate.BuildCursorPage(r, out, size, at, func(l loanItem) paginate.Key {
		return paginate.Key{CreatedAt: l.at, ID: l.id}
	}))
}

// loan is get_object: scoped (404), then the read-own check (403).
func (h *Handler) loan(r *http.Request) (db.LoanRowsRow, error) {
	ctx := r.Context()
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.LoanRowsRow{}, apperr.NotFound("Not found.")
	}
	all, acct, err := h.scopeAccount(ctx)
	if err != nil {
		return db.LoanRowsRow{}, err
	}
	l, err := LoadLoan(ctx, h.q, id)
	if err == nil && !all && l.AccountID != acct {
		err = apperr.NotFound("No Loan matches the given query.")
	}
	if err != nil {
		return l, err
	}
	return l, readOwn(ctx, l.OwnerUserID)
}

func (h *Handler) getLoan(w http.ResponseWriter, r *http.Request) {
	l, err := h.loan(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, loanPayload(l))
}

type repayReq struct {
	Amount   *int64 `json:"amount_kobo" validate:"required,min=1"`
	Key      string `json:"idempotency_key" validate:"required,max=64"`
	PinGrant string `json:"pin_grant" validate:"required"`
}

// repay: serializer, get_object, then the service (credit on, PIN grant).
func (h *Handler) repay(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b repayReq
	err := decode.JSON(r, &b)
	var l db.LoanRowsRow
	if err == nil {
		l, err = h.loan(r)
	}
	if err == nil {
		err = h.creditOnThenPin(r, b.PinGrant)
	}
	var out map[string]any
	if err == nil {
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			var err error
			out, err = Repay(ctx, q, l.ID, *b.Amount, b.Key, who)
			return err
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, out)
}

func (h *Handler) creditOnThenPin(r *http.Request, grant string) error {
	ctx := r.Context()
	if err := requireCredit(ctx, h.q); err != nil {
		return err
	}
	return h.tokens.AssertPinGrant(grant, me(ctx))
}

// ScoreDTO is one CreditScoreViewSet list row.
type ScoreDTO struct {
	ID                   string `json:"id"`
	AccountID            string `json:"account_id"`
	Score                int16  `json:"score"`
	RecommendedLimitKobo int64  `json:"recommended_limit_kobo"`
	ComputedBy           string `json:"computed_by"`
	ComputedAt           string `json:"computed_at"`
	OverrideReason       string `json:"override_reason"`
	at                   time.Time
}

func (h *Handler) scores(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var account *uuid.UUID
	if raw := r.URL.Query().Get("account"); raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			respond.Error(w, r, apperr.Validation(apperr.Details{"non_field_errors": []string{"“" + raw + "” is not a valid UUID."}}))
			return
		}
		account = &id
	}
	at, err := paginate.Cursor(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	size := paginate.Size(r)
	p := db.ScoresPageParams{Account: account, Lim: int32(size + 1)}
	if at != nil {
		p.AfterAt, p.Back = &at.CreatedAt, at.Back
		p.AfterID, _ = uuid.Parse(at.ID)
	}
	rows, err := h.q.ScoresPage(ctx, p)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows = paginate.Display(rows, size, p.Back)
	out := make([]ScoreDTO, len(rows))
	for i, s := range rows {
		out[i] = ScoreDTO{ID: s.ID.String(), AccountID: s.AccountID.String(), Score: s.Score,
			RecommendedLimitKobo: s.RecommendedLimitKobo, ComputedBy: s.ComputedBy,
			ComputedAt: jsontime.FormatISO(s.ComputedAt), OverrideReason: s.OverrideReason, at: s.CreatedAt}
	}
	respond.OK(w, paginate.BuildCursorPage(r, out, size, at, func(s ScoreDTO) paginate.Key {
		return paginate.Key{CreatedAt: s.at, ID: s.ID}
	}))
}

type overrideReq struct {
	Score  *int64 `json:"score" validate:"required,min=0,max=100"`
	Limit  *int64 `json:"recommended_limit_kobo" validate:"required,min=0"`
	Reason string `json:"reason" validate:"required,max=255"`
}

// override is ScoreService.override (manual score + line limit).
func (h *Handler) override(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b overrideReq
	err := decode.JSON(r, &b)
	var acct db.AccountsAccount
	if err == nil {
		raw := r.PathValue("account_id")
		id, perr := uuid.Parse(raw)
		if perr != nil {
			err = apperr.Validation(apperr.Details{"non_field_errors": []string{"“" + raw + "” is not a valid UUID."}})
		} else if acct, err = h.q.AccountByID(ctx, id); database.IsNoRows(err) {
			err = apperr.NotFound("No Account matches the given query.")
		}
	}
	id := ids.New()
	if err == nil {
		uid := me(ctx)
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			factors, _ := json.Marshal(map[string]any{"override": true})
			if err := q.InsertCreditScore(ctx, db.InsertCreditScoreParams{ID: id, Score: int16(*b.Score),
				Factors: factors, RecommendedLimitKobo: *b.Limit, Version: "manual", ComputedBy: "MANUAL",
				OverrideReason: truncate(b.Reason, 255), AccountID: acct.ID, OverrideByID: &uid}); err != nil {
				return err
			}
			if err := q.EnsureCreditLine(ctx, db.EnsureCreditLineParams{ID: ids.New(), LimitKobo: *b.Limit,
				AccountID: acct.ID}); err != nil {
				return err
			}
			if err := q.SaveCreditLineScore(ctx, db.SaveCreditLineScoreParams{AccountID: acct.ID, ScoreID: &id,
				LimitKobo: *b.Limit}); err != nil {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "credit.score_override", SubjectType: "credit_score",
				SubjectID: id.String(), Actor: who,
				After: events.Map{"score": *b.Score, "recommended_limit_kobo": *b.Limit, "reason": b.Reason}})
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.JSON(w, http.StatusCreated, map[string]any{"id": id.String(), "account_id": acct.ID.String(),
		"score": *b.Score, "recommended_limit_kobo": *b.Limit})
}
