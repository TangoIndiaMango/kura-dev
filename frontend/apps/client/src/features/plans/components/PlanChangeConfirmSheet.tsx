import React, { useEffect, useState } from 'react'
import { HoldFillButton } from '../../../shared/components/operator/HoldFillButton'
import { OperatorPrimaryButton } from '../../../shared/components/operator/OperatorPrimaryButton'
import { OperatorSubtleButton } from '../../../shared/components/operator/OperatorSubtleButton'
import { OperatorDiscountCodeField } from '../../../shared/components/operator/OperatorDiscountCodeField'
import { PinDigitInputs } from '../../../shared/components/operator/PinDigitInputs'
import { formatNaira } from '../../../shared/utils/currency'
import type { DiscountRedeemOk } from '../../../shared/utils/discountRedeem'
import { OperatorSheet } from './OperatorSheet'
import {
  changeConfirmCopy,
  changeKindLabel,
  type PlanCatalogItem,
  type PlanChangeKind,
} from '../planCatalog'

export type PlanConfirmPayload = {
  dueNaira: number
  discount: DiscountRedeemOk | null
  pin: string
}

interface PlanChangeConfirmSheetProps {
  opened: boolean
  kind: PlanChangeKind
  target: PlanCatalogItem
  vehicleLabel: string
  vehicleCount: number
  grantedDiscountId?: string | null
  /** Server preview message (live switch) */
  previewMessage?: string | null
  /** Override list/due from switch-preview (kobo→naira already) */
  previewDueNaira?: number | null
  previewListNaira?: number | null
  pinRequired?: boolean
  busy?: boolean
  error?: string | null
  onClose: () => void
  onConfirm: (payload: PlanConfirmPayload) => void
}

function periodForOption(id: string): 'daily' | 'weekly' | 'monthly' | 'swap' {
  if (id === 'daily') return 'daily'
  if (id === 'weekly') return 'weekly'
  if (id === 'monthly') return 'monthly'
  return 'swap'
}

export const PlanChangeConfirmSheet: React.FC<PlanChangeConfirmSheetProps> = ({
  opened,
  kind,
  target,
  vehicleLabel,
  vehicleCount,
  grantedDiscountId,
  previewMessage,
  previewDueNaira,
  previewListNaira,
  pinRequired = false,
  busy = false,
  error = null,
  onClose,
  onConfirm,
}) => {
  const copy = changeConfirmCopy({ kind, target, vehicleLabel })
  const isCurrent = kind === 'current'
  const useHold = kind === 'upgrade' || kind === 'downgrade' || kind === 'renew'
  const chargeable =
    !isCurrent &&
    target.id !== 'pps' &&
    (previewDueNaira == null ? true : previewDueNaira > 0)
  const needsPin = Boolean(pinRequired && chargeable)
  const [discount, setDiscount] = useState<DiscountRedeemOk | null>(null)
  const [pinDigits, setPinDigits] = useState(['', '', '', ''])

  useEffect(() => {
    if (!opened) {
      setDiscount(null)
      setPinDigits(['', '', '', ''])
    }
  }, [opened, target.id, kind])

  const listNaira = previewListNaira ?? target.priceNaira
  const due =
    previewDueNaira != null
      ? previewDueNaira
      : (discount?.dueNaira ?? target.priceNaira)
  const pin = pinDigits.join('')
  const pinReady = !needsPin || pin.length === 4

  const submit = () => {
    if (busy || !pinReady) return
    onConfirm({ dueNaira: due, discount, pin })
  }

  return (
    <OperatorSheet opened={opened} title={changeKindLabel(kind)} onClose={onClose}>
      <h3 className="text-[17px] font-extrabold text-[var(--kura-text)]">
        {copy.title}
      </h3>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--kura-muted)]">
        {previewMessage || copy.body}
      </p>

      <ul className="mt-4 flex flex-col gap-1.5 rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-3.5 py-3">
        {target.highlights.map((h) => (
          <li key={h} className="text-[12px] font-medium text-[var(--kura-text)]">
            · {h}
          </li>
        ))}
      </ul>

      {chargeable ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-3.5 py-3">
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--kura-muted)]">List price</span>
              <span className="font-semibold text-[var(--kura-text)]">
                {formatNaira(listNaira)}
              </span>
            </div>
            {discount && previewDueNaira == null ? (
              <div className="mt-1.5 flex justify-between text-[13px]">
                <span className="text-[var(--kura-muted)]">Discount · {discount.code}</span>
                <span className="font-semibold text-[var(--kura-teal-bright)]">
                  −{formatNaira(discount.discountNaira)}
                </span>
              </div>
            ) : null}
            <div className="mt-1.5 flex justify-between border-t border-[var(--kura-border-subtle)] pt-1.5 text-[14px]">
              <span className="font-bold text-[var(--kura-text)]">Due now</span>
              <span className="font-extrabold text-[var(--kura-text)]">
                {formatNaira(due)}
              </span>
            </div>
          </div>

          {previewDueNaira == null ? (
            <OperatorDiscountCodeField
              listNaira={listNaira}
              context={{
                channel: 'App',
                period: periodForOption(target.id),
                planOptionId: target.id,
                vehicleCount,
              }}
              applied={discount}
              onApplied={setDiscount}
            />
          ) : null}
        </div>
      ) : null}

      {needsPin ? (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-[12px] font-bold text-[var(--kura-muted)]">
            Enter wallet PIN
          </p>
          <PinDigitInputs
            values={pinDigits}
            onChange={setPinDigits}
            masked
            autoFocus
            error={Boolean(error)}
            disabled={busy}
          />
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-[12px] font-semibold text-[var(--kura-coral)]">{error}</p>
      ) : null}

      <div className="mt-5 flex flex-col gap-2.5">
        {isCurrent ? (
          <OperatorPrimaryButton onClick={onClose}>OK</OperatorPrimaryButton>
        ) : useHold ? (
          <HoldFillButton
            disabled={busy || !pinReady}
            onComplete={submit}
            hint={busy ? 'Working…' : 'Hold to confirm'}
            tone={kind === 'downgrade' ? 'amber' : 'teal'}
          >
            {chargeable ? `Pay ${formatNaira(due)}` : copy.confirmLabel}
          </HoldFillButton>
        ) : (
          <OperatorPrimaryButton disabled={busy || !pinReady} onClick={submit}>
            {busy
              ? 'Working…'
              : chargeable
                ? `Pay ${formatNaira(due)}`
                : copy.confirmLabel}
          </OperatorPrimaryButton>
        )}
        {!isCurrent ? (
          <OperatorSubtleButton color="gray" disabled={busy} onClick={onClose}>
            Cancel
          </OperatorSubtleButton>
        ) : null}
      </div>
    </OperatorSheet>
  )
}
