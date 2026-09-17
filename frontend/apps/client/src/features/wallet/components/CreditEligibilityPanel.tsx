import React from 'react'
import { ArrowLeft01Icon } from 'hugeicons-react'
import {
  CREDIT_SCORE_THRESHOLD,
} from '@shared/session'
import { OperatorPrimaryButton } from '@shared/components/operator/OperatorPrimaryButton'
import type { CreditProgressApi } from '../hooks/use-operator-credit'

interface CreditEligibilityPanelProps {
  score: number
  threshold?: number
  kycVerified: boolean
  loanActive: boolean
  progress: CreditProgressApi
  onBack: () => void
  onContinue?: () => void
}

export function CreditEligibilityPanel({
  score,
  threshold = CREDIT_SCORE_THRESHOLD,
  kycVerified,
  loanActive,
  progress,
  onBack,
  onContinue,
}: CreditEligibilityPanelProps) {
  const scoreOk = score >= threshold
  const daysReq = progress.active_days_required
  const onTimeReq = progress.on_time_required_pct
  const tenureOk = progress.active_days >= daysReq
  const onTimeOk = progress.on_time_pct >= onTimeReq
  const canApply =
    scoreOk && kycVerified && !loanActive && tenureOk && onTimeOk

  const checks = [
    {
      id: 'score',
      label: `Credit score ${threshold}+`,
      ok: scoreOk,
      detail: scoreOk
        ? `Your score is ${score}`
        : `Yours is ${score} — keep swapping and paying on time`,
    },
    {
      id: 'tenure',
      label: `${daysReq}+ days active`,
      ok: tenureOk,
      detail: tenureOk
        ? `${progress.active_days} days on KURA`
        : `${progress.active_days} days so far · build history`,
    },
    {
      id: 'ontime',
      label: `${onTimeReq}%+ on-time payments`,
      ok: onTimeOk,
      detail: onTimeOk
        ? `${progress.on_time_pct}% on-time`
        : `${progress.on_time_pct}% on-time · from your swap history`,
    },
    {
      id: 'kyc',
      label: 'Identity verified',
      ok: kycVerified,
      detail: kycVerified
        ? 'KYC complete'
        : 'Finish ID verification in Account',
    },
    {
      id: 'loan',
      label: 'No active credit line',
      ok: !loanActive,
      detail: loanActive
        ? 'Repay or finish your current line first'
        : 'Ready for a new draw',
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 self-start text-sm text-[var(--kura-muted)]"
      >
        <ArrowLeft01Icon size={16} />
        Back
      </button>

      <div>
        <h2 className="text-lg font-bold text-[var(--kura-text)]">
          Credit eligibility
        </h2>
        <p className="mt-1 text-xs text-[var(--kura-muted)]">
          Working capital unlocks when these gates clear.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)]">
        {checks.map((c) => (
          <div
            key={c.id}
            className="flex items-start gap-3 border-b border-[var(--kura-border-subtle)] px-4 py-3.5 last:border-b-0"
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
                c.ok
                  ? 'bg-[var(--kura-green)]/20 text-[var(--kura-green)]'
                  : 'bg-[var(--kura-amber)]/20 text-[var(--kura-amber)]'
              }`}
            >
              {c.ok ? '✓' : '!'}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[var(--kura-text)]">
                {c.label}
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--kura-muted)]">
                {c.detail}
              </p>
            </div>
          </div>
        ))}
      </div>

      {canApply && onContinue ? (
        <OperatorPrimaryButton onClick={onContinue}>
          Continue to apply
        </OperatorPrimaryButton>
      ) : null}
    </div>
  )
}
