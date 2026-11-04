-- Per-rider daily totals: what each account paid and swapped on a Lagos day.
-- Cohorts, ARPU and churn add these up instead of scanning payments.

-- +goose Up
CREATE TABLE public.analytics_dailyaccount (
    day        date    NOT NULL,
    account_id uuid    NOT NULL,
    payments   integer NOT NULL,
    paid_kobo  bigint  NOT NULL,
    swaps      integer NOT NULL,
    PRIMARY KEY (day, account_id)
);
CREATE INDEX analytics_dailyaccount_account ON public.analytics_dailyaccount (account_id, day);
-- Start the backfill over so the new table covers history too (refills are idempotent).
DELETE FROM public.analytics_rollupstate WHERE name = 'daily';

-- +goose Down
DROP TABLE public.analytics_dailyaccount;
