import React from 'react'
import { formatNaira } from '../../../shared/utils/currency'

interface ActiveLoanBannerProps {
  principalNaira: number
  daysLeft: number
  dailyDebitNaira: number
  onRepay: () => void
  onViewSchedule?: () => void
}

export const ActiveLoanBanner: React.FC<ActiveLoanBannerProps> = ({
  principalNaira,
  daysLeft,
  dailyDebitNaira,
  onRepay,
  onViewSchedule,
}) => {
  return (
    <section className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--kura-amber)]/15 px-4 py-3.5">
      <button
        type="button"
        onClick={onViewSchedule ?? onRepay}
        className="flex min-w-0 flex-col gap-0.5 text-left"
      >
        <span className="text-[12px] text-[var(--kura-muted)]">Active loan</span>
        <span className="text-[15px] font-bold text-[var(--kura-text)]">
          {formatNaira(principalNaira)} · {daysLeft} days left
        </span>
        <span className="text-[12px] text-[var(--kura-muted)]">
          {formatNaira(dailyDebitNaira)} auto-debited daily from wallet
        </span>
      </button>
      <button
        type="button"
        onClick={onViewSchedule ?? onRepay}
        className="shrink-0 rounded-lg bg-[var(--kura-amber)] px-3 py-2 text-xs font-bold text-[#003153]"
      >
        View repayment
      </button>
    </section>
  )
}
