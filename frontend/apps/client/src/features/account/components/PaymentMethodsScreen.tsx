import React from 'react'
import { OperatorBackHeader } from '../../../shared/components/operator/OperatorBackHeader'
import { useOperatorWallet } from '../../wallet/hooks/use-operator-wallet'

interface PaymentMethodsScreenProps {
  onBack: () => void
  embedded?: boolean
}

export const PaymentMethodsScreen: React.FC<PaymentMethodsScreenProps> = ({
  onBack,
  embedded = false,
}) => {
  const liveWallet = useOperatorWallet()
  const vaNuban = liveWallet.wallet ? liveWallet.nuban : null

  let virtualAccountBlock = (
    <p className="text-[12px] leading-relaxed text-[var(--kura-muted)]">
      Your bank details appear here as soon as the account is issued.
    </p>
  )
  if (liveWallet.isLoading) {
    virtualAccountBlock = (
      <div className="h-20 animate-pulse rounded-xl bg-[var(--kura-border)]/40" />
    )
  } else if (vaNuban) {
    virtualAccountBlock = (
      <div className="flex flex-col gap-2">
        <Row label="Bank" value={liveWallet.bankLabel} />
        <Row label="Account number" value={vaNuban} />
        {liveWallet.accountName ? (
          <Row label="Account name" value={liveWallet.accountName} />
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {embedded ? (
        <h3 className="text-[15px] font-bold text-[var(--kura-text)]">
          Payment methods
        </h3>
      ) : (
        <OperatorBackHeader title="Payment methods" onBack={onBack} />
      )}

      <section className="rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] p-4">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[var(--kura-muted)]">
          Virtual account
        </p>
        {virtualAccountBlock}
        {/* <p className="mt-3 text-[12px] text-[var(--kura-muted)]">
          Transfers credit your wallet when the payment partner confirms. Use
          Fund in Wallet for the same details.
        </p> */}
      </section>

      <section className="rounded-2xl border border-dashed border-[var(--kura-border)] bg-[var(--kura-bg-elevated)]/60 p-4">
        <p className="text-[13px] font-bold text-[var(--kura-text)]">Cards</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--kura-muted)]">
          Cards are not enabled. Fund by bank transfer to your virtual account.
        </p>
      </section>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12px] text-[var(--kura-muted)]">{label}</span>
      <span className="text-right text-[13px] font-semibold text-[var(--kura-text)]">
        {value}
      </span>
    </div>
  )
}
