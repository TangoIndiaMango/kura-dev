package numeric

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

func TestTextKeepsScale(t *testing.T) {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("DATABASE_URL not set")
	}
	conn, err := pgx.Connect(context.Background(), url)
	if err != nil {
		t.Skip(err)
	}
	defer conn.Close(context.Background())
	for _, in := range []string{"12.50", "0.05", "-3.10", "100.00", "0.00", "3.24", "-0.01", "999.99"} {
		var n pgtype.Numeric
		if err := conn.QueryRow(context.Background(), "SELECT $1::numeric", in).Scan(&n); err != nil {
			t.Fatal(err)
		}
		if got := Text(n, 2); got != in {
			t.Errorf("Text(%s) = %s", in, got)
		}
	}
}
