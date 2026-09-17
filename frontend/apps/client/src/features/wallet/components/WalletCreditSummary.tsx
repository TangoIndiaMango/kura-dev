import React from 'react'
import {
  creditUiPresentation,
  resolveCreditUiState,
} from '@shared/session'

interface WalletCreditSummaryProps {
  score: number
  limitNaira: number
  loanActive: boolean
  kycVerified: boolean
  principalNaira?: number
  dailyDebitNaira?: number
  onOpen: () => void
}

/** Compact semicircle score gauge on Wallet. */
export function WalletCreditSummary({
  score,
  limitNaira,
  loanActive,
  kycVerified,
  principalNaira,
  dailyDebitNaira,
  onOpen,
}: WalletCreditSummaryProps) {
  const state = resolveCreditUiState({ score, kycVerified, loanActive })
  const ui = creditUiPresentation(state, {
    score,
    limitNaira,
    principalNaira,
    dailyDebitNaira,
  })
  const clamped = Math.max(0, Math.min(100, score))
  const r = 40
  const cx = 52
  const cy = 48
  const trackLen = Math.PI * r
  const fillLen = (clamped / 100) * trackLen

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-3.5 py-3">
      <div className="flex items-center gap-3">
        <div className="relative h-[56px] w-[104px] shrink-0">
          <svg viewBox="0 0 104 58" className="h-full w-full" aria-hidden>
            <path
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
              fill="none"
              stroke="var(--kura-border)"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
              fill="none"
              stroke={ui.gaugeColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${fillLen} ${trackLen}`}
            />
          </svg>
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
            <span className="text-[18px] font-extrabold leading-none tabular-nums text-[var(--kura-text)]">
              {clamped}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wide text-[var(--kura-muted)]">
              Score
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[13px] font-bold text-[var(--kura-text)]">
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
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--kura-muted)]">
            {ui.blurb}
          </p>
          <button
            type="button"
            onClick={onOpen}
            className="mt-1.5 text-[12px] font-bold text-[var(--kura-teal-bright)]"
          >
            {ui.cta} →
          </button>
        </div>
      </div>
    </section>
  )
}
