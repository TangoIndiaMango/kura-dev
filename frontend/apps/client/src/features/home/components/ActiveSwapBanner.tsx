import React, { useEffect, useState } from 'react'
import { QrCodeIcon, ArrowRight01Icon } from 'hugeicons-react'
import type { OperatorActiveReservation } from '../../../shared/session'
import { nowMs } from '../../../shared/time/serverClock'

interface ActiveSwapBannerProps {
  holds: OperatorActiveReservation[]
  onOpen: (holdId: string) => void
}

function formatClock(msLeft: number) {
  const total = Math.max(0, Math.floor(msLeft / 1000))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/** Compact home strip — opens the primary hold’s QR / pass screen. */
export const ActiveSwapBanner: React.FC<ActiveSwapBannerProps> = ({
  holds,
  onOpen,
}) => {
  const [now, setNow] = useState(nowMs)
  const live = holds.filter((h) => h.expiresAt > now)
  const primary = live[0] ?? holds[0]

  useEffect(() => {
    const id = window.setInterval(() => setNow(nowMs()), 1000)
    return () => window.clearInterval(id)
  }, [])

  if (!primary) return null

  const count = live.length
  const msLeft = primary.expiresAt - now
  const expired = msLeft <= 0
  const multi = count > 1

  return (
    <button
      type="button"
      onClick={() => onOpen(primary.id)}
      className="kura-hold-banner group relative w-full overflow-hidden rounded-[1.25rem] border border-white/15 p-[1px] text-left shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
    >
      <div className="kura-hold-shimmer pointer-events-none absolute inset-0 opacity-70" aria-hidden />
      <div className="relative flex items-center gap-3.5 rounded-[1.2rem] bg-gradient-to-br from-[#0a3d4a] via-[#0d7c8f] to-[#003153] px-4 py-4">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-sm">
          <QrCodeIcon size={24} />
          {count > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--kura-amber)] px-1 text-[10px] font-extrabold text-[#1a1204] ring-2 ring-[#0a3d4a]">
              {count > 99 ? '99+' : count}
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
                expired ? 'text-[#ffb4a8]' : 'text-[#ffe4a3]'
              }`}
            >
              {multi
                ? `${count} batteries reserved`
                : expired
                  ? 'Hold expired'
                  : primary.awaitingPayment
                    ? 'Pay to confirm'
                    : 'Battery reserved'}
            </span>
            {!expired && !multi ? (
              <span className="rounded-md bg-black/25 px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums text-white">
                {formatClock(msLeft)}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-[15px] font-extrabold tracking-tight text-white">
            {multi ? 'Open hold & QR' : primary.awaitingPayment ? 'Booking not paid yet' : primary.code}
            {!multi ? (
              <>
                <span className="mx-1.5 font-normal text-white/40">·</span>
                <span className="font-semibold text-white/85">
                  {primary.hubName}
                </span>
              </>
            ) : null}
          </p>
          <p className="mt-0.5 text-[11px] text-white/70">
            {multi
              ? 'Tap to show your soonest QR'
              : expired
                ? 'Tap to rebook or manage'
                : primary.awaitingPayment
                  ? `Pay with Paystack · ${primary.vehicleLabel}`
                  : `Show QR · ${primary.vehicleLabel}`}
          </p>
        </div>
        <ArrowRight01Icon
          size={18}
          className="shrink-0 text-white/80 transition group-active:translate-x-0.5"
        />
      </div>
    </button>
  )
}
