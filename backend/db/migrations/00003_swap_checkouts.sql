-- Paystack Checkout can now pay for a swap directly (pay at swap), not only
-- top up a wallet. A swap has at most one successful checkout.

-- +goose Up
ALTER TABLE public.finance_walletcheckout
    ADD COLUMN purpose character varying(16) NOT NULL DEFAULT 'WALLET_TOPUP',
    ADD COLUMN channel character varying(20) NOT NULL DEFAULT '',
    ADD COLUMN swap_id uuid REFERENCES public.mobility_swap (id) DEFERRABLE INITIALLY DEFERRED;
CREATE UNIQUE INDEX finance_walletcheckout_swap_paid ON public.finance_walletcheckout (swap_id)
    WHERE status = 'SUCCESS' AND swap_id IS NOT NULL;
CREATE INDEX finance_walletcheckout_swap ON public.finance_walletcheckout (swap_id, created_at DESC)
    WHERE swap_id IS NOT NULL;

-- +goose Down
DROP INDEX public.finance_walletcheckout_swap;
DROP INDEX public.finance_walletcheckout_swap_paid;
ALTER TABLE public.finance_walletcheckout DROP COLUMN swap_id, DROP COLUMN channel, DROP COLUMN purpose;
