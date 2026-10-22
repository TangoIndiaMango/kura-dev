package finance

import (
	"context"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

// WalletDTO is WalletListSerializer.
type WalletDTO struct {
	ID            string         `json:"id"`
	AccountID     string         `json:"account_id"`
	BalanceKobo   int64          `json:"balance_kobo"`
	HoldKobo      int64          `json:"hold_kobo"`
	AvailableKobo int64          `json:"available_kobo"`
	Status        string         `json:"status"`
	CreatedAt     jsontime.Field `json:"created_at"`
}

type vaDTO struct {
	ID           string  `json:"id"`
	Nuban        *string `json:"nuban"`
	BankName     string  `json:"bank_name"`
	AccountName  string  `json:"account_name"`
	PspReference string  `json:"psp_reference"`
	Status       string  `json:"status"`
}

// WalletDetailDTO is WalletDetailSerializer.
type WalletDetailDTO struct {
	WalletDTO
	VirtualAccountID *string        `json:"virtual_account_id"`
	VirtualAccount   *vaDTO         `json:"virtual_account"`
	DemoFundEnabled  bool           `json:"demo_fund_enabled"`
	UpdatedAt        jsontime.Field `json:"updated_at"`
}

func walletDTO(w db.FinanceWallet) WalletDTO {
	return WalletDTO{ID: w.ID.String(), AccountID: w.AccountID.String(), BalanceKobo: w.BalanceKobo,
		HoldKobo: w.HoldKobo, AvailableKobo: max(0, w.BalanceKobo-w.HoldKobo), Status: w.Status,
		CreatedAt: jsontime.Field(w.CreatedAt)}
}

func (h *Handler) walletDetail(ctx context.Context, w db.FinanceWallet) (WalletDetailDTO, error) {
	d := WalletDetailDTO{WalletDTO: walletDTO(w), DemoFundEnabled: h.demoFund, UpdatedAt: jsontime.Field(w.UpdatedAt)}
	va, err := h.q.VirtualAccountFull(ctx, w.AccountID)
	if database.IsNoRows(err) {
		return d, nil
	}
	if err != nil {
		return d, err
	}
	id := va.ID.String()
	d.VirtualAccountID = &id
	d.VirtualAccount = &vaDTO{ID: id, Nuban: va.Nuban, BankName: va.BankName, AccountName: va.AccountName,
		PspReference: va.PspReference, Status: va.Status}
	return d, nil
}

func (h *Handler) wallets(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	qp := decode.Params(r)
	account := qp.UUID("account")
	if err := qp.Err(); err != nil {
		respond.Error(w, r, err)
		return
	}
	all, own, err := h.scope(ctx)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	if own == nil {
		own = []uuid.UUID{}
	}
	status := listq.Exact(r, "status")
	total, err := h.q.CountWallets(ctx, db.CountWalletsParams{AllRows: all, Own: own, Account: account, Status: status})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	page, size := paginate.Page(r), paginate.Size(r)
	rows, err := h.q.ListWallets(ctx, db.ListWalletsParams{AllRows: all, Own: own, Account: account, Status: status,
		Lim: int32(size), Off: int32(paginate.Offset(page, size))})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]WalletDTO, len(rows))
	for i, x := range rows {
		out[i] = walletDTO(x)
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

func (h *Handler) wallet(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, r, apperr.NotFound("Not found."))
		return
	}
	all, own, err := h.scope(ctx)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	row, err := h.q.WalletByID(ctx, id)
	if database.IsNoRows(err) || (err == nil && !all && !contains(own, row.AccountID)) {
		err = apperr.NotFound("No Wallet matches the given query.")
	}
	if err == nil {
		p := reqctx.User(ctx)
		if !(p.Can("accounts:manage") || p.Can("accounts:read") || row.OwnerUserID.String() == p.UserID) {
			err = apperr.Forbidden("")
		}
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	d, err := h.walletDetail(ctx, db.FinanceWallet{ID: row.ID, CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt,
		BalanceKobo: row.BalanceKobo, HoldKobo: row.HoldKobo, Status: row.Status, AccountID: row.AccountID})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, d)
}

// ownAccount is WalletViewSet._own_account.
func (h *Handler) ownAccount(ctx context.Context) (db.AccountsAccount, error) {
	uid, _ := uuid.Parse(reqctx.User(ctx).UserID)
	if d, err := h.q.DriverRowByUser(ctx, uid); err == nil {
		return h.q.AccountByID(ctx, d.AccountID)
	} else if !database.IsNoRows(err) {
		return db.AccountsAccount{}, err
	}
	a, err := h.q.FirstOwnedAccount(ctx, uid)
	if database.IsNoRows(err) {
		return a, apperr.New("ACCOUNT_REQUIRED", "Complete profile before accessing wallet.")
	}
	return a, err
}

func (h *Handler) mine(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	acct, err := h.ownAccount(ctx)
	if err == nil {
		err = h.q.EnsureWallet(ctx, db.EnsureWalletParams{ID: ids.New(), AccountID: acct.ID})
	}
	var wl db.FinanceWallet
	if err == nil {
		wl, err = h.q.WalletByAccount(ctx, acct.ID)
	}
	var d WalletDetailDTO
	if err == nil {
		d, err = h.walletDetail(ctx, wl)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, d)
}

// fundReq is FundWalletRequestSerializer.
type fundReq struct {
	AmountKobo  *int64          `json:"amount_kobo" validate:"omitempty,min=1"`
	AmountNaira *decode.Decimal `json:"amount_naira" decimal:"12,2"`
	Channel     *string         `json:"channel" validate:"omitempty,oneof=CARD BANK_TRANSFER USSD NUBAN_TRANSFER"`
}

// fund is apply_dev_wallet_credit: a sandbox top-up (DEBUG + dev VA only)
// onto an account whose NUBAN is active.
func (h *Handler) fund(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b fundReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	var amount int64
	switch {
	case b.AmountNaira != nil && b.AmountKobo == nil:
		n, _ := new(big.Rat).SetString(b.AmountNaira.Text)
		if n.Cmp(big.NewRat(1, 1)) < 0 {
			respond.Error(w, r, apperr.Field("amount_naira", "Ensure this value is greater than or equal to 1."))
			return
		}
		amount = n.Mul(n, big.NewRat(100, 1)).Num().Int64() // two decimals → whole kobo
	case b.AmountKobo != nil:
		amount = *b.AmountKobo
	default:
		respond.Error(w, r, apperr.Field("amount_kobo", "Provide amount_kobo or amount_naira."))
		return
	}
	acct, err := h.ownAccount(ctx)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	if !h.demoFund {
		respond.Error(w, r, apperr.New("FORBIDDEN", "Demo wallet funding is disabled. Transfer to your NUBAN.").WithStatus(403))
		return
	}
	va, err := h.q.VirtualAccountFull(ctx, acct.ID)
	if err != nil || va.Status != "ACTIVE" || va.Nuban == nil || *va.Nuban == "" {
		if err != nil && !database.IsNoRows(err) {
			respond.Error(w, r, err)
			return
		}
		respond.Error(w, r, apperr.Conflict("VA_PENDING",
			"Virtual account is not ready yet. Funding is blocked until NUBAN is active."))
		return
	}
	ref := "dev-ussd_mock:" + strings.ReplaceAll(ids.New().String(), "-", "")
	var pay db.FinancePayment
	err = database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		var err error
		if pay, err = Fund(ctx, q, Account{ID: acct.ID, KuraID: acct.KuraID}, amount, "NUBAN_TRANSFER", ref); err != nil {
			return err
		}
		who, err := actor.FromRequest(ctx, q)
		if err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "wallet.funded", SubjectType: "wallet",
			SubjectID: acct.ID.String(), SubjectLabel: acct.KuraID, Actor: who,
			After: events.Map{"amount_kobo": amount, "channel": "NUBAN_TRANSFER", "psp_reference": ref, "dev": true,
				"source": "ussd_mock"},
			Metadata: events.Map{"payment_id": pay.ID.String(), "receipt_code": pay.ReceiptCode}})
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	wl, err := h.q.WalletByAccount(ctx, acct.ID)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	var hubCode *string
	respond.Created(w, map[string]any{
		"payment": PaymentDTO{ID: pay.ID.String(), AccountID: acct.ID.String(), AccountKuraID: acct.KuraID,
			AccountName: acct.DisplayName, HubID: idPtr(pay.HubID), HubCode: hubCode, Channel: pay.Channel,
			AmountKobo: pay.AmountKobo, VatKobo: pay.VatKobo, ReceiptCode: pay.ReceiptCode, Status: pay.Status,
			Purpose: pay.Purpose, CreatedAt: jsontime.Field(pay.CreatedAt)},
		"wallet": walletDTO(wl),
	})
}

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
