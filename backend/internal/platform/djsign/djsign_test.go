package djsign

import "testing"

// Tokens made by django.core.signing.dumps(..., salt="kura.identity.v1",
// compress=True, key="test-secret-key").
func TestLoadsDjangoTokens(t *testing.T) {
	cases := map[string]string{
		"IjEyMzQ1Njc4OTAxIg:1xJmDO:vnpABT7vEaBJL2YOd2YEsXHWOyMcVif4LAg1KRvGpOo": "12345678901",
		"IkEwMTIzIg:1xJmDO:dRROWk6ujTHze7lW5My0ZmvHjcSZYAy3t1fBlaJTFVs":         "A0123",
	}
	for tok, want := range cases {
		var got string
		if err := Loads(tok, []string{"test-secret-key"}, "kura.identity.v1", &got); err != nil || got != want {
			t.Errorf("Loads(%s) = %q, %v; want %q", tok, got, err, want)
		}
	}
	var x string
	if Loads("IkEwMTIzIg:1xJmDO:tampered", []string{"test-secret-key"}, "kura.identity.v1", &x) == nil {
		t.Error("tampered token accepted")
	}
}

func TestRoundTrip(t *testing.T) {
	tok, err := Dumps("22211133344", "k", "kura.identity.v1")
	if err != nil {
		t.Fatal(err)
	}
	var got string
	if err := Loads(tok, []string{"other", "k"}, "kura.identity.v1", &got); err != nil || got != "22211133344" {
		t.Fatalf("round trip: %q %v", got, err)
	}
}
