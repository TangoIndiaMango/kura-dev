import React from 'react'
import { formatNaira } from '../../../shared/utils/currency'
import { OperatorPrimaryButton } from '../../../shared/components/operator/OperatorPrimaryButton'

interface WalletBalanceHeaderProps {
  availableNaira: number
  partnerNote: string
  onFund: () => void
  onCredit: () => void
}

export const WalletBalanceHeader: React.FC<WalletBalanceHeaderProps> = ({
  availableNaira,
  partnerNote,
  onFund,
  onCredit,
}) => {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-[var(--kura-text)]">Wallet</h2>
        <div className="mt-3 flex flex-col gap-1">
          <span className="text-xs text-[var(--kura-muted)]">Available balance</span>
          <span className="text-[34px] font-bold tracking-tight text-[var(--kura-text)]">
            {formatNaira(availableNaira)}
          </span>
          <span className="text-xs text-[var(--kura-green)]">{partnerNote}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <OperatorPrimaryButton onClick={onFund}>Fund wallet</OperatorPrimaryButton>
        <button
          type="button"
          onClick={onCredit}
          className="rounded-xl border border-[var(--kura-border)] bg-transparent px-4 py-3.5 text-[15px] font-bold text-[var(--kura-text)] transition hover:bg-white/5"
        >
          Get credit
        </button>
      </div>
    </section>
  )
}
