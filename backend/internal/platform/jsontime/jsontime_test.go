package jsontime

import (
	"encoding/json"
	"testing"
	"time"
)

func TestFormatsMatchDjango(t *testing.T) {
	at := time.Date(2026, 10, 21, 22, 41, 40, 565865000, time.UTC)
	cases := []struct {
		v    any
		want string
	}{
		{Field(at), `"2026-10-21T23:41:40.565865+01:00"`},
		{Field(at.Truncate(time.Second)), `"2026-10-21T23:41:40+01:00"`},
		{Raw(at), `"2026-10-21T22:41:40.565Z"`},
		{Raw(at.Truncate(time.Second)), `"2026-10-21T22:41:40Z"`},
		{FieldPtr(nil), `null`},
	}
	for _, c := range cases {
		b, _ := json.Marshal(c.v)
		if string(b) != c.want {
			t.Errorf("got %s want %s", b, c.want)
		}
	}
}
