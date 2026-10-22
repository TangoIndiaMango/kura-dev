package decode

import (
	"reflect"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// Date is a DRF DateField value ("YYYY-MM-DD"); use *Date when null is allowed.
type Date struct{ Time time.Time }

var (
	dateType = reflect.TypeOf(Date{})
	dateRE   = regexp.MustCompile(`^(\d{4})-(\d{1,2})-(\d{1,2})$`)
)

// String is the ISO form.
func (d Date) String() string { return d.Time.Format("2006-01-02") }

// setDate is DateField.to_internal_value with ISO_8601 input.
func setDate(f reflect.Value, val any) string {
	bad := "Date has wrong format. Use one of these formats instead: YYYY-MM-DD."
	s, ok := val.(string)
	if !ok {
		return bad
	}
	m := dateRE.FindStringSubmatch(strings.TrimSpace(s))
	if m == nil {
		return bad
	}
	y, _ := strconv.Atoi(m[1])
	mo, _ := strconv.Atoi(m[2])
	d, _ := strconv.Atoi(m[3])
	t := time.Date(y, time.Month(mo), d, 0, 0, 0, 0, time.UTC)
	if t.Month() != time.Month(mo) || t.Day() != d {
		return bad
	}
	f.Set(reflect.ValueOf(Date{Time: t}))
	return ""
}

// DateTime is a DRF DateTimeField value (ISO 8601; naive values are Lagos
// time, the server's TIME_ZONE). Use *DateTime when null is allowed.
type DateTime struct{ Time time.Time }

var (
	dateTimeType = reflect.TypeOf(DateTime{})
	lagosZone    = func() *time.Location {
		l, err := time.LoadLocation("Africa/Lagos")
		if err != nil {
			panic(err)
		}
		return l
	}()
)

func setDateTime(f reflect.Value, val any) string {
	bad := "Datetime has wrong format. Use one of these formats instead: " +
		"YYYY-MM-DDThh:mm[:ss[.uuuuuu]][+HH:MM|-HH:MM|Z]."
	s, ok := val.(string)
	if !ok {
		return bad
	}
	s = strings.TrimSpace(s)
	for _, l := range []string{time.RFC3339Nano, "2006-01-02T15:04:05.999999999", "2006-01-02T15:04",
		"2006-01-02 15:04:05.999999999Z07:00", "2006-01-02 15:04:05.999999999", "2006-01-02 15:04",
		"2006-01-02T15:04Z07:00", time.DateOnly} {
		if t, err := time.ParseInLocation(l, s, lagosZone); err == nil {
			f.Set(reflect.ValueOf(DateTime{Time: t}))
			return ""
		}
	}
	return bad
}
