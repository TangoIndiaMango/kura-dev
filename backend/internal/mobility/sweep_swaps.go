package mobility

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
)

// SweepSwapLifecycle is sweep_swap_lifecycle: expire lapsed holds (and
// free orphaned RESERVED packs), then abort open swaps whose hold died or
// whose bay session went stale. Each item commits on its own.
func SweepSwapLifecycle(ctx context.Context, pool *pgxpool.Pool, log *slog.Logger, resLimit, swapLimit int) (map[string]any, error) {
	q := db.New(pool)
	due, err := q.DueReservationIDs(ctx, int32(resLimit))
	if err != nil {
		return nil, err
	}
	expired := 0
	for _, id := range due {
		var out db.MobilityReservation
		var before string
		err := database.InTx(ctx, pool, func(tx pgx.Tx) error {
			tq := db.New(tx)
			cur, err := tq.ReservationByID(ctx, id)
			if err != nil {
				return err
			}
			before = cur.Status
			out, err = expireReservation(ctx, tq, id)
			return err
		})
		if err != nil {
			return nil, err
		}
		if out.Status == "EXPIRED" && before != "EXPIRED" {
			expired++
		}
	}
	released, err := q.ReleaseOrphanedReserved(ctx)
	if err != nil {
		return nil, err
	}
	swaps, err := abandonIncompleteSwaps(ctx, pool, log, swapLimit)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"reservations": map[string]any{"scanned": len(due), "expired": expired, "released_packs": released},
		"swaps":        swaps,
	}, nil
}

// abandonIncompleteSwaps is abandon_incomplete_swaps.
func abandonIncompleteSwaps(ctx context.Context, pool *pgxpool.Pool, log *slog.Logger, limit int) (map[string]any, error) {
	q := db.New(pool)
	stale, err := q.StaleOpenSwapIDs(ctx, db.StaleOpenSwapIDsParams{Cutoff: time.Now().Add(-staleOpenAfter),
		Lim: int32(limit)})
	if err != nil {
		return nil, err
	}
	candidates, seen := []uuid.UUID{}, map[uuid.UUID]bool{}
	for _, s := range stale {
		candidates, seen[s.ID] = append(candidates, s.ID), true
	}
	if len(candidates) < limit {
		more, err := q.OpenSwapIDs(ctx, int32(limit*3))
		if err != nil {
			return nil, err
		}
		for _, id := range more {
			if seen[id] {
				continue
			}
			candidates = append(candidates, id)
			if len(candidates) >= limit*2 {
				break
			}
		}
	}
	rows, err := q.SwapRows(ctx, candidates)
	if err != nil {
		return nil, err
	}
	by := map[uuid.UUID]db.SwapRowsRow{}
	for _, r := range rows {
		by[r.ID] = r
	}
	abandoned := 0
	for _, id := range candidates {
		if abandoned >= limit {
			break
		}
		if r, ok := by[id]; !ok || uiStatus(r) != "INCOMPLETE" {
			continue
		}
		if err := database.InTx(ctx, pool, func(tx pgx.Tx) error {
			return abortSwap(ctx, db.New(tx), id, "abandoned:hold_expired_or_stale", nil, nil)
		}); err != nil {
			log.Error("abandon_incomplete_swap_failed", "id", id, "err", err)
			continue
		}
		abandoned++
	}
	return map[string]any{"checked": len(candidates), "abandoned": abandoned}, nil
}
