// Package spend ports accounts.selectors.spend: what an account paid KURA,
// per day / vehicle / driver / payment mode, over clamped Lagos-day windows.
package spend

import (
	"regexp"
	"strconv"
	"time"
)

// Lagos is the hub-local zone every day boundary uses (DISPLAY_TIME_ZONE).
var Lagos = func() *time.Location {
	loc, err := time.LoadLocation("Africa/Lagos")
	if err != nil {
		panic(err)
	}
	return loc
}()

// Date is a calendar day (time at UTC midnight, so arithmetic is exact).
type Date struct{ t time.Time }

func DateOf(t time.Time) Date {
	return Date{time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)}
}

func (d Date) AddDays(n int) Date     { return Date{d.t.AddDate(0, 0, n)} }
func (d Date) After(o Date) bool      { return d.t.After(o.t) }
func (d Date) DaysUntil(o Date) int   { return int(o.t.Sub(d.t).Hours() / 24) }
func (d Date) ISO() string            { return d.t.Format(time.DateOnly) }
func (d Date) Label() string          { return d.t.Format("02 Jan") } // strftime("%d %b")
func (d Date) Equal(o time.Time) bool { return d.t.Equal(DateOf(o).t) }

// Start is the day's first instant in Lagos.
func (d Date) Start() time.Time {
	return time.Date(d.t.Year(), d.t.Month(), d.t.Day(), 0, 0, 0, 0, Lagos)
}

var looseDate = regexp.MustCompile(`^(\d{4})-(\d{1,2})-(\d{1,2})$`)

// ParseDate is django.utils.dateparse.parse_date; ok=false when malformed.
// (Django raises on well-formed impossible dates like 2026-02-30; here
// they are treated as malformed instead of a 500.)
func ParseDate(raw string) (Date, bool) {
	m := looseDate.FindStringSubmatch(raw)
	if m == nil {
		return Date{}, false
	}
	y, _ := strconv.Atoi(m[1])
	mo, _ := strconv.Atoi(m[2])
	d, _ := strconv.Atoi(m[3])
	t := time.Date(y, time.Month(mo), d, 0, 0, 0, 0, time.UTC)
	if t.Year() != y || int(t.Month()) != mo || t.Day() != d {
		return Date{}, false
	}
	return Date{t}, true
}

// Window clamps a requested range like _day_window / _local_window: default
// is the 14 days ending today, a backwards range resets to that, and anything
// longer than 90 days keeps the last 90.
func Window(startRaw, endRaw string, today Date) (start, end Date) {
	end = today
	if endRaw != "" {
		if d, ok := ParseDate(endRaw); ok {
			end = d
		}
	}
	start = end.AddDays(-13)
	if startRaw != "" {
		if d, ok := ParseDate(startRaw); ok && !d.After(end) {
			start = d
		}
	}
	if start.DaysUntil(end) > 90 {
		start = end.AddDays(-89)
	}
	return start, end
}

// LagosToday is timezone.localdate().
func LagosToday(now time.Time) Date { return DateOf(now.In(Lagos)) }

// Days lists every day from start to end inclusive.
func Days(start, end Date) []Date {
	var out []Date
	for d := start; !d.After(end); d = d.AddDays(1) {
		out = append(out, d)
	}
	return out
}
