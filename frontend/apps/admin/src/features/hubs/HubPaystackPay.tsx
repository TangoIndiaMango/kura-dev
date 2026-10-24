import { useCallback, useEffect, useState } from 'react'
import { Button, CopyButton, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import PaystackPop from '@paystack/inline-js'
import { axiosInstance } from '@lib/api/client'
import { apiErrorMessage } from '@lib/api/auth'
import { formatNaira } from '@shared/utils/currency'

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

  const apply = useCallback(
    (c: SwapCheckout) => {
      setCheckout(c)
      onPaid(c.paid)
      if (c.paid) onLog?.('Paystack', `${formatNaira(c.amount_kobo / 100)} confirmed · ${c.reference}`)
    },
    [onPaid, onLog],
  )

  const start = async (sendEmail: boolean) => {
    if (!swapId) return
    setBusy(sendEmail ? 'email' : 'link')
    try {
      const { data } = await axiosInstance.post<SwapCheckout>(checkoutUrl(swapId), { send_email: sendEmail })
      apply(data)
      if (sendEmail && data.emailed) {
        notifications.show({ color: 'teal', message: 'Payment link emailed to the rider' })
        onLog?.('Paystack', `Link emailed · ${formatNaira(data.amount_kobo / 100)}`)
      } else if (!data.paid) {
        onLog?.('Paystack', `Link ready · ${formatNaira(data.amount_kobo / 100)}`)
      }
    } catch (err) {
      notifications.show({ color: 'red', message: apiErrorMessage(err, 'Could not create the payment link') })
    } finally {
      setBusy(null)
    }
  }

  // Watch a pending payment until Paystack confirms it (the server verifies).
  const pending = Boolean(swapId && checkout && checkout.status === 'PENDING')
  useEffect(() => {
    if (!pending || !swapId) return
    const t = window.setInterval(() => {
      axiosInstance
        .get<SwapCheckout>(checkoutUrl(swapId))
        .then(({ data }) => {
          if (data.status !== 'PENDING' || data.reference !== checkout?.reference) apply(data)
        })
        .catch(() => undefined)
    }, 4000)
    return () => window.clearInterval(t)
  }, [pending, swapId, checkout?.reference, apply])

  const openPopup = () => {
    if (!checkout) return
    try {
      new PaystackPop().resumeTransaction(checkout.access_code, {
        onSuccess: () => notifications.show({ color: 'teal', message: 'Paid — confirming with Paystack…' }),
        onError: () => notifications.show({ color: 'red', message: 'Paystack could not open here — share the link' }),
      })
    } catch {
      notifications.show({ color: 'red', message: 'Paystack could not open here — share the link' })
    }
  }

  if (!swapId) {
    return <p className="mt-3 text-[12.5px] text-[var(--mu)]">Start the swap session to take a Paystack payment.</p>
  }

  if (checkout?.paid) {
    return (
      <div className="mt-3 rounded-[10px] border border-[var(--bd)] bg-[var(--in)] px-3 py-3">
        <p className="text-[13px] font-bold text-[var(--tx)]">Paid with Paystack</p>
        <p className="mt-1 text-[12px] text-[var(--mu)]">
          {formatNaira(checkout.amount_kobo / 100)} confirmed · {checkout.reference}. Complete the swap.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-[10px] border border-[var(--bd)] bg-[var(--in)] px-3 py-3">
      {!checkout ? (
        <>
          <p className="text-[12.5px] text-[var(--mu)]">
            The rider pays by card, bank transfer or USSD. Generate their link, then share it or open it here.
          </p>
          <Button mt="sm" color="brand" fullWidth loading={busy === 'link'} onClick={() => void start(false)}>
            Generate payment link
          </Button>
        </>
      ) : (
        <>
          <p className="text-[13px] font-bold text-[var(--tx)]">
            {checkout.status === 'FAILED' ? 'Payment failed' : 'Waiting for payment'} ·{' '}
            {formatNaira(checkout.amount_kobo / 100)}
          </p>
          <p className="mt-1 text-[12px] text-[var(--mu)]">
            {checkout.status === 'FAILED'
              ? 'The rider was not charged. Generate a new link to retry.'
              : 'This updates on its own once Paystack confirms.'}
          </p>
          <TextInput mt="sm" readOnly value={checkout.authorization_url} aria-label="Payment link" />
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <CopyButton value={checkout.authorization_url}>
              {({ copied, copy }) => (
                <Button variant="light" onClick={copy}>
                  {copied ? 'Copied' : 'Copy link'}
                </Button>
              )}
            </CopyButton>
            <Button variant="light" loading={busy === 'email'} onClick={() => void start(true)}>
              Email to rider
            </Button>
            <Button color="brand" onClick={openPopup} disabled={checkout.status !== 'PENDING'}>
              Pay here
            </Button>
          </div>
          {checkout.status === 'FAILED' ? (
            <Button mt="xs" variant="subtle" fullWidth loading={busy === 'link'} onClick={() => void start(false)}>
              New payment link
            </Button>
          ) : null}
        </>
      )}
    </div>
  )
}
