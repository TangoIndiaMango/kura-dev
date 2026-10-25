import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { axiosInstance } from '@lib/api/client'
import { apiErrorMessage } from '@lib/api/auth'
import { notify } from '@shared/utils/notify'
import { openPaystackPopup } from '../../payments/paystack-popup'
import { SWAP_API, type BookingCheckoutApi } from './use-swap-live'

export type BookingPayOutcome = 'paid' | 'cancelled' | 'failed' | 'pending'

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

/**
 * Pay at booking: opens Paystack's popup for the booking and waits for the
 * server to confirm the payment with Paystack (that confirms the booking).
 */
export function useBookingPayment() {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)

  const pay = useCallback(
    async (reservationId: string, checkout?: BookingCheckoutApi | null): Promise<BookingPayOutcome> => {
      setBusy(true)
      try {
        let c = checkout ?? null
        if (!c || !c.access_code) {
          const { data } = await axiosInstance.post<BookingCheckoutApi>(
            SWAP_API.reservationCheckout(reservationId),
            {},
            { silentError: true },
          )
          c = data
        }
        if (c.paid) return 'paid'
        const outcome = await openPaystackPopup(c.access_code)
        if (outcome !== 'success') return outcome
        for (let attempt = 0; attempt < 6; attempt++) {
          const { data } = await axiosInstance.get<BookingCheckoutApi>(
            SWAP_API.reservationCheckout(reservationId),
            { silentError: true },
          )
          if (data.paid) return 'paid'
          if (data.status === 'FAILED') return 'failed'
          await sleep(2500)
        }
        return 'pending'
      } catch (err) {
        notify({ title: apiErrorMessage(err, 'Could not start the payment'), tone: 'error' })
        return 'failed'
      } finally {
        setBusy(false)
        void queryClient.invalidateQueries({ queryKey: [SWAP_API.reservations] })
      }
    },
    [queryClient],
  )

  return { pay, busy }
}

/**
 * The awaiting-payment booking's checkout (amount), re-verified with Paystack
 * by our server every few seconds — paying the link elsewhere confirms it here.
 */
export function useBookingCheckout(reservationId: string | null, enabled: boolean) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: reservationId ? [SWAP_API.reservationCheckout(reservationId)] : ['no-booking-checkout'],
    enabled: enabled && Boolean(reservationId),
    refetchInterval: (q) => (q.state.data?.paid ? false : 8_000),
    queryFn: async () => {
      const { data } = await axiosInstance.get<BookingCheckoutApi>(SWAP_API.reservationCheckout(reservationId!), {
        silentError: true,
      })
      if (data.paid) void queryClient.invalidateQueries({ queryKey: [SWAP_API.reservations] })
      return data
    },
  })
}
