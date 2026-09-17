import React from 'react'
import { OperatorPrimaryButton } from '../../../shared/components/operator/OperatorPrimaryButton'
import { OperatorSubtleButton } from '../../../shared/components/operator/OperatorSubtleButton'
import { formatNaira } from '../../../shared/utils/currency'

interface InsufficientBalanceStepProps {
  shortfallNaira: number
  nuban: string | null
  creditAvailable: boolean
  /** Eligible to apply but no line yet */
  canApplyCredit?: boolean
  onFund: () => void
  onPayAtHub: () => void
  onUseCredit?: () => void
  onCheckCredit?: () => void
  onBack: () => void
}

export const InsufficientBalanceStep: React.FC<
  InsufficientBalanceStepProps
> = ({
  shortfallNaira,
  nuban,
  creditAvailable,
  canApplyCredit = false,
  onFund,
  onPayAtHub,
  onUseCredit,
  onCheckCredit,
  onBack,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-[var(--kura-text)]">
          Insufficient balance
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--kura-muted)]">
          You need {formatNaira(shortfallNaira)} more. Fund your wallet
          {creditAvailable ? ', pay on your credit line,' : ''} or book now and
          pay cash at the hub.
        </p>
      </div>

      {nuban ? (
        <div className="rounded-2xl border border-[var(--kura-amber)]/30 bg-[var(--kura-amber)]/10 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--kura-amber)]">
            Virtual account
          </p>
          <p className="mt-1 font-mono text-xl font-bold tracking-wider text-[var(--kura-text)]">
            {nuban}
          </p>
        </div>
      ) : null}

      <OperatorPrimaryButton tone="amber" onClick={onFund}>
        Fund wallet
      </OperatorPrimaryButton>
      <OperatorPrimaryButton tone="teal" onClick={onPayAtHub}>
        Pay cash at the hub
      </OperatorPrimaryButton>
      {creditAvailable && onUseCredit ? (
        <button
          type="button"
          onClick={onUseCredit}
          className="rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] py-3.5 text-[14px] font-bold text-[var(--kura-text)]"
        >
          Pay with credit line
        </button>
      ) : null}
      {!creditAvailable && canApplyCredit && onCheckCredit ? (
        <OperatorSubtleButton onClick={onCheckCredit}>
          Check credit eligibility →
        </OperatorSubtleButton>
      ) : null}
      <OperatorSubtleButton color="gray" onClick={onBack}>
        Choose another hub
      </OperatorSubtleButton>
    </div>
  )
}
