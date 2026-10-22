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
