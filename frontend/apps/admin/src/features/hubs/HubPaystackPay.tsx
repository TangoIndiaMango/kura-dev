import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, CopyButton, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { axiosInstance } from '@lib/api/client'
import { apiErrorMessage } from '@lib/api/auth'
import { formatNaira } from '@shared/utils/currency'
import { openPaystackPopup } from './paystack-popup'

type SwapCheckout = {
  reference: string
  amount_kobo: number
  status: 'PENDING' | 'SUCCESS' | 'FAILED'
  access_code: string
  authorization_url: string
  paid: boolean
  emailed: boolean
}

const checkoutUrl = (swapId: string) => `/mobility/swaps/${swapId}/checkout/`

type Props = {
  swapId: string | null
  onPaid: (paid: boolean) => void
  onLog?: (title: string, detail: string) => void
}

/**
 * Desk pay-at-swap: generate the rider's Paystack link for this swap, then
 * share it (copy / email) or open Paystack's popup on this device. Complete
 * unlocks only after the server has confirmed the payment with Paystack.
 */
export function HubPaystackPay({ swapId, onPaid, onLog }: Props) {
  const [checkout, setCheckout] = useState<SwapCheckout | null>(null)
  const [busy, setBusy] = useState<'link' | 'email' | null>(null)

  // Parent callbacks are inline functions — keep them in refs so the fetch
  // effects below don't re-run on every render.
  const onPaidRef = useRef(onPaid)
  const onLogRef = useRef(onLog)
  onPaidRef.current = onPaid
  onLogRef.current = onLog
  const loggedPaid = useRef<string | null>(null)

  const apply = useCallback((c: SwapCheckout) => {
    setCheckout(c)
    onPaidRef.current(c.paid)
    if (c.paid && loggedPaid.current !== c.reference) {
      loggedPaid.current = c.reference
      onLogRef.current?.('Paystack', `${formatNaira(c.amount_kobo / 100)} confirmed · ${c.reference}`)
    }
  }, [])

  const start = async (opts: { email?: boolean; renew?: boolean }) => {
    if (!swapId) return
    setBusy(opts.email ? 'email' : 'link')
    try {
      const { data } = await axiosInstance.post<SwapCheckout>(
        checkoutUrl(swapId),
        { send_email: Boolean(opts.email), renew: Boolean(opts.renew) },
        { silentError: true },
      )
      apply(data)
      if (opts.email && data.emailed) {
        notifications.show({ color: 'teal', message: 'Payment link sent to the rider’s email' })
        onLogRef.current?.('Paystack', `Link emailed · ${formatNaira(data.amount_kobo / 100)}`)
      } else if (!data.paid) {
        onLogRef.current?.('Paystack', `${opts.renew ? 'New link' : 'Link ready'} · ${formatNaira(data.amount_kobo / 100)}`)
      }
    } catch (err) {
      notifications.show({ color: 'red', message: apiErrorMessage(err, 'Could not create the payment link') })
    } finally {
      setBusy(null)
    }
  }

  // The rider may already have paid from their app — pick that up first.
  useEffect(() => {
    if (!swapId) return
    let live = true
    axiosInstance
      .get<SwapCheckout>(checkoutUrl(swapId), { silentError: true })
      .then(({ data }) => live && apply(data))
      .catch(() => undefined) // 404: nothing started yet
    return () => {
      live = false
    }
  }, [swapId, apply])

  const refresh = () => {
    if (!swapId) return
    axiosInstance
      .get<SwapCheckout>(checkoutUrl(swapId), { silentError: true })
      .then(({ data }) => apply(data))
      .catch(() => undefined)
  }

  // Watch a pending payment until Paystack confirms it (the server verifies).
  const pending = Boolean(swapId && checkout && checkout.status === 'PENDING')
  useEffect(() => {
    if (!pending || !swapId) return
    const t = window.setInterval(() => {
      axiosInstance
        .get<SwapCheckout>(checkoutUrl(swapId), { silentError: true })
        .then(({ data }) => {
          if (data.status !== 'PENDING' || data.reference !== checkout?.reference) apply(data)
        })
        .catch(() => undefined)
    }, 4000)
    return () => window.clearInterval(t)
  }, [pending, swapId, checkout?.reference, apply])

  const openPopup = async () => {
    if (!checkout) return
    const outcome = await openPaystackPopup(checkout.access_code)
    if (outcome === 'success') {
      notifications.show({ color: 'teal', message: 'Paid — confirming with Paystack…' })
      refresh()
    } else if (outcome === 'failed') {
      notifications.show({ color: 'red', message: 'Paystack could not open here — share the link' })
    }
  }

  if (!swapId) return null

  if (checkout?.paid) {
    return (
      <div className="mt-3 rounded-[10px] border border-[var(--bd)] bg-[var(--in)] px-3 py-3">
        <p className="text-[13px] font-bold text-[var(--tx)]">
          Paid · {formatNaira(checkout.amount_kobo / 100)}
        </p>
        <p className="mt-0.5 text-[12px] text-[var(--mu)]">Ready to complete.</p>
      </div>
    )
  }

  if (!checkout) {
    return (
      <Button mt="sm" color="brand" fullWidth loading={busy === 'link'} onClick={() => void start({})}>
        Generate payment link
      </Button>
    )
  }

  const failed = checkout.status === 'FAILED'
  return (
    <div className="mt-3 rounded-[10px] border border-[var(--bd)] bg-[var(--in)] px-3 py-3">
      <p className="text-[13px] font-bold text-[var(--tx)]">
        {failed ? 'Payment failed — not charged' : 'Waiting for payment'} · {formatNaira(checkout.amount_kobo / 100)}
      </p>
      <TextInput mt="sm" readOnly value={checkout.authorization_url} aria-label="Payment link" />
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <CopyButton value={checkout.authorization_url}>
          {({ copied, copy }) => (
            <Button variant="light" onClick={copy} disabled={failed}>
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          )}
        </CopyButton>
        <Button variant="light" loading={busy === 'email'} disabled={failed} onClick={() => void start({ email: true })}>
          Email link
        </Button>
        <Button variant="light" loading={busy === 'link'} onClick={() => void start({ renew: true })}>
          New link
        </Button>
        <Button color="brand" onClick={() => void openPopup()} disabled={failed}>
          Pay here
        </Button>
      </div>
    </div>
  )
}
