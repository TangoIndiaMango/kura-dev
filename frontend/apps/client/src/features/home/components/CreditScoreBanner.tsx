import React from 'react'
import { formatNaira } from '@shared/utils/currency'
import {
  creditUiPresentation,
  resolveCreditUiState,
  type CreditUiState,
} from '@shared/session'

interface CreditScoreBannerProps {
  score: number
  limitNaira: number
  loanActive: boolean
  kycVerified: boolean
  principalNaira?: number
  dailyDebitNaira?: number
  visible?: boolean
  onOpenCredit: () => void
}

/** Semicircle credit-score speedometer for Home. */
export function CreditScoreBanner({
  score,
  limitNaira,
  loanActive,
  kycVerified,
  principalNaira,
  dailyDebitNaira,
  visible = true,
  onOpenCredit,
}: CreditScoreBannerProps) {
  if (!visible) return null

  const state: CreditUiState = resolveCreditUiState({
    score,
    kycVerified,
    loanActive,
  })
  const ui = creditUiPresentation(state, {
    score,
    limitNaira,
    principalNaira,
    dailyDebitNaira,
  })
  const clamped = Math.max(0, Math.min(100, score))

  const r = 54
  const cx = 70
  const cy = 62
  const trackLen = Math.PI * r
  const fillLen = (clamped / 100) * trackLen

  const blurb =
    state === 'drawn' && dailyDebitNaira != null
      ? `${formatNaira(principalNaira ?? 0)} left · ${formatNaira(dailyDebitNaira)}/day from wallet`
      : ui.blurb

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div className="relative h-[72px] w-[140px] shrink-0">
          <svg viewBox="0 0 140 78" className="h-full w-full" aria-hidden>
            <path
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
              fill="none"
              stroke="var(--kura-border)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
              fill="none"
              stroke={ui.gaugeColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${fillLen} ${trackLen}`}
              className="transition-[stroke-dasharray] duration-500"
            />
          </svg>
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
            <span className="text-[22px] font-extrabold leading-none tabular-nums text-[var(--kura-text)]">
              {clamped}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--kura-muted)]">
              Score
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-bold text-[var(--kura-text)]">
              KURA credit
            </p>
            <span
              className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{
                color: ui.chipColor,
                background: `color-mix(in srgb, ${ui.chipColor} 16%, transparent)`,
              }}
            >
              {ui.chip}
            </span>
          </div>
          <p className="mt-1 text-[12px] leading-snug text-[var(--kura-muted)]">
            {blurb}
          </p>
          <button
            type="button"
            onClick={onOpenCredit}
            className="mt-2 text-[12px] font-bold text-[var(--kura-teal-bright)]"
          >
            {ui.cta} →
          </button>
        </div>
      </div>
    </section>
  )
}
