package reports

import (
	"context"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/rollup"
)

const (
	// maxRangeDays bounds a summary window (three years).
	maxRangeDays = 1096
	// readTimeout is the most any one summary read may take.
	readTimeout = 8 * time.Second
	// distinctTimeout bounds the only live-table scan (distinct riders and
	// vehicles); past it those two figures come back null, not an error.
	distinctTimeout = 3 * time.Second
)

var isoDay = regexp.MustCompile(`^(\d{4})-(\d{2})-(\d{2})$`)

// window is the picked Lagos days and the equal-length window just before.
type window struct {
	from, to, prevFrom, prevTo time.Time
}

func (w window) days() int { return int(w.to.Sub(w.from).Hours()/24+0.5) + 1 }

// filter is what narrows a summary: dates, a hub, a chairman's cooperative.
type filter struct {
	window
	hub, coop *uuid.UUID
}

func dayParam(r *http.Request, name string) (*time.Time, error) {
	v := r.URL.Query().Get(name)
	if v == "" {
		return nil, nil
	}
	m := isoDay.FindStringSubmatch(v)
	bad := apperr.Field(name, name+" must be YYYY-MM-DD.")
	if m == nil {
		return nil, bad
	}
	y, _ := strconv.Atoi(m[1])
	mo, _ := strconv.Atoi(m[2])
	d, _ := strconv.Atoi(m[3])
	t := rollup.Day(time.Date(y, time.Month(mo), d, 12, 0, 0, 0, time.UTC))
	if t.Year() != y || int(t.Month()) != mo || t.Day() != d {
		return nil, bad
	}
	return &t, nil
}

// parseFilter reads start_date / end_date (default: the last 30 days),
// hub and cooperative. A chairman without revenue access only ever sees
// their own cooperative.
func (s *service) parseFilter(r *http.Request) (filter, error) {
	start, err := dayParam(r, "start_date")
	if err != nil {
		return filter{}, err
	}
	end, err := dayParam(r, "end_date")
	if err != nil {
		return filter{}, err
	}
	today := rollup.Day(time.Now())
	w := window{from: today.AddDate(0, 0, -29), to: today}
	if start != nil {
		w.from = *start
	}
	if end != nil {
		w.to = *end
	}
	if w.from.After(w.to) {
		w.from, w.to = w.to, w.from
	}
	if w.days() > maxRangeDays {
		return filter{}, apperr.Field("start_date", "Pick at most three years.")
	}
	w.prevTo = w.from.AddDate(0, 0, -1)
	w.prevFrom = w.prevTo.AddDate(0, 0, -(w.days() - 1))

	qp := decode.Params(r)
	f := filter{window: w, hub: qp.UUID("hub"), coop: qp.UUID("cooperative")}
	if err := qp.Err(); err != nil {
		return filter{}, err
	}
	p := reqctx.User(r.Context())
	if !p.Can("analytics:revenue") {
		uid, _ := uuid.Parse(p.UserID)
		c, err := s.q.CooperativeForChairman(r.Context(), &uid)
		if database.IsNoRows(err) {
			return filter{}, apperr.Forbidden("No cooperative linked to this user.")
		}
		if err != nil {
			return filter{}, err
		}
		f.coop = &c.ID
	}
	return f, nil
}

func pgDay(t time.Time) pgtype.Date {
	return pgtype.Date{Time: time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC), Valid: true}
}

// totals is one window's headline figures. Revenue is money spent on
// services; received is money that came in from outside (wallet debits
// left out); top-ups are wallet funding, spent later as revenue.
type totals struct {
	RevenueKobo         int64  `json:"revenue_kobo"`
	VatKobo             int64  `json:"vat_kobo"`
	NetKobo             int64  `json:"net_kobo"`
	Payments            int64  `json:"payments"`
	ReceivedKobo        int64  `json:"received_kobo"`
	TopupKobo           int64  `json:"topup_kobo"`
	PendingKobo         int64  `json:"pending_kobo"`
	PendingPayments     int64  `json:"pending_payments"`
	FailedPayments      int64  `json:"failed_payments"`
	RefundedKobo        int64  `json:"refunded_kobo"`
	Swaps               int64  `json:"swaps"`
	SwapKobo            int64  `json:"swap_kobo"`
	Riders              *int64 `json:"riders"`
	Vehicles            *int64 `json:"vehicles"`
	NewRiders           int64  `json:"new_riders"`
	ExpiredReservations int64  `json:"expired_reservations"`
	Overrides           int64  `json:"overrides"`
}

type split struct {
	Key          string `json:"key"`
	Payments     int64  `json:"payments"`
	AmountKobo   int64  `json:"amount_kobo"`
	VatKobo      int64  `json:"vat_kobo"`
	PreviousKobo int64  `json:"previous_amount_kobo"`
}

// readTotals fills one window. Money rows also feed the purpose / channel
// splits, so they are returned for the current window.
func readTotals(ctx context.Context, q *db.Queries, from, to time.Time, f filter, distinct func(db.SummaryDistinctParams) (*db.SummaryDistinctRow, error)) (totals, []db.SummaryMoneyRow, error) {
	var t totals
	money, err := q.SummaryMoney(ctx, db.SummaryMoneyParams{FromDay: pgDay(from), ToDay: pgDay(to), Hub: f.hub, Cooperative: f.coop})
	if err != nil {
		return t, nil, err
	}
	for _, m := range money {
		switch m.Status {
		case "SUCCESS":
			if m.Channel != walletDebit {
				t.ReceivedKobo += m.AmountKobo
			}
			if topUp[m.Purpose] {
				t.TopupKobo += m.AmountKobo
				continue
			}
			t.RevenueKobo += m.AmountKobo
			t.VatKobo += m.VatKobo
			t.Payments += m.Payments
		case "PENDING":
			t.PendingKobo += m.AmountKobo
			t.PendingPayments += m.Payments
		case "FAILED":
			t.FailedPayments += m.Payments
		case "REFUNDED", "REVERSED":
			t.RefundedKobo += m.AmountKobo
		}
	}
	t.NetKobo = t.RevenueKobo - t.VatKobo
	ops, err := q.SummaryOps(ctx, db.SummaryOpsParams{FromDay: pgDay(from), ToDay: pgDay(to), Hub: f.hub, Cooperative: f.coop})
	if err != nil {
		return t, nil, err
	}
	t.Swaps, t.SwapKobo, t.ExpiredReservations, t.Overrides = ops.Swaps, ops.SwapKobo, ops.ExpiredReservations, ops.Overrides
	if t.NewRiders, err = q.SummaryNewRiders(ctx, db.SummaryNewRidersParams{FromDay: pgDay(from), ToDay: pgDay(to),
		Cooperative: f.coop}); err != nil {
		return t, nil, err
	}
	d, err := distinct(db.SummaryDistinctParams{FromDay: pgDay(from), ToDay: pgDay(to), Hub: f.hub, Cooperative: f.coop})
	if err != nil {
		return t, nil, err
	}
	if d != nil {
		t.Riders, t.Vehicles = &d.Riders, &d.Vehicles
	}
	return t, money, nil
}

// topUp purposes fund a wallet; the money is counted as revenue when the
// wallet is spent (a WALLET_DEBIT payment), never twice.
var topUp = map[string]bool{"FUND": true, "WALLET_TOPUP": true}

const walletDebit = "WALLET_DEBIT"

// splitBy groups successful revenue rows by purpose or channel, current
// window first, previous window alongside.
func splitBy(cur, prev []db.SummaryMoneyRow, key func(db.SummaryMoneyRow) string) []split {
	idx := map[string]*split{}
	var order []string
	get := func(k string) *split {
		if s, ok := idx[k]; ok {
			return s
		}
		idx[k] = &split{Key: k}
		order = append(order, k)
		return idx[k]
	}
	for _, m := range cur {
		if m.Status == "SUCCESS" && !topUp[m.Purpose] {
			s := get(key(m))
			s.Payments += m.Payments
			s.AmountKobo += m.AmountKobo
			s.VatKobo += m.VatKobo
		}
	}
	for _, m := range prev {
		if m.Status == "SUCCESS" && !topUp[m.Purpose] {
			s := get(key(m))
			s.PreviousKobo += m.AmountKobo
		}
	}
	out := make([]split, 0, len(order))
	for _, k := range order {
		out = append(out, *idx[k])
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].AmountKobo > out[j].AmountKobo })
	return out
}

func rangeOut(from, to time.Time) map[string]string {
	return map[string]string{"start_date": from.Format(time.DateOnly), "end_date": to.Format(time.DateOnly)}
}

// summary is GET /reports/summary/: headline figures for the window and
// the one before it, a day-by-day series, money by purpose and channel,
// and credit as it stands now.
func (s *service) summary(w http.ResponseWriter, r *http.Request) {
	f, err := s.parseFilter(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := map[string]any{"range": rangeOut(f.from, f.to), "previous_range": rangeOut(f.prevFrom, f.prevTo),
		"filters": map[string]any{"hub": idOrNil(f.hub), "cooperative": idOrNil(f.coop)}}
	ctx := r.Context()
	distinct := func(p db.SummaryDistinctParams) (*db.SummaryDistinctRow, error) {
		var row *db.SummaryDistinctRow
		err := database.ReadOnly(ctx, s.pool, distinctTimeout, func(tx pgx.Tx) error {
			d, err := db.New(tx).SummaryDistinct(ctx, p)
			row = &d
			return err
		})
		if database.IsTimeout(err) {
			return nil, nil
		}
		return row, err
	}
	err = database.ReadOnly(ctx, s.pool, readTimeout, func(tx pgx.Tx) error {
		q := db.New(tx)
		cur, money, err := readTotals(ctx, q, f.from, f.to, f, distinct)
		if err != nil {
			return err
		}
		prev, prevMoney, err := readTotals(ctx, q, f.prevFrom, f.prevTo, f, distinct)
		if err != nil {
			return err
		}
		daily, err := q.SummaryDaily(ctx, db.SummaryDailyParams{FromDay: pgDay(f.from), ToDay: pgDay(f.to), Hub: f.hub,
			Cooperative: f.coop})
		if err != nil {
			return err
		}
		credit, err := q.SummaryCredit(ctx, f.coop)
		if err != nil {
			return err
		}
		series := make([]map[string]any, len(daily))
		for i, d := range daily {
			series[i] = map[string]any{"day": d.Day.Time.Format(time.DateOnly), "revenue_kobo": d.RevenueKobo,
				"swaps": d.Swaps}
		}
		out["totals"], out["previous"], out["daily"] = cur, prev, series
		out["purposes"] = splitBy(money, prevMoney, func(m db.SummaryMoneyRow) string { return m.Purpose })
		out["channels"] = splitBy(money, prevMoney, func(m db.SummaryMoneyRow) string { return m.Channel })
		out["credit"] = map[string]any{"loans": credit.Loans, "outstanding_kobo": credit.OutstandingKobo,
			"past_due_loans": credit.PastDueLoans, "late_1_7_kobo": credit.Late17Kobo,
			"late_8_30_kobo": credit.Late830Kobo, "late_31_90_kobo": credit.Late3190Kobo,
			"late_90_plus_kobo": credit.Late90PlusKobo}
		if at, err := q.RollupAsOf(ctx); err == nil {
			out["as_of"] = jsontime.FormatISO(at)
		} else if !database.IsNoRows(err) {
			return err
		} else {
			out["as_of"] = nil
		}
		return nil
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, out)
}

func idOrNil(id *uuid.UUID) any {
	if id == nil {
		return nil
	}
	return id.String()
}

// summaryHubs is GET /reports/summary/hubs/: hubs with activity in the
// window, highest money first, paged.
func (s *service) summaryHubs(w http.ResponseWriter, r *http.Request) {
	f, err := s.parseFilter(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	page, size := paginate.Page(r), paginate.Size(r)
	type hubRow struct {
		ID                  string `json:"hub_id"`
		Code                string `json:"code"`
		Name                string `json:"name"`
		Swaps               int64  `json:"swaps"`
		RevenueKobo         int64  `json:"revenue_kobo"`
		ExpiredReservations int64  `json:"expired_reservations"`
		Overrides           int64  `json:"overrides"`
	}
	var rows []hubRow
	total := 0
	err = database.ReadOnly(r.Context(), s.pool, readTimeout, func(tx pgx.Tx) error {
		res, err := db.New(tx).SummaryHubs(r.Context(), db.SummaryHubsParams{FromDay: pgDay(f.from), ToDay: pgDay(f.to),
			Hub: f.hub, Cooperative: f.coop, Lim: int32(size), Off: int32(paginate.Offset(page, size))})
		for _, h := range res {
			total = int(h.Total)
			rows = append(rows, hubRow{h.ID.String(), h.Code, h.Name, h.Swaps, h.RevenueKobo, h.ExpiredReservations,
				h.Overrides})
		}
		return err
	})
	respondPage(w, r, rows, total, page, size, err)
}

// summaryCooperatives is GET /reports/summary/cooperatives/: one row per
// chairman group (vehicles they own, swaps and money on those vehicles),
// then the vehicles with no chairman.
func (s *service) summaryCooperatives(w http.ResponseWriter, r *http.Request) {
	f, err := s.parseFilter(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	page, size := paginate.Page(r), paginate.Size(r)
	type coopRow struct {
		ID          *string `json:"cooperative_id"`
		Name        string  `json:"name"`
		Chairman    string  `json:"chairman"`
		Vehicles    int64   `json:"vehicles"`
		PacksOut    int64   `json:"packs_out"`
		Swaps       int64   `json:"swaps"`
		RevenueKobo int64   `json:"revenue_kobo"`
	}
	var rows []coopRow
	total := 0
	err = database.ReadOnly(r.Context(), s.pool, readTimeout, func(tx pgx.Tx) error {
		res, err := db.New(tx).SummaryCooperatives(r.Context(), db.SummaryCooperativesParams{FromDay: pgDay(f.from),
			ToDay: pgDay(f.to), Hub: f.hub, Cooperative: f.coop, Lim: int32(size), Off: int32(paginate.Offset(page, size))})
		for _, c := range res {
			total = int(c.Total)
			row := coopRow{Name: "No chairman", Vehicles: c.Vehicles, PacksOut: c.PacksOut, Swaps: c.Swaps,
				RevenueKobo: c.RevenueKobo}
			if c.CooperativeID != nil {
				id := c.CooperativeID.String()
				row.ID, row.Name = &id, deref(c.Name)
				row.Chairman = strings.TrimSpace(deref(c.ChairmanFirst) + " " + deref(c.ChairmanLast))
			}
			rows = append(rows, row)
		}
		return err
	})
	respondPage(w, r, rows, total, page, size, err)
}

// respondPage answers with the admin-table page body.
func respondPage[T any](w http.ResponseWriter, r *http.Request, rows []T, total, page, size int, err error) {
	var body paginate.NumberPage[T]
	if err == nil {
		body, err = paginate.BuildNumberPage(r, rows, total, page, size)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
