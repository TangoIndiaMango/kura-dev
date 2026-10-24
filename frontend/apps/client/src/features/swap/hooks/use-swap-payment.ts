import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { axiosInstance } from '@lib/api/client'
import { apiErrorMessage } from '@lib/api/auth'
import { notify } from '@shared/utils/notify'
import { openPaystackPopup } from '../../payments/paystack-popup'
import { SWAP_API } from './use-swap-live'

export type SwapCheckout = {
  reference: string
  amount_kobo: number
  status: 'PENDING' | 'SUCCESS' | 'FAILED'
  access_code: string
  authorization_url: string
  paid: boolean
}

const naira = (kobo: number) => `₦${Math.round(kobo / 100).toLocaleString()}`
const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

/**
 * Pay-at-swap: the server opens a Paystack checkout for the swap fee, the
 * in-app popup takes the payment, and the server confirms it with Paystack
 * before the hub can complete the swap.
 */
export function useSwapPayment(onPaid?: () => void) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)

  const confirm = useCallback(
    async (swapId: string) => {
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data } = await axiosInstance.get<SwapCheckout>(SWAP_API.swapCheckout(swapId))
        if (data.paid) return data
        if (data.status === 'FAILED') return data
        await sleep(2500)
      }
      return null
    },
    [],
  )

  const pay = useCallback(
    async (swapId: string) => {
      setBusy(true)
      try {
        const { data } = await axiosInstance.post<SwapCheckout>(SWAP_API.swapCheckout(swapId), {})
        let result: SwapCheckout | null = data
        if (!data.paid) {
          const outcome = await openPaystackPopup(data.access_code)
          if (outcome === 'cancelled') return
          if (outcome === 'failed') {
            notify({ title: 'Paystack could not open — try again', tone: 'error' })
            return
          }
          result = await confirm(swapId)
        }
        if (result?.paid) {
          notify({ title: `${naira(result.amount_kobo)} paid — the hub can finish your swap`, tone: 'success' })
          onPaid?.()
        } else if (result?.status === 'FAILED') {
          notify({ title: 'Payment failed — you were not charged', tone: 'error' })
        } else {
          notify({ title: 'Payment received — confirming with Paystack', tone: 'info' })
        }
        void queryClient.invalidateQueries({ queryKey: [SWAP_API.swaps] })
      } catch (err) {
        notify({ title: apiErrorMessage(err, 'Could not start payment'), tone: 'error' })
      } finally {
        setBusy(false)
      }
    },
    [confirm, onPaid, queryClient],
  )

  return { pay, busy }
}
