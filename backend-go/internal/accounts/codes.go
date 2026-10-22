package accounts

import (
	"context"
	"crypto/rand"
	"math/big"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
)

const codeAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

// kuraID is core.ids.kura_id: PREFIX-XXXXXX from A–Z0–9.
func kuraID(prefix string, length int) string {
	b := make([]byte, length)
	for i := range b {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(codeAlphabet))))
		if err != nil {
			panic(err) // crypto/rand failing is unrecoverable
		}
		b[i] = codeAlphabet[n.Int64()]
	}
	return prefix + "-" + string(b)
}

// uniquePublicID mirrors User.save: 12 tries at 6 chars, then 8 chars.
func uniquePublicID(ctx context.Context, q *db.Queries, prefix string) (string, error) {
	for range 12 {
		c := kuraID(prefix, 6)
		taken, err := q.PublicIDTaken(ctx, &c)
		if err != nil {
			return "", err
		}
		if !taken {
			return c, nil
		}
	}
	return kuraID(prefix, 8), nil
}

func oneOf(v string, options ...string) bool {
	for _, o := range options {
		if v == o {
			return true
		}
	}
	return false
}
