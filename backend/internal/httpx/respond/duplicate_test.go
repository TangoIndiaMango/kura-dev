package respond

import (
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
)

func TestDuplicateMessages(t *testing.T) {
	cases := map[string]string{
		"mobility_hubslot_battery_id_key": duplicateMessages["mobility_hubslot_battery_id_key"],
		"some_unmapped_key":               duplicateFallback,
	}
	for constraint, want := range cases {
		err := fmt.Errorf("wrapped: %w", &pgconn.PgError{Code: "23505", ConstraintName: constraint,
			Detail: "Key (battery_id)=(x) already exists."})
		w := httptest.NewRecorder()
		Error(w, httptest.NewRequest("POST", "/x", nil), err)
		var body struct {
			Error struct {
				Message string              `json:"message"`
				Details map[string][]string `json:"details"`
			} `json:"error"`
		}
		if jerr := json.Unmarshal(w.Body.Bytes(), &body); jerr != nil {
			t.Fatal(jerr)
		}
		if w.Code != 409 || body.Error.Message != want || body.Error.Details["battery_id"] == nil {
			t.Errorf("%s: got %d %q %v", constraint, w.Code, body.Error.Message, body.Error.Details)
		}
	}
}
