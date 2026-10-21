import React, { useEffect, useState } from 'react'
import { ArrowLeft01Icon } from 'hugeicons-react'
import { HoldFillButton } from '../../../shared/components/operator/HoldFillButton'
import { OperatorDiscountCodeField } from '../../../shared/components/operator/OperatorDiscountCodeField'
import { formatNaira } from '../../../shared/utils/currency'
import type { DiscountRedeemOk } from '../../../shared/utils/discountRedeem'
import type { BookingPaymentMode } from '../../../shared/session/operatorTypes'

interface SummaryRow {
  label: string
  value: string
}

interface ConfirmReserveStepProps {
  rows: SummaryRow[]
  coveredByPlan: boolean
  listPriceNaira: number
  paymentMode: BookingPaymentMode
  onPaymentModeChange: (mode: BookingPaymentMode) => void
  /** Active swap-credit line (loan drawn / available to spend) */
  creditAvailable: boolean
  /** Score/KYC band — can apply for credit even if no active line */
  creditEligible?: boolean
  walletBalanceNaira: number
  vehicleCount: number
  onConfirm: (dueNaira: number, discount: DiscountRedeemOk | null) => void
  onBack: () => void
  confirmBusy?: boolean
}

const MODES: Array<{
  id: BookingPaymentMode
  label: string
  hint: string
  needsCredit?: boolean
  needsWallet?: boolean
}> = [
  { id: 'WALLET', label: 'Wallet', hint: 'Held now, paid at swap', needsWallet: true },
  { id: 'CREDIT', label: 'Credit', hint: 'Draw on confirm', needsCredit: true },
  { id: 'CASH_AT_HUB', label: 'Cash at hub', hint: 'Pay at the bay' },
]

export const ConfirmReserveStep: React.FC<ConfirmReserveStepProps> = ({
  rows,
  coveredByPlan,
  listPriceNaira,
  paymentMode,
  onPaymentModeChange,
  creditAvailable,
  creditEligible = false,
  walletBalanceNaira,
  vehicleCount,
  onConfirm,
  onBack,
  confirmBusy = false,
}) => {
  const [discount, setDiscount] = useState<DiscountRedeemOk | null>(null)

  useEffect(() => {
    setDiscount(null)
  }, [listPriceNaira, coveredByPlan])

  const due = coveredByPlan ? 0 : (discount?.dueNaira ?? listPriceNaira)
  const walletOk = walletBalanceNaira >= due

  const settleHint =
    paymentMode === 'CASH_AT_HUB'
      ? 'No wallet debit now — pay cash when the hub completes your swap.'
      : paymentMode === 'CREDIT'
        ? 'Charges your open credit line — wallet balance stays the same. Daily repay continues as scheduled.'
        : coveredByPlan
          ? 'Covered by your plan — no extra charge.'
          : 'We hold this amount in your wallet now and take it when the hub completes your swap. Cancel and it is released.'

  const paymentRows = coveredByPlan
    ? rows
    : [
        ...rows.filter((r) => r.label !== 'Payment'),
        { label: 'List price', value: formatNaira(listPriceNaira) },
        ...(discount
          ? [
              {
                label: 'Discount',
                value: `${discount.code} · −${formatNaira(discount.discountNaira)}`,
              },
            ]
          : []),
        {
          label: 'Payment',
          value:
            paymentMode === 'CASH_AT_HUB'
              ? `${formatNaira(due)} · cash at hub`
              : paymentMode === 'CREDIT'
                ? `${formatNaira(due)} · credit`
                : `${formatNaira(due)} · wallet`,
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
          Confirm & reserve
        </h2>
        <p className="mt-1 text-xs text-[var(--kura-muted)]">
          15-minute hold. Cancel anytime before pickup.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)]">
        {paymentRows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between border-b border-[var(--kura-border-subtle)] px-4 py-3.5 last:border-b-0"
          >
            <span className="text-[13px] text-[var(--kura-muted)]">
              {row.label}
            </span>
            <span className="max-w-[58%] text-right text-[13px] font-semibold text-[var(--kura-text)]">
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {!coveredByPlan ? (
        <OperatorDiscountCodeField
          listNaira={listPriceNaira}
          context={{
            channel: 'App',
            period: 'swap',
            vehicleCount,
          }}
          applied={discount}
          onApplied={(next) => {
            setDiscount(next)
            if (next && paymentMode === 'WALLET' && walletBalanceNaira < next.dueNaira) {
              onPaymentModeChange(
                creditAvailable ? 'CREDIT' : 'CASH_AT_HUB',
              )
            }
          }}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-[var(--kura-border)] px-3.5 py-3 text-[12px] leading-relaxed text-[var(--kura-muted)]">
          Included in your plan — no swap fee, so a discount code isn’t used here. Use a code when
          you renew or buy a plan, or on pay-per-swap.
        </p>
      )}

      {!coveredByPlan ? (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--kura-muted)]">
            How you pay
          </p>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((m) => {
              const disabled =
                (m.needsCredit && !creditAvailable) ||
                (m.needsWallet && !walletOk)
              const selected = paymentMode === m.id && !disabled
              const hint = disabled
                ? m.needsCredit
                  ? creditEligible
                    ? 'Apply for credit'
                    : 'Not eligible'
                  : 'Low balance'
                : m.hint
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={disabled}
                  aria-disabled={disabled}
                  onClick={() => {
                    if (disabled) return
                    onPaymentModeChange(m.id)
                  }}
                  className={`rounded-xl border px-2 py-2.5 text-left transition ${
                    selected
                      ? 'border-[var(--kura-teal)] bg-[var(--kura-teal)]/10'
                      : 'border-[var(--kura-border)] bg-[var(--kura-bg-elevated)]'
                  } ${disabled ? 'cursor-not-allowed opacity-45' : ''}`}
                >
                  <span className="block text-[12px] font-bold text-[var(--kura-text)]">
                    {m.label}
                  </span>
                  <span
                    className={`mt-0.5 block text-[10px] ${
                      disabled
                        ? 'font-semibold text-[var(--kura-muted)]'
                        : 'text-[var(--kura-muted)]'
                    }`}
                  >
                    {hint}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <p className="text-[12px] leading-relaxed text-[var(--kura-muted)]">
        {settleHint}
      </p>

      <HoldFillButton
        onComplete={() => onConfirm(due, discount)}
        hint="Hold to reserve"
        disabled={confirmBusy}
      >
        {confirmBusy ? 'Reserving…' : 'Confirm reservation'}
      </HoldFillButton>
    </div>
  )
}
