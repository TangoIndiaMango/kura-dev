-- Wallet top-ups through Paystack Checkout (popup or redirect). One row per
-- initialized transaction: ties the Paystack reference to the rider who
-- started it, so the webhook and the app's verify call credit the right
-- wallet exactly once.

-- +goose Up
CREATE TABLE public.finance_walletcheckout (
    id uuid PRIMARY KEY,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    reference character varying(64) NOT NULL UNIQUE,
    amount_kobo bigint NOT NULL CHECK (amount_kobo > 0),
    status character varying(16) NOT NULL DEFAULT 'PENDING',
    access_code character varying(64) NOT NULL DEFAULT '',
    authorization_url character varying(255) NOT NULL DEFAULT '',
    failure_reason character varying(255) NOT NULL DEFAULT '',
    account_id uuid NOT NULL REFERENCES public.accounts_account (id) DEFERRABLE INITIALLY DEFERRED,
    user_id uuid REFERENCES public.accounts_user (id) DEFERRABLE INITIALLY DEFERRED,
    payment_id uuid REFERENCES public.finance_payment (id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX finance_walletcheckout_account_created ON public.finance_walletcheckout (account_id, created_at DESC);
CREATE INDEX finance_walletcheckout_pending ON public.finance_walletcheckout (created_at) WHERE status = 'PENDING';

-- +goose Down
DROP TABLE public.finance_walletcheckout;
