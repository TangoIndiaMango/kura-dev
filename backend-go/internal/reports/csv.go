package reports

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/finance"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

const rowCap = 25_000 // EXPORT_ROW_CAP

var lagos, _ = time.LoadLocation("Africa/Lagos")

// csvBytes is csv.writer (excel dialect: minimal quoting, CRLF), capped.
func csvBytes(headers []string, rows [][]string) []byte {
	var b strings.Builder
	write := func(row []string) {
		for i, c := range row {
			if i > 0 {
				b.WriteByte(',')
			}
			if strings.ContainsAny(c, ",\"\r\n") {
				c = `"` + strings.ReplaceAll(c, `"`, `""`) + `"`
			}
			b.WriteString(c)
		}
		b.WriteString("\r\n")
	}
	write(headers)
	for i, r := range rows {
		if i >= rowCap {
			break
		}
		write(r)
	}
	return []byte(b.String())
}

// pyStr is str(value or "") for a JSON param (truthiness like Python).
func pyStr(v any) string {
	switch x := v.(type) {
	case nil:
		return ""
	case string:
		return x
	case bool:
		if x {
			return "True"
		}
		return ""
	case float64:
		if x == 0 {
			return ""
		}
		if x == math.Trunc(x) && math.Abs(x) < 1e16 {
			return strconv.FormatInt(int64(x), 10)
		}
		return strconv.FormatFloat(x, 'g', -1, 64)
	}
	raw, _ := json.Marshal(v)
	return string(raw)
}

var dateRe = regexp.MustCompile(`^(\d{4})-(\d{1,2})-(\d{1,2})$`)

func lagosDay(t time.Time) time.Time {
	t = t.In(lagos)
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}

// parseDay is _parse_day: falsy → fallback, else parse_date(str[:10]) or
// fallback (an impossible date fails the job like Django's ValueError).
func parseDay(raw any, fallback time.Time) (time.Time, error) {
	s := pyStr(raw)
	if s == "" {
		return fallback, nil
	}
	if len(s) > 10 {
		s = s[:10]
	}
	m := dateRe.FindStringSubmatch(s)
	if m == nil {
		return fallback, nil
	}
	y, _ := strconv.Atoi(m[1])
	mo, _ := strconv.Atoi(m[2])
	d, _ := strconv.Atoi(m[3])
	t := time.Date(y, time.Month(mo), d, 0, 0, 0, 0, time.UTC)
	if t.Year() != y || int(t.Month()) != mo || t.Day() != d {
		return t, fmt.Errorf("day is out of range for month")
	}
	return t, nil
}

// monthWindow is _month_window: a YYYY-MM label (else the current UTC
// month) → Lagos first-day midnight .. last-day 23:59:59.
func monthWindow(period any) (time.Time, time.Time, string) {
	now := time.Now().UTC()
	label := strings.TrimSpace(pyStr(period))
	if label == "" {
		label = now.Format("2006-01")
	}
	y, m, ok := 0, 0, false
	if parts := strings.SplitN(label, "-", 2); len(parts) == 2 {
		var e1, e2 error
		y, e1 = strconv.Atoi(strings.TrimSpace(parts[0]))
		m, e2 = strconv.Atoi(strings.TrimSpace(parts[1]))
		ok = e1 == nil && e2 == nil && m >= 1 && m <= 12
	}
	if !ok {
		y, m = now.Year(), int(now.Month())
		label = fmt.Sprintf("%04d-%02d", y, m)
	}
	start := time.Date(y, time.Month(m), 1, 0, 0, 0, 0, lagos)
	last := start.AddDate(0, 1, -1)
	return start, time.Date(y, time.Month(m), last.Day(), 23, 59, 59, 0, lagos), label
}

func day(t time.Time) string { return t.Format(time.DateOnly) }

func hubParam(p map[string]any) (*uuid.UUID, error) {
	v := pyStr(p["hub_id"])
	if v == "" {
		v = pyStr(p["hub"])
	}
	v = strings.TrimSpace(v)
	if v == "" {
		return nil, nil
	}
	id, err := uuid.Parse(v)
	if err != nil {
		return nil, fmt.Errorf("['\u201c%s\u201d is not a valid UUID.']", v)
	}
	return &id, nil
}

func opsCSV(ctx context.Context, q *db.Queries, p map[string]any) ([]byte, string, error) {
	today := lagosDay(time.Now())
	src := p["date_to"]
	if pyStr(src) == "" {
		src = p["period"]
	}
	to, err := parseDay(src, today)
	if err != nil {
		return nil, "", err
	}
	var from time.Time
	period, isStr := p["period"].(string)
	switch {
	case pyStr(p["date_from"]) != "":
		if from, err = parseDay(p["date_from"], to.AddDate(0, 0, -30)); err != nil {
			return nil, "", err
		}
	case isStr && len([]rune(period)) == 7:
		start, end, _ := monthWindow(period)
		from = time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, time.UTC)
		to = time.Date(end.Year(), end.Month(), end.Day(), 0, 0, 0, 0, time.UTC)
	default:
		from = to.AddDate(0, 0, -30)
	}
	hub, err := hubParam(p)
	if err != nil {
		return nil, "", err
	}
	rows, err := q.OpsCsvRows(ctx, db.OpsCsvRowsParams{FromDay: dateArg(from), ToDay: dateArg(to), Hub: hub})
	if err != nil {
		return nil, "", err
	}
	out := make([][]string, 0, len(rows))
	for _, m := range rows {
		ch := map[string]any{}
		_ = json.Unmarshal(m.RevenueKoboByChannel, &ch)
		num := func(keys ...string) int64 { // int(ch.get(A) or ch.get(b) or 0)
			for _, k := range keys {
				if n := toInt(ch[k]); n != 0 || pyStr(ch[k]) != "" {
					return n
				}
			}
			return 0
		}
		wallet, cash, total := num("WALLET", "wallet"), num("CASH", "cash"), int64(0)
		for _, v := range ch {
			total += toInt(v)
		}
		out = append(out, []string{day(m.Date.Time), m.HubID.String(), m.Code, m.Name, itoa(m.Swaps),
			i64(wallet), i64(cash), i64(max(0, total-wallet-cash)), i64(total), m.ReadyAvg, itoa(m.NoShows),
			itoa(m.Overrides)})
	}
	headers := []string{"date", "hub_id", "hub_code", "hub_name", "swaps", "revenue_wallet_kobo", "revenue_cash_kobo",
		"revenue_other_kobo", "revenue_total_kobo", "batteries_ready_avg", "no_shows", "overrides"}
	return csvBytes(headers, out), "kura-ops-" + day(from) + "_" + day(to) + ".csv", nil
}

func dateArg(t time.Time) pgtype.Date { return pgtype.Date{Time: t, Valid: true} }

// toInt is int(v or 0) for a JSON number or numeric string.
func toInt(v any) int64 {
	switch x := v.(type) {
	case float64:
		return int64(x)
	case string:
		n, _ := strconv.ParseInt(strings.TrimSpace(x), 10, 64)
		return n
	case bool:
		if x {
			return 1
		}
	}
	return 0
}

func itoa(n int32) string { return strconv.Itoa(int(n)) }
func i64(n int64) string  { return strconv.FormatInt(n, 10) }

func fleetCSV(ctx context.Context, q *db.Queries, p map[string]any) ([]byte, string, error) {
	var status *string
	if s := strings.ToUpper(strings.TrimSpace(pyStr(p["status"]))); s != "" {
		status = &s
	}
	hub, err := hubParam(p)
	if err != nil {
		return nil, "", err
	}
	rows, err := q.FleetCsvRows(ctx, db.FleetCsvRowsParams{Status: status, Hub: hub})
	if err != nil {
		return nil, "", err
	}
	out := make([][]string, 0, len(rows))
	for _, b := range rows {
		band := "DEGRADED"
		if b.HealthPct >= 90 {
			band = "GOOD"
		} else if b.HealthPct >= 70 {
			band = "WATCH"
		}
		code, name := "", ""
		if b.HubCode != nil {
			code, name = *b.HubCode, *b.HubName
		}
		out = append(out, []string{b.ID.String(), b.Serial, b.TypeName, b.Status, itoa(b.ChargePct),
			itoa(b.HealthPct), itoa(b.CycleCount), band, code, name, jsontime.FormatISO(b.CreatedAt)})
	}
	headers := []string{"battery_id", "serial", "battery_type", "status", "charge_pct", "health_pct", "cycle_count",
		"health_band", "hub_code", "hub_name", "created_at"}
	return csvBytes(headers, out), "kura-fleet-" + day(lagosDay(time.Now())) + ".csv", nil
}

// revenueCSV is render_revenue_csv: fee revenue lines, Latila 60 / Emicraft 40.
func revenueCSV(ctx context.Context, q *db.Queries, p map[string]any) ([]byte, string, error) {
	start, end, label := monthWindow(p["period"])
	rows, err := q.RevenueCsvRows(ctx, db.RevenueCsvRowsParams{FromAt: start, ToAt: end})
	if err != nil {
		return nil, "", err
	}
	out := [][]string{}
	for _, t := range rows {
		net, vat := t.Net, t.Vat
		if net == 0 && vat == 0 {
			continue
		}
		gross := net + vat
		if vat == 0 && gross > 0 {
			net, vat = finance.SplitVAT(gross)
		}
		latila := int64(math.RoundToEven(float64(net) * 6000 / 10000))
		out = append(out, []string{label, jsontime.FormatISO(t.PostedAt), t.Kind, t.Reference, i64(gross), i64(net),
			i64(vat), i64(latila), i64(net - latila)})
	}
	headers := []string{"period", "posted_at", "kind", "reference", "gross_kobo", "net_kobo", "vat_kobo",
		"latila_share_kobo", "emicraft_share_kobo"}
	return csvBytes(headers, out), "kura-revenue-" + label + ".csv", nil
}
