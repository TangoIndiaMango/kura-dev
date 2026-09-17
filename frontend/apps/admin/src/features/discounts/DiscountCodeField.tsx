import { useState } from 'react'
import { Button, TextInput } from '@mantine/core'
import { formatNaira } from '@shared/utils/currency'
import {
  redeemDiscountCode,
  type DiscountRedeemContext,
  type DiscountRedeemOk,
} from './discountRedeem'

type Props = {
  listNaira: number
  context: DiscountRedeemContext
  applied: DiscountRedeemOk | null
  onApplied: (next: DiscountRedeemOk | null) => void
  /** Hide when plan covers the charge (due 0). */
  disabled?: boolean
}

/** Enter + confirm only — never auto-applies from CRM grant. Hidden when list due is 0 (plan). */
export function DiscountCodeField({
  listNaira,
  context,
  applied,
  onApplied,
  disabled,
}: Props) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (disabled || listNaira <= 0) return null

  if (applied) {
    return (
      <div className="mt-3 rounded-[10px] border border-[#1E8E4E]/35 bg-[var(--in)] px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[13px] font-bold text-[var(--tx)]">
              Code {applied.code} confirmed
            </p>
            <p className="mt-1 text-[12.5px] text-[var(--mu)]">
              List {formatNaira(applied.listNaira)} · save {formatNaira(applied.discountNaira)} (
              {applied.valueLabel}) · due{' '}
              <span className="font-semibold text-[var(--tx)]">
                {formatNaira(applied.dueNaira)}
              </span>
            </p>
          </div>
          <Button
            variant="subtle"
            size="compact-sm"
            onClick={() => {
              onApplied(null)
              setDraft('')
              setError(null)
            }}
          >
            Remove
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-[10px] border border-[var(--bd)] bg-[var(--in)] px-3 py-3">
      <p className="text-[12.5px] font-semibold text-[var(--tx)]">Discount code</p>
      <p className="mt-0.5 text-[11.5px] text-[var(--mu)]">
        Rider must give the code. Enter and confirm — nothing applies automatically.
      </p>
      <div className="mt-2 flex gap-2">
        <TextInput
          className="flex-1"
          placeholder="e.g. SWAP-10"
          value={draft}
          onChange={(e) => {
            setDraft(e.currentTarget.value.toUpperCase())
            setError(null)
          }}
          error={error ?? undefined}
          styles={{ input: { textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace' } }}
        />
        <Button
          color="brand"
          variant="light"
          onClick={() => {
            const result = redeemDiscountCode(draft, listNaira, context)
            if (!result.ok) {
              setError(result.reason)
              return
            }
            setError(null)
            onApplied(result)
          }}
        >
          Confirm
        </Button>
      </div>
    </div>
  )
}
