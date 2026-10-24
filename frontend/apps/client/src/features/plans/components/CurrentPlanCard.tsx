import React from 'react'
import { formatNaira } from '../../../shared/utils/currency'

interface CurrentPlanCardProps {
  name: string
  status: string
  expires: string
  daysLeft: string
  autoRenew: boolean
  /** Omitted while plans renew manually (each renewal is paid with Paystack). */
  onToggleAutoRenew?: () => void
  showRenew?: boolean
  onRenew?: () => void
  /** Pay-per-swap / no subscription */
  payPerSwap?: boolean
  /** Live PPS list price in Naira (from catalogue / matrix). */
  payPerSwapNaira?: number
}

export const CurrentPlanCard: React.FC<CurrentPlanCardProps> = ({
  name,
  status,
  expires,
  daysLeft,
  autoRenew,
  onToggleAutoRenew,
  showRenew = false,
  onRenew,
  payPerSwap = false,
  payPerSwapNaira,
}) => {
  const urgent = status === 'Expiring' || status === 'Expired'

  if (payPerSwap) {
    const ppsLabel =
      payPerSwapNaira != null ? formatNaira(payPerSwapNaira) : 'Pay per swap'
    return (
      <section className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4 py-3.5">
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-[var(--kura-text)]">
            Pay-per-swap
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--kura-muted)]">
            {ppsLabel}
            {payPerSwapNaira != null ? ' / swap' : ''}
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-bold text-[var(--kura-muted)]">
          Current
        </span>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-[var(--kura-text)]">{name}</p>
          <p className="mt-0.5 text-[12px] text-[var(--kura-muted)]">
            {expires} · {daysLeft}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${
            urgent
              ? 'bg-[var(--kura-amber)]/15 text-[var(--kura-amber)]'
              : 'bg-[var(--kura-teal)]/20 text-[var(--kura-teal-bright)]'
          }`}
        >
          {status}
        </span>
      </div>

      {onToggleAutoRenew ? (
        <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-[var(--kura-border-subtle)] pt-3.5">
          <span className="text-[13px] font-bold text-[var(--kura-text)]">
            Auto-renew
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={autoRenew}
            aria-label="Auto-renew"
            onClick={onToggleAutoRenew}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              autoRenew ? 'bg-[var(--kura-teal)]' : 'bg-white/20'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                autoRenew ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      ) : null}

      {showRenew && onRenew ? (
        <button
          type="button"
          onClick={onRenew}
          className="mt-3 w-full rounded-xl bg-[var(--kura-amber)] py-3 text-[13px] font-extrabold text-[#1a1204]"
        >
          Renew now
        </button>
      ) : null}
    </section>
  )
}
