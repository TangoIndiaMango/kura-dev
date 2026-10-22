package mobility

import (
	"strconv"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
)

func contains(ids []uuid.UUID, id uuid.UUID) bool {
	for _, x := range ids {
		if x == id {
			return true
		}
	}
	return false
}

func itoa[T ~int | ~int32 | ~int64](n T) string { return strconv.FormatInt(int64(n), 10) }

// pyRound is Python's round(x, n): correctly rounded, ties to even.
func pyRound(x float64, n int) float64 {
	v, _ := strconv.ParseFloat(strconv.FormatFloat(x, 'f', n, 64), 64)
	return v
}

func parseFloat(s string) (float64, error) { return strconv.ParseFloat(s, 64) }

// ignoreNoRows turns "no rows" into nil (for existence checks).
func ignoreNoRows(err error) error {
	if database.IsNoRows(err) {
		return nil
	}
	return err
}
