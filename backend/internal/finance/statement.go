package finance

import (
	"fmt"
	"net/http"
	"sort"
	"strings"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/export"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
)

// statementHeaders is STATEMENT_HEADERS.
var statementHeaders = []string{"Time (WAT)", "Receipt", "Hub", "Account (KURA ID)", "Account name", "Paid by",
	"Purpose", "Amount (NGN)", "VAT (NGN)", "Net (NGN)", "Vehicle", "Agent", "Status"}

func naira(kobo int64) string { return fmt.Sprintf("%.2f", float64(kobo)/100) }

// export is the payments statement (statement_rows): one row per payment
// then totals by channel and account.
func (h *Handler) export(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	f, err := h.paymentFilter(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	rows, err := h.q.StatementRows(ctx, db.StatementRowsParams{AllRows: f.all, Own: f.own, Account: f.account,
		Status: f.status, Channel: f.channel, Purpose: f.purpose, Hub: f.hub, Q: f.q, FromAt: f.from, ToAt: f.to,
		Lim: export.RowCap + 1})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	payIDs := make([]uuid.UUID, len(rows))
	for i, p := range rows {
		payIDs[i] = p.ID
	}
	swaps, err := h.q.SwapsForPayments(ctx, payIDs)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	firstSwap := map[uuid.UUID]db.SwapsForPaymentsRow{} // next(iter(p.swaps.all()))
	for _, s := range swaps {
		if _, seen := firstSwap[*s.PaymentID]; !seen {
			firstSwap[*s.PaymentID] = s
		}
	}
	type agg struct{ n, kobo int64 }
	byChannel, byAccount := map[string]*agg{}, map[[2]string]*agg{}
	var total agg
	qv := r.URL.Query()
	stem := "kura-payments"
	for _, bit := range []string{qv.Get("start_date"), qv.Get("end_date")} {
		if bit != "" {
			stem += "-" + bit
		}
	}
	t := export.Table{Stem: stem, Title: "Kura payments statement", Headers: statementHeaders}
	for _, p := range rows {
		agent, plate := "", ""
		if s, ok := firstSwap[p.ID]; ok {
			plate = s.Plate
			if s.AgentFirst != nil {
				agent = strings.TrimSpace(deref(s.AgentFirst) + " " + deref(s.AgentLast))
			}
		}
		t.Rows = append(t.Rows, []string{p.CreatedAt.In(lagos).Format("2006-01-02 15:04"), p.ReceiptCode,
			deref(p.HubCode), p.AccountKuraID, p.AccountName, label(channelLabels, p.Channel), p.Purpose,
			naira(p.AmountKobo), naira(p.VatKobo), naira(p.AmountKobo - p.VatKobo), plate, agent, p.Status})
		if p.Status != "SUCCESS" {
			continue
		}
		ch := label(channelLabels, p.Channel)
		if byChannel[ch] == nil {
			byChannel[ch] = &agg{}
		}
		byChannel[ch].n, byChannel[ch].kobo = byChannel[ch].n+1, byChannel[ch].kobo+p.AmountKobo
		key := [2]string{p.AccountKuraID, p.AccountName}
		if byAccount[key] == nil {
			byAccount[key] = &agg{}
		}
		byAccount[key].n, byAccount[key].kobo = byAccount[key].n+1, byAccount[key].kobo+p.AmountKobo
		total.n, total.kobo = total.n+1, total.kobo+p.AmountKobo
	}
	blank := make([]string, len(statementHeaders))
	pad := func(row ...string) []string { return append(row, make([]string, len(statementHeaders)-len(row))...) }
	t.Rows = append(t.Rows, blank, pad("TOTALS (successful)", "", "", "", "", "Payments", "", naira(total.kobo)),
		pad("", "", "", "", "", fmt.Sprint(total.n), "", ""), blank,
		pad("BY CHANNEL", "", "", "", "", "Paid by", "Count", "Amount (NGN)"))
	chans := make([]string, 0, len(byChannel))
	for k := range byChannel {
		chans = append(chans, k)
	}
	sort.Strings(chans)
	for _, k := range chans {
		t.Rows = append(t.Rows, pad("", "", "", "", "", k, fmt.Sprint(byChannel[k].n), naira(byChannel[k].kobo)))
	}
	t.Rows = append(t.Rows, blank, pad("BY ACCOUNT", "", "", "KURA ID", "Account name", "", "Count", "Amount (NGN)"))
	accts := make([][2]string, 0, len(byAccount))
	for k := range byAccount {
		accts = append(accts, k)
	}
	// Python: sorted(items, key=-amount) — stable on dict insertion order.
	order := map[[2]string]int{}
	i := 0
	for _, p := range rows {
		k := [2]string{p.AccountKuraID, p.AccountName}
		if _, seen := order[k]; !seen && byAccount[k] != nil {
			order[k] = i
			i++
		}
	}
	sort.SliceStable(accts, func(a, b int) bool {
		if byAccount[accts[a]].kobo != byAccount[accts[b]].kobo {
			return byAccount[accts[a]].kobo > byAccount[accts[b]].kobo
		}
		return order[accts[a]] < order[accts[b]]
	})
	for _, k := range accts {
		t.Rows = append(t.Rows, pad("", "", "", k[0], k[1], "", fmt.Sprint(byAccount[k].n), naira(byAccount[k].kobo)))
	}
	if err := export.Write(w, qv.Get("export"), t); err != nil {
		respond.Error(w, r, err)
	}
}
