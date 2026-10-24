import React from 'react'
import { formatNaira } from '../../../shared/utils/currency'
import { useSwapAwaitingPayment } from '../hooks/use-swap-awaiting-payment'
import { useSwapPayment } from '../hooks/use-swap-payment'

/** App-wide prompt while the agent's swap waits for the rider's Paystack payment. */
export const PaySwapBanner: React.FC<{ enabled: boolean; fastPoll: boolean }> = ({
  enabled,
  fastPoll,
}) => {
  const { swap, paid, amountKobo } = useSwapAwaitingPayment(enabled, fastPoll)
  const payment = useSwapPayment()
  if (!swap) return null
  const amount = amountKobo > 0 ? formatNaira(amountKobo, { fromKobo: true }) : null
  const where = [swap.hub_name, swap.vehicle_plate].filter(Boolean).join(' · ')

  if (paid) {
    return (
      <section
        role="status"
        className="mb-4 rounded-2xl border border-[var(--kura-teal)]/40 bg-[var(--kura-teal)]/10 px-4 py-3"
      >
        <p className="text-[13px] font-bold text-[var(--kura-text)]">Paid{amount ? ` ${amount}` : ''}</p>
        <p className="mt-0.5 text-[12px] text-[var(--kura-muted)]">
          The agent is finishing your swap{where ? ` at ${where}` : ''}.
        </p>
      </section>
    )
  }

  return (
    <section className="mb-4 flex items-center gap-3 rounded-2xl border border-[var(--kura-amber)]/50 bg-[var(--kura-amber)]/10 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-[var(--kura-text)]">Pay for your swap</p>
        <p className="mt-0.5 truncate text-[12px] text-[var(--kura-muted)]">
          {where || 'At the bay'} · card, transfer or USSD
        </p>
      </div>
      <button
        type="button"
        disabled={payment.busy}
        onClick={() => void payment.pay(swap.id)}
        className="shrink-0 rounded-xl bg-[var(--kura-amber)] px-3.5 py-2.5 text-[13px] font-extrabold text-[#1a1204] disabled:opacity-60"
      >
        {payment.busy ? 'Opening…' : amount ? `Pay ${amount}` : 'Pay now'}
      </button>
    </section>
  )
}
