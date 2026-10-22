package finance

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

type entryDTO struct {
	ID          string `json:"id"`
	AccountCode string `json:"account_code"`
	AccountType string `json:"account_type"`
	DebitKobo   int64  `json:"debit_kobo"`
	CreditKobo  int64  `json:"credit_kobo"`
}

type ledgerDTO struct {
	ID          string         `json:"id"`
	Kind        string         `json:"kind"`
	Reference   string         `json:"reference"`
	Description string         `json:"description"`
	PostedAt    jsontime.Field `json:"posted_at"`
	Entries     []entryDTO     `json:"entries"`
	createdAt   time.Time
}

func (h *Handler) ledgerDTOs(ctx context.Context, txs []db.FinanceLedgertransaction) ([]ledgerDTO, error) {
	idList := make([]uuid.UUID, len(txs))
	for i, t := range txs {
		idList[i] = t.ID
	}
	entries, err := h.q.LedgerEntriesFor(ctx, idList)
	if err != nil {
		return nil, err
	}
	by := map[uuid.UUID][]entryDTO{}
	for _, e := range entries {
		by[e.TransactionID] = append(by[e.TransactionID], entryDTO{e.ID.String(), e.Code, e.AccountType, e.DebitKobo,
			e.CreditKobo})
	}
	out := make([]ledgerDTO, len(txs))
	for i, t := range txs {
		es := by[t.ID]
		if es == nil {
			es = []entryDTO{}
		}
		out[i] = ledgerDTO{ID: t.ID.String(), Kind: t.Kind, Reference: t.Reference, Description: t.Description,
			PostedAt: jsontime.Field(t.PostedAt), Entries: es, createdAt: t.CreatedAt}
	}
	return out, nil
}

func (h *Handler) ledger(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	at, err := paginate.Cursor(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	size := paginate.Size(r)
	p := db.LedgerPageParams{Lim: int32(size + 1)}
	if at != nil {
		p.AfterAt, p.Back = &at.CreatedAt, at.Back
		p.AfterID, _ = uuid.Parse(at.ID)
	}
	rows, err := h.q.LedgerPage(ctx, p)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out, err := h.ledgerDTOs(ctx, paginate.Display(rows, size, p.Back))
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, paginate.BuildCursorPage(r, out, size, at, func(d ledgerDTO) paginate.Key {
		return paginate.Key{CreatedAt: d.createdAt, ID: d.ID}
	}))
}

func (h *Handler) ledgerTx(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, r, apperr.NotFound("Not found."))
		return
	}
	t, err := h.q.LedgerTxByID(ctx, id)
	if database.IsNoRows(err) {
		err = apperr.NotFound("No LedgerTransaction matches the given query.")
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out, err := h.ledgerDTOs(ctx, []db.FinanceLedgertransaction{t})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, out[0])
}
