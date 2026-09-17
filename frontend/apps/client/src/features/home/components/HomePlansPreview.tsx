import React from 'react'

interface PlanPreview {
  id: string
  vehicle: string
  vehicleId?: string
  subtitle: string
  status: 'Active' | 'Expiring' | 'Expired'
  daysLeft: number
  progress: number
  progressLabel: string
  expiresLabel: string
  renewHint: string
  autoRenew: boolean
  planOptionId?: string
}

interface HomePlansPreviewProps {
  plans: PlanPreview[]
  onManage: () => void
  onRenew: (planId: string) => void
}

function needsRenewCta(plan: PlanPreview) {
  if (plan.status === 'Expiring' || plan.status === 'Expired') return true
  if (!plan.autoRenew && plan.daysLeft <= 7) return true
  return false
}

/** Parse "3 of 7 swaps left" from subtitle when present. */
function swapsRemaining(subtitle: string): { left: number; total: number } | null {
  const m = subtitle.match(/(\d+)\s+of\s+(\d+)\s+swaps?/i)
  if (!m) return null
  return { left: Number(m[1]), total: Number(m[2]) }
}

function barProgress(plan: PlanPreview) {
  const swaps = swapsRemaining(plan.subtitle)
  if (swaps && swaps.total > 0) {
    return Math.min(1, Math.max(0, swaps.left / swaps.total))
  }
  return plan.progress
}

function barLabel(plan: PlanPreview) {
  const swaps = swapsRemaining(plan.subtitle)
  if (swaps) return `${swaps.left} of ${swaps.total} swaps`
  return plan.progressLabel
}

export const HomePlansPreview: React.FC<HomePlansPreviewProps> = ({
  plans,
  onManage,
  onRenew,
}) => {
  const urgentCount = plans.filter(needsRenewCta).length
  const preview =
    plans.length > 2
      ? [...plans].sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 2)
      : plans

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-0.5">
        <h2 className="text-[15px] font-bold text-[var(--kura-text)]">
          Your plans
        </h2>
        <button
          type="button"
          onClick={onManage}
          className="text-[13px] font-bold text-[var(--kura-teal-bright)]"
        >
          {plans.length > 2 ? `Manage · ${plans.length}` : 'Manage'}
        </button>
      </div>

      {plans.length > 2 && urgentCount > 0 ? (
        <p className="px-0.5 text-[12px] font-medium text-[var(--kura-amber)]">
          {urgentCount} plan{urgentCount === 1 ? '' : 's'} need attention
        </p>
      ) : null}

      <div className="flex flex-col gap-2.5">
        {preview.map((plan) => {
          const expiring =
            plan.status === 'Expiring' || plan.status === 'Expired'
          const showRenew = needsRenewCta(plan)
          const fill = barProgress(plan)
          return (
            <div
              key={plan.id}
              className="kura-screen-enter rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[14px] font-bold text-[var(--kura-text)]">
                    {plan.vehicle}
                  </span>
                  <span className="text-[12px] text-[var(--kura-muted)]">
                    {plan.subtitle}
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                    expiring
                      ? 'bg-[var(--kura-amber)]/15 text-[var(--kura-amber)]'
                      : 'bg-[var(--kura-green)]/15 text-[var(--kura-green)]'
                  }`}
                >
                  {plan.status}
                </span>
              </div>

              <div className="mt-3.5">
                <div className="mb-1.5 flex items-center justify-between text-[12px] text-[var(--kura-muted)]">
                  <span>{plan.expiresLabel}</span>
                  <span className="font-semibold text-[var(--kura-text)]/80">
                    {barLabel(plan)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--kura-border)]">
                  <div
                    className={`kura-plan-fill h-full rounded-full ${
                      expiring
                        ? 'bg-[var(--kura-amber)]'
                        : 'bg-[var(--kura-teal)]'
                    }`}
                    style={{
                      width: `${
                        fill <= 0 ? 0 : Math.min(100, Math.max(2, fill * 100))
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-3.5 flex items-center justify-between border-t border-[var(--kura-border-subtle)] pt-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[13px] font-bold text-[var(--kura-text)]">
                    Auto-renew
                  </span>
                  <span className="truncate text-[12px] text-[var(--kura-muted)]">
                    {plan.autoRenew ? 'On' : 'Off'} · {plan.renewHint}
                  </span>
                </div>
                {showRenew ? (
                  <button
                    type="button"
                    onClick={() => onRenew(plan.id)}
                    className="shrink-0 rounded-lg bg-[var(--kura-amber)] px-3 py-1.5 text-xs font-extrabold text-[#1a1204] transition active:scale-95"
                  >
                    Renew
                  </button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
