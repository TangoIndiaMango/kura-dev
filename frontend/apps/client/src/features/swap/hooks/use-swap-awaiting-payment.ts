import { useQuery } from '@tanstack/react-query'
import { axiosInstance } from '@lib/api/client'
import { SWAP_API, type SwapListApi } from './use-swap-live'
import type { SwapCheckout } from './use-swap-payment'

const OPEN = ['STARTED', 'RETURN_RECORDED', 'ISSUED']

/** A swap whose booking lapsed or was cancelled is about to be cancelled — never ask to pay for it. */
export function bookingLapsed(s: Pick<SwapListApi, 'reservation_status' | 'reservation_expires_at'>) {
  const status = (s.reservation_status || '').toUpperCase()
  if (status === 'EXPIRED' || status === 'CANCELLED') return true
  return Boolean(s.reservation_expires_at) && new Date(s.reservation_expires_at!).getTime() <= Date.now()
}

type CursorPage<T> = { results: T[] }

/**
 * The rider's open swap that is paid with Paystack at the bay, plus whether
 * Paystack has confirmed it. Polls quicker while a hold is live (the rider is
 * on the way / at the bay) so the Pay prompt appears as the agent starts.
 */
export function useSwapAwaitingPayment(enabled: boolean, fastPoll: boolean) {
  const swaps = useQuery({
    queryKey: [SWAP_API.swaps, 'awaiting-payment'],
    enabled,
    refetchInterval: fastPoll ? 8_000 : 30_000,
    queryFn: async () => {
      const { data } = await axiosInstance.get<CursorPage<SwapListApi>>(SWAP_API.swaps, {
        params: { page_size: 5 },
        silentError: true,
      })
      return data.results
    },
  })
  const swap =
    swaps.data?.find(
      (s) =>
        s.payment_mode?.toUpperCase() === 'PAYSTACK' &&
        OPEN.includes(s.status.toUpperCase()) &&
        !bookingLapsed(s),
    ) ?? null
  const checkout = useQuery({
    queryKey: swap ? [SWAP_API.swapCheckout(swap.id)] : ['no-swap-checkout'],
    enabled: Boolean(swap),
    refetchInterval: (q) => (q.state.data?.paid ? false : 8_000),
    queryFn: async () => {
      try {
        const { data } = await axiosInstance.get<SwapCheckout>(SWAP_API.swapCheckout(swap!.id), {
          silentError: true,
        })
        return data
      } catch {
        return null // 404: no payment started yet
      }
    },
  })
  const paid = Boolean(checkout.data?.paid)
  const amountKobo = checkout.data?.amount_kobo ?? swap?.display_amount_kobo ?? swap?.amount_kobo ?? 0
  return { swap, paid, amountKobo }
}
