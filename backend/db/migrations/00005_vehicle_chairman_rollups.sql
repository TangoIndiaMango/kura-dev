-- The chairman (cooperative) belongs to the vehicle, not the rider's account:
-- whoever buys the bike is the chairman, whoever rides it is the rider.
-- Reports read small per-day rollups instead of scanning payments and swaps.

-- +goose Up
ALTER TABLE public.mobility_vehicle
    ADD COLUMN cooperative_id uuid REFERENCES public.accounts_cooperative (id) DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX mobility_vehicle_cooperative ON public.mobility_vehicle (cooperative_id) WHERE cooperative_id IS NOT NULL;
UPDATE public.mobility_vehicle v SET cooperative_id = a.cooperative_id
FROM public.accounts_account a WHERE a.id = v.account_id AND a.cooperative_id IS NOT NULL;
ALTER TABLE public.accounts_account DROP COLUMN cooperative_id;

-- One row per Lagos day × hub × chairman × purpose × channel × status.
CREATE TABLE public.analytics_dailymoney (
    day            date        NOT NULL,
    hub_id         uuid,
    cooperative_id uuid,
    purpose        varchar(50) NOT NULL,
    channel        varchar(30) NOT NULL,
    status         varchar(20) NOT NULL,
    payments       integer     NOT NULL,
    amount_kobo    bigint      NOT NULL,
    vat_kobo       bigint      NOT NULL,
    CONSTRAINT analytics_dailymoney_key UNIQUE NULLS NOT DISTINCT (day, hub_id, cooperative_id, purpose, channel, status)
);
CREATE INDEX analytics_dailymoney_coop ON public.analytics_dailymoney (cooperative_id, day) WHERE cooperative_id IS NOT NULL;

-- One row per Lagos day × hub × chairman: completed swaps.
CREATE TABLE public.analytics_dailyswaps (
    day            date    NOT NULL,
    hub_id         uuid    NOT NULL,
    cooperative_id uuid,
    swaps          integer NOT NULL,
    amount_kobo    bigint  NOT NULL,
    CONSTRAINT analytics_dailyswaps_key UNIQUE NULLS NOT DISTINCT (day, hub_id, cooperative_id)
);
CREATE INDEX analytics_dailyswaps_coop ON public.analytics_dailyswaps (cooperative_id, day) WHERE cooperative_id IS NOT NULL;

-- Where the rollup job has got to (one row per job).
CREATE TABLE public.analytics_rollupstate (
    name            varchar(40) PRIMARY KEY,
    last_run_at     timestamptz NOT NULL,
    backfilled_from date
);

-- +goose Down
DROP TABLE public.analytics_rollupstate;
DROP TABLE public.analytics_dailyswaps;
DROP TABLE public.analytics_dailymoney;
ALTER TABLE public.accounts_account
    ADD COLUMN cooperative_id uuid REFERENCES public.accounts_cooperative (id) DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX accounts_account_cooperative_id_fc5ead08 ON public.accounts_account (cooperative_id);
UPDATE public.accounts_account a SET cooperative_id = v.cooperative_id
FROM public.mobility_vehicle v WHERE v.account_id = a.id AND v.cooperative_id IS NOT NULL;
DROP INDEX public.mobility_vehicle_cooperative;
ALTER TABLE public.mobility_vehicle DROP COLUMN cooperative_id;
