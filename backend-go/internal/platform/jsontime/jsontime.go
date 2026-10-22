// Package jsontime renders datetimes exactly like the Django backend did, so
// the apps see identical strings:
//
//   - Field: DRF serializer DateTimeField — converted to Africa/Lagos,
//     isoformat() with microseconds (dropped when zero), e.g.
//     "2026-10-21T23:41:40.565865+01:00".
//   - Raw: a datetime returned directly from a view (DjangoJSONEncoder) —
//     UTC, milliseconds, "Z", e.g. "2026-10-22T01:22:27.038Z".
package jsontime

import (
	"time"
)

var lagos *time.Location

func init() {
	var err error
	if lagos, err = time.LoadLocation("Africa/Lagos"); err != nil {
		panic(err)
	}
}

// Field is a DRF serializer datetime.
type Field time.Time

// Raw is a datetime serialised by DjangoJSONEncoder.
type Raw time.Time

// FieldPtr / RawPtr convert optional times (nil → JSON null).
func FieldPtr(t *time.Time) *Field {
	if t == nil {
		return nil
	}
	f := Field(*t)
	return &f
}

func RawPtr(t *time.Time) *Raw {
	if t == nil {
		return nil
	}
	r := Raw(*t)
	return &r
}

func (f Field) MarshalJSON() ([]byte, error) {
	return []byte(`"` + FormatField(time.Time(f)) + `"`), nil
}

func (r Raw) MarshalJSON() ([]byte, error) {
	return []byte(`"` + FormatRaw(time.Time(r)) + `"`), nil
}

// FormatField is Python's isoformat() on the Lagos-local time.
func FormatField(t time.Time) string {
	t = t.In(lagos)
	if t.Nanosecond()/1000 == 0 {
		return t.Format("2006-01-02T15:04:05-07:00")
	}
	return t.Format("2006-01-02T15:04:05.000000-07:00")
}

// FormatRaw is DjangoJSONEncoder: UTC, microseconds cut to milliseconds, Z.
func FormatRaw(t time.Time) string {
	t = t.UTC()
	if t.Nanosecond()/1000 == 0 {
		return t.Format("2006-01-02T15:04:05Z")
	}
	return t.Format("2006-01-02T15:04:05.000Z")
}

// FormatISO is Python's isoformat() on an aware UTC datetime (used where
// Django calls .isoformat() itself), e.g. "2026-10-21T22:41:40.565865+00:00".
func FormatISO(t time.Time) string {
	t = t.UTC()
	if t.Nanosecond()/1000 == 0 {
		return t.Format("2006-01-02T15:04:05") + "+00:00"
	}
	return t.Format("2006-01-02T15:04:05.000000") + "+00:00"
}

// DRF is a datetime put straight into a DRF Response (rest_framework's
// JSONEncoder): UTC isoformat with microseconds, "+00:00" → "Z".
type DRF time.Time

func DRFPtr(t *time.Time) *DRF {
	if t == nil {
		return nil
	}
	d := DRF(*t)
	return &d
}

func (d DRF) MarshalJSON() ([]byte, error) {
	s := FormatISO(time.Time(d))
	return []byte(`"` + s[:len(s)-6] + `Z"`), nil
}
