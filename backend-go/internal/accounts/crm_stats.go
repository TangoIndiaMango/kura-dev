package accounts

import (
	"net/http"
	"time"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
)

type weekCount struct {
	Label string `json:"label"`
	Count int32  `json:"count"`
}

// stats is account_stats: network-wide totals, KYC split and weekly sign-ups
// (inclusive Lagos days; unparseable bounds are ignored like parse_date).
func (h *AccountHandler) stats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	qp := decode.Params(r)
	from := lagosMidnight(qp.Date("start_date"))
	var to *time.Time
	if d := lagosMidnight(qp.Date("end_date")); d != nil {
		end := d.Add(24*time.Hour - time.Microsecond)
		to = &end
	}
	counts, err := h.q.AccountStatusCounts(ctx, db.AccountStatusCountsParams{CreatedFrom: from, CreatedTo: to})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	var all int32
	status, kyc := map[string]int32{}, map[string]int32{}
	for _, c := range counts {
		all += c.N
		status[c.Status] += c.N
		kyc[c.KycStatus] += c.N
	}
	// No range at all → the chart shows the last six weeks.
	chart := db.AccountWeeklyRegistrationsParams{CreatedFrom: from, CreatedTo: to}
	if qp.String("start_date") == "" && qp.String("end_date") == "" {
		six := time.Now().Add(-6 * 7 * 24 * time.Hour)
		chart = db.AccountWeeklyRegistrationsParams{CreatedFrom: &six}
	}
	weeks, err := h.q.AccountWeeklyRegistrations(ctx, chart)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	regs := make([]weekCount, 0, len(weeks))
	for _, wk := range weeks {
		if wk.Week.Valid {
			regs = append(regs, weekCount{Label: wk.Week.Time.Format("02 Jan"), Count: wk.N})
		}
	}
	respond.OK(w, map[string]any{
		"totals": map[string]int32{"all": all, "active": status["ACTIVE"], "suspended": status["SUSPENDED"],
			"pending": status["PENDING"], "deregistered": status["DEREGISTERED"]},
		"kyc": map[string]int32{"none": kyc["NONE"], "provisional": kyc["PROVISIONAL"],
			"pending": kyc["PENDING"] + kyc["PENDING_PSP"], "verified": kyc["VERIFIED"], "rejected": kyc["REJECTED"]},
		"registrations": regs,
	})
}
