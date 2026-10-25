-- Paystack Checkout can pay for a booking up front (pay at booking), and
-- refunds wait for a finance review before they are sent.

-- +goose Up
ALTER TABLE public.finance_walletcheckout
    ADD COLUMN reservation_id uuid REFERENCES public.mobility_reservation (id) DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX finance_walletcheckout_reservation ON public.finance_walletcheckout (reservation_id, created_at DESC)
    WHERE reservation_id IS NOT NULL;
CREATE INDEX finance_walletcheckout_refunds ON public.finance_walletcheckout (status, updated_at)
    WHERE status IN ('REFUND_REVIEW', 'REFUND_PENDING', 'REFUNDED', 'REFUND_REJECTED');
-- Refunds already queued by the previous release go to review too.
UPDATE public.finance_walletcheckout SET status = 'REFUND_REVIEW' WHERE status = 'REFUND_PENDING';

-- +goose Down
DROP INDEX public.finance_walletcheckout_refunds;
DROP INDEX public.finance_walletcheckout_reservation;
ALTER TABLE public.finance_walletcheckout DROP COLUMN reservation_id;
