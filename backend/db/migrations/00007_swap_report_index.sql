-- Reports count distinct riders and vehicles among completed swaps in a
-- date range; this covering index lets that run as an index-only scan.
-- Built CONCURRENTLY so a large swap table keeps taking writes meanwhile.

-- +goose NO TRANSACTION
-- +goose Up
CREATE INDEX CONCURRENTLY IF NOT EXISTS mobility_swap_completed_report
    ON public.mobility_swap (created_at) INCLUDE (account_id, vehicle_id, hub_id) WHERE status = 'COMPLETED';

-- +goose Down
DROP INDEX CONCURRENTLY IF EXISTS public.mobility_swap_completed_report;
