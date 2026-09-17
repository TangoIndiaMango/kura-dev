import React, { useState } from 'react'
import {
  redeemDiscountCode,
  type DiscountRedeemContext,
  type DiscountRedeemOk,
} from '../../utils/discountRedeem'
import { formatNaira } from '../../utils/currency'

type Props = {
  listNaira: number
  context: DiscountRedeemContext
  applied: DiscountRedeemOk | null
  onApplied: (next: DiscountRedeemOk | null) => void
}

export const OperatorDiscountCodeField: React.FC<Props> = ({
  listNaira,
  context,
  applied,
  onApplied,
}) => {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (applied) {
    return (
      <div className="rounded-xl border border-[var(--kura-teal)]/40 bg-[var(--kura-teal)]/10 px-3.5 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[13px] font-bold text-[var(--kura-text)]">
              {applied.code} applied
            </p>
            <p className="mt-1 text-[12px] text-[var(--kura-muted)]">
              List {formatNaira(applied.listNaira)} · save{' '}
              {formatNaira(applied.discountNaira)} · pay{' '}
              <span className="font-semibold text-[var(--kura-text)]">
                {formatNaira(applied.dueNaira)}
              </span>
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 text-[12px] font-bold text-[var(--kura-muted)]"
            onClick={() => {
              onApplied(null)
              setDraft('')
              setError(null)
            }}
          >
            Remove
          </button>
        </div>
      </div>
    )
  }

  const apply = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await redeemDiscountCode(draft, listNaira, context)
      if (!result.ok) {
        setError(result.reason)
        return
      }
      onApplied(result)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-3.5 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--kura-muted)]">
        Discount code
      </p>
      <p className="mt-1 text-[12px] text-[var(--kura-muted)]">
        Enter the code from your email or SMS, then confirm.
      </p>
      <div className="mt-2.5 flex gap-2">
        <input
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder="e.g. LOYAL-5"
          value={draft}
          disabled={busy}
          onChange={(e) => {
            setDraft(e.target.value.toUpperCase())
            setError(null)
          }}
          className="min-w-0 flex-1 rounded-lg border border-[var(--kura-border)] bg-[var(--kura-bg)] px-3 py-2.5 font-mono text-[13px] font-semibold uppercase text-[var(--kura-text)] outline-none focus:border-[var(--kura-teal)]"
        />
        <button
          type="button"
          disabled={busy || !draft.trim()}
          onClick={() => {
            apply().catch(() => undefined)
          }}
          className="shrink-0 rounded-lg bg-[var(--kura-teal)] px-3.5 py-2.5 text-[12px] font-bold text-white disabled:opacity-50"
        >
          {busy ? '…' : 'Confirm'}
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-[12px] font-medium text-[#C0392B]">{error}</p>
      ) : null}
    </div>
  )
}
