-- Paystack Checkout can be opened for a swap (pay at swap), not only as a
-- wallet top-up. The payment lands in the rider's balance either way.

-- +goose Up
ALTER TABLE public.finance_walletcheckout
    ADD COLUMN purpose character varying(16) NOT NULL DEFAULT 'WALLET_TOPUP',
    ADD COLUMN channel character varying(20) NOT NULL DEFAULT '',
    ADD COLUMN swap_id uuid REFERENCES public.mobility_swap (id) DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX finance_walletcheckout_swap ON public.finance_walletcheckout (swap_id, created_at DESC)
    WHERE swap_id IS NOT NULL;

-- +goose Down
DROP INDEX public.finance_walletcheckout_swap;
ALTER TABLE public.finance_walletcheckout DROP COLUMN swap_id, DROP COLUMN channel, DROP COLUMN purpose;
