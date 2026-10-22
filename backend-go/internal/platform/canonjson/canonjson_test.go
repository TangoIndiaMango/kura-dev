package canonjson

import (
	"strings"
	"testing"
)

// bs is a literal backslash, so the expected strings below cannot be altered
// by any tool that expands \u escapes.
const bs = "\x5c"

// Expected output of Python json.dumps(sort_keys=True, separators=(",",":")).
func TestMatchesPython(t *testing.T) {
	u := func(s string) string { return strings.ReplaceAll(s, "~", bs) }
	cases := []struct {
		in   any
		want string
	}{
		{map[string]any{"b": 1, "a": "x<y>&z", "n": nil, "t": true,
			"list": []any{3, "é", map[string]any{"k": "₦450"}}},
			u(`{"a":"x<y>&z","b":1,"list":[3,"~u00e9",{"k":"~u20a6450"}],"n":null,"t":true}`)},
		{map[string]any{"emoji": "ok \U0001F680", "nested": map[string]any{"z": "1", "a": []any{}}},
			u(`{"emoji":"ok ~ud83d~ude80","nested":{"a":[],"z":"1"}}`)},
	}
	for _, c := range cases {
		got, err := Marshal(c.in)
		if err != nil {
			t.Fatal(err)
		}
		if string(got) != c.want {
			t.Errorf("got  %s\nwant %s", got, c.want)
		}
	}
}
