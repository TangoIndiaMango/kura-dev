package accounts

import (
	"context"
	"math/big"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
)

// ownAccountIDs is mobility.selectors._own_account_ids: the caller's driver
// account plus every owned account, deduplicated. Django returns
// list(set(...)) and callers take [0], so the order follows CPython's set
// layout; pySetOrder reproduces it for small sets.
func ownAccountIDs(ctx context.Context, q *db.Queries, user uuid.UUID) ([]uuid.UUID, error) {
	var ids []uuid.UUID
	if d, err := q.DriverByUser(ctx, user); err == nil {
		ids = append(ids, d.AccountID)
	} else if !database.IsNoRows(err) {
		return nil, err
	}
	owned, err := q.OwnedAccountIDs(ctx, user)
	if err != nil {
		return nil, err
	}
	return pySetOrder(append(ids, owned...)), nil
}

// pySetOrder dedupes ids and orders them as iterating a CPython set built
// from them would (hash(UUID) = int mod 2**61-1, 8-slot table, perturbed
// probing). Sets larger than 4 resize in CPython; those keep insertion order.
func pySetOrder(ids []uuid.UUID) []uuid.UUID {
	seen, uniq := map[uuid.UUID]bool{}, []uuid.UUID{}
	for _, id := range ids {
		if !seen[id] {
			seen[id] = true
			uniq = append(uniq, id)
		}
	}
	if len(uniq) < 2 || len(uniq) > 4 {
		return uniq
	}
	const mask = 7
	modulus := new(big.Int).Sub(new(big.Int).Lsh(big.NewInt(1), 61), big.NewInt(1))
	var table [mask + 1]*uuid.UUID
	for k := range uniq {
		id := uniq[k]
		h := new(big.Int).Mod(new(big.Int).SetBytes(id[:]), modulus).Uint64()
		i, perturb := h&mask, h
		for table[i] != nil {
			perturb >>= 5
			i = (i*5 + 1 + perturb) & mask
		}
		table[i] = &uniq[k]
	}
	out := make([]uuid.UUID, 0, len(uniq))
	for _, p := range table {
		if p != nil {
			out = append(out, *p)
		}
	}
	return out
}
