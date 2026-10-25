import React, { useEffect, useState } from 'react'
import { formatNaira } from '../../../shared/utils/currency'
import { OperatorPrimaryButton } from '../../../shared/components/operator/OperatorPrimaryButton'
import { HoldFillButton } from '../../../shared/components/operator/HoldFillButton'
import { nowMs } from '../../../shared/time/serverClock'
import { ReservationQr } from './ReservationQr'

interface ReservationCodeStepProps {
  code: string
  hubName: string
  holdMinutes: number
  expiresAtMs?: number
  qrPayload?: string | null
  paymentHint?: string
  cancelBusy?: boolean
  onDone: () => void
  onCancel: () => void
  onRebook?: () => void
  onBookAnotherVehicle?: () => void
  /** Paystack booking not paid yet: no valid code/QR — pay to confirm. */
  awaitingPayment?: { amountNaira: number | null; onPay: () => void; busy: boolean }
  /** Paid with Paystack: cancelling means a refund (after review). */
  paid?: boolean
}

export const ReservationCodeStep: React.FC<ReservationCodeStepProps> = ({
  code,
  hubName,
  holdMinutes,
  expiresAtMs,
  qrPayload,
  paymentHint,
  cancelBusy = false,
  onDone,
  onCancel,
  onRebook,
  onBookAnotherVehicle,
  awaitingPayment,
  paid = false,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (expiresAtMs) {
      return Math.max(0, Math.ceil((expiresAtMs - nowMs()) / 1000))
    }
    return holdMinutes * 60
  })

  useEffect(() => {
    const tick = () => {
      if (expiresAtMs) {
        setSecondsLeft(Math.max(0, Math.ceil((expiresAtMs - nowMs()) / 1000)))
        return
      }
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [expiresAtMs])

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const clock = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  const expired = secondsLeft <= 0

  if (awaitingPayment && !expired) {
    const amount = awaitingPayment.amountNaira != null ? formatNaira(awaitingPayment.amountNaira) : null
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-bold text-[var(--kura-text)]">Pay to confirm your booking</h2>
          <p className="mt-1 text-xs text-[var(--kura-muted)]">
            Your battery at <span className="font-semibold text-[var(--kura-text)]">{hubName}</span> is held
            while you pay. Your code appears once Paystack confirms.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4 py-8">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--kura-amber)]">
            Pay within · {clock}
          </span>
          {amount ? <span className="text-4xl font-extrabold text-[var(--kura-text)]">{amount}</span> : null}
          <span className="text-[11px] text-[var(--kura-muted)]">Card, bank transfer or USSD</span>
        </div>
        <OperatorPrimaryButton onClick={awaitingPayment.onPay} disabled={awaitingPayment.busy}>
          {awaitingPayment.busy ? 'Opening Paystack…' : amount ? `Pay ${amount} with Paystack` : 'Pay with Paystack'}
        </OperatorPrimaryButton>
        <HoldFillButton tone="danger" durationMs={1100} onComplete={onCancel} hint="Hold to cancel" disabled={cancelBusy}>
          {cancelBusy ? 'Cancelling…' : 'Cancel booking'}
        </HoldFillButton>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold text-[var(--kura-text)]">Reservation code</h2>
        <p className="mt-1 text-xs text-[var(--kura-muted)]">
          Show this at <span className="font-semibold text-[var(--kura-text)]">{hubName}</span>.
          {paymentHint ? (
            <>
              {' '}
              <span className="font-medium text-[var(--kura-text)]">{paymentHint}.</span>
            </>
          ) : null}
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4 py-8">
        <span
          className={`text-[11px] font-bold uppercase tracking-[0.14em] ${
            expired ? 'text-[var(--kura-coral)]' : 'text-[var(--kura-amber)]'
          }`}
        >
          {expired ? 'Expired' : `Hold · ${clock}`}
        </span>
        <span className="text-4xl font-extrabold tracking-[0.18em] text-[var(--kura-text)]">
          {code}
        </span>
        <div
          className={`mt-1 ${expired ? 'opacity-40 grayscale' : ''}`}
          aria-hidden={expired}
        >
          <ReservationQr
            code={code}
            payload={qrPayload}
            size={168}
          />
        </div>
        <p className="max-w-[240px] text-center text-[11px] leading-relaxed text-[var(--kura-muted)]">
          {expired
            ? 'This hold lapsed. Book again for a fresh code.'
            : 'Valid for this hub until the timer ends'}
        </p>
      </div>

      {expired && onRebook ? (
        <OperatorPrimaryButton onClick={onRebook}>Book again</OperatorPrimaryButton>
      ) : (
        <OperatorPrimaryButton onClick={onDone}>Back to swaps</OperatorPrimaryButton>
      )}
      {expired && onRebook ? (
        <button
          type="button"
          onClick={onDone}
          className="w-full rounded-xl border border-[var(--kura-border)] py-3.5 text-[14px] font-bold text-[var(--kura-text)]"
        >
          Back to swaps
        </button>
      ) : null}
      {onBookAnotherVehicle ? (
        <button
          type="button"
          onClick={onBookAnotherVehicle}
          className="w-full rounded-xl border border-[var(--kura-border)] py-3.5 text-[14px] font-bold text-[var(--kura-text)]"
        >
          Book another vehicle
        </button>
      ) : null}
      <HoldFillButton
        tone="danger"
        durationMs={1100}
        onComplete={onCancel}
        hint="Hold to cancel"
        disabled={expired || cancelBusy}
      >
        {cancelBusy ? 'Cancelling…' : paid ? 'Cancel & get a refund' : 'Cancel reservation'}
      </HoldFillButton>
      {paid ? (
        <p className="text-center text-[11px] leading-relaxed text-[var(--kura-muted)]">
          Cancelled or not used in time, your payment is refunded to how you paid once our team confirms it.
        </p>
      ) : null}
    </div>
  )
}
