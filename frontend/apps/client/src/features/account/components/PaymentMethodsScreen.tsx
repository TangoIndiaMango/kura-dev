import React from 'react'
import { OperatorBackHeader } from '../../../shared/components/operator/OperatorBackHeader'

interface PaymentMethodsScreenProps {
  onBack: () => void
  embedded?: boolean
}

// Riders hold no balance and nothing is saved: each swap is paid when it
// happens. This screen only explains how — no account numbers, no cards.
const WAYS: { title: string; body: string }[] = [
  {
    title: 'Paystack',
    body: 'Pay by card, bank transfer or USSD when you book, or at the hub. A booking is held once it is paid.',
  },
  {
    title: 'Cash at the hub',
    body: 'Pay the agent at the bay when your battery is swapped.',
  },
  {
    title: 'Plan',
    body: 'Swaps your plan covers cost nothing at the hub.',
  },
]

export const PaymentMethodsScreen: React.FC<PaymentMethodsScreenProps> = ({
  onBack,
  embedded = false,
}) => (
  <div className="flex flex-col gap-4">
    {embedded ? (
      <h3 className="text-[15px] font-bold text-[var(--kura-text)]">How you pay</h3>
    ) : (
      <OperatorBackHeader title="How you pay" onBack={onBack} />
    )}

    <section className="flex flex-col divide-y divide-[var(--kura-border)] rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)]">
      {WAYS.map((w) => (
        <div key={w.title} className="p-4">
          <p className="text-[13px] font-bold text-[var(--kura-text)]">{w.title}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--kura-muted)]">{w.body}</p>
        </div>
      ))}
    </section>

    <section className="rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] p-4">
      <p className="text-[13px] font-bold text-[var(--kura-text)]">Refunds</p>
      <p className="mt-1 text-[12px] leading-relaxed text-[var(--kura-muted)]">
        If a paid booking lapses or is cancelled, the money goes back to the card or account you
        paid from after a quick review. We let you know when it is sent.
      </p>
    </section>
  </div>
)
