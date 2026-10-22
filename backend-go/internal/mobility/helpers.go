package mobility

import (
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/spend"
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

// dateOf converts a calendar day to a DB date parameter.
func dateOf(d spend.Date) pgtype.Date {
	t, _ := time.Parse("2006-01-02", d.ISO())
	return pgtype.Date{Time: t, Valid: true}
}

// pyFloat is repr(float) for ordinary magnitudes ("1.0", "1792653938.123456").
func pyFloat(f float64) string {
	s := strconv.FormatFloat(f, 'f', -1, 64)
	for _, c := range s {
		if c == '.' {
			return s
		}
	}
	return s + ".0"
}
