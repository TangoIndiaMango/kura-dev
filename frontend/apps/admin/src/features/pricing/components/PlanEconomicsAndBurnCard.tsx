import type { PlanRecord } from '@shared/mock/adminMockData'
import { formatNaira } from '@shared/utils/currency'

interface PlanEconomicsAndBurnCardProps {
  plan: PlanRecord
}

/** Live catalogue facts only — no synthetic revenue charts. */
export function PlanEconomicsAndBurnCard({ plan }: PlanEconomicsAndBurnCardProps) {
  const period =
    plan.period === 'swap'
      ? 'per swap'
      : plan.period === 'day'
        ? 'per day'
        : plan.period === 'week'
          ? 'per week'
          : 'per month'
  const allowance =
    plan.swapAllowance === 'unlimited'
      ? 'Unlimited swaps'
      : `${plan.swapAllowance} swaps / period`

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4">
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
          List price
        </p>
        <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--tx)]">
          {formatNaira(plan.price)}
        </p>
        <p className="mt-1 text-[12px] text-[var(--mu)]">{period}</p>
      </div>
      <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4">
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
          Active subscribers
        </p>
        <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--tx)]">
          {plan.subscribers.toLocaleString()}
        </p>
        <p className="mt-1 text-[12px] text-[var(--mu)]">Live count for this plan</p>
      </div>
      <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4">
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
          Allowance
        </p>
        <p className="mt-1 text-[18px] font-bold text-[var(--tx)]">{allowance}</p>
        <p className="mt-1 text-[12px] text-[var(--mu)]">{plan.durationLabel}</p>
      </div>
    </div>
  )
}
