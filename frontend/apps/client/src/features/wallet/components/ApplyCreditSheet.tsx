import React, { useEffect, useState } from 'react'
import { useForm } from '@mantine/form'
import { zodResolver } from 'mantine-form-zod-resolver'
import { z } from 'zod'
import { Cancel01Icon } from 'hugeicons-react'
import { useVerifyPinMutation } from '@lib/api/auth-mutations'
import { apiErrorMessage } from '@lib/api/auth'
import { PinDigitInputs } from '@shared/components/operator/PinDigitInputs'
import { OperatorPrimaryButton } from '@shared/components/operator/OperatorPrimaryButton'
import { formatNaira } from '@shared/utils/currency'
import {
  newCreditIdempotencyKey,
  useApplyCredit,
} from '../hooks/use-operator-credit'

const TENORS = [7, 14, 30] as const

const applySchema = z.object({
  amountNaira: z.number().int().min(5_000).max(50_000),
  tenor_days: z.union([z.literal(7), z.literal(14), z.literal(30)]),
})

type ApplyValues = z.infer<typeof applySchema>

interface ApplyCreditSheetProps {
  opened: boolean
  maxAmountKobo: number
  onClose: () => void
  onApplied?: () => void
}

export function ApplyCreditSheet({
  opened,
  maxAmountKobo,
  onClose,
  onApplied,
}: ApplyCreditSheetProps) {
  const applyMut = useApplyCredit()
  const verifyPin = useVerifyPinMutation()
  const [pinDigits, setPinDigits] = useState(['', '', '', ''])
  const [error, setError] = useState<string | null>(null)

  const maxNaira = Math.max(
    5_000,
    Math.min(50_000, Math.floor(maxAmountKobo / 100) || 50_000),
  )

  const form = useForm<ApplyValues>({
    initialValues: {
      amountNaira: Math.min(20_000, maxNaira),
      tenor_days: 14,
    },
    validate: zodResolver(applySchema),
  })

  useEffect(() => {
    if (!opened) {
      setPinDigits(['', '', '', ''])
      setError(null)
      return
    }
    form.setValues({
      amountNaira: Math.min(20_000, maxNaira),
      tenor_days: 14,
    })
  }, [opened, maxNaira])

  if (!opened) return null

  const pin = pinDigits.join('')
  const busy = applyMut.isPending || verifyPin.isPending
  const pinReady = pin.length === 4

  const submit = async () => {
    const result = form.validate()
    if (result.hasErrors || !pinReady || busy) return
    const amountNaira = form.values.amountNaira
    if (amountNaira > maxNaira) {
      setError(`Max available is ${formatNaira(maxNaira)}`)
      return
    }
    setError(null)
    try {
      const grant = await verifyPin.mutateAsync({ pin })
      await applyMut.mutateAsync({
        amount_kobo: amountNaira * 100,
        tenor_days: form.values.tenor_days,
        idempotency_key: newCreditIdempotencyKey('credit-apply'),
        pin_grant: grant.pin_grant,
      })
      onApplied?.()
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not apply for credit'))
      setPinDigits(['', '', '', ''])
    }
  }

  return (
    <div
      className="fixed inset-0 z-[450] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={() => {
          if (!busy) onClose()
        }}
      />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-[1.5rem] border border-[var(--kura-border)] bg-[var(--kura-bg)] shadow-2xl sm:rounded-[1.5rem]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--kura-border-subtle)] px-4 py-3.5">
          <h2 className="text-[16px] font-bold text-[var(--kura-text)]">
            Apply for credit
          </h2>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl border border-[var(--kura-border)] p-2 text-[var(--kura-muted)]"
          >
            <Cancel01Icon size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4">
          <p className="text-[12px] leading-relaxed text-[var(--kura-muted)]">
            Working capital repaid by daily wallet deduction. Up to{' '}
            {formatNaira(maxNaira)}.
          </p>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--kura-muted)]">
              Amount (₦)
            </span>
            <input
              type="number"
              min={5000}
              max={maxNaira}
              step={1000}
              value={form.values.amountNaira}
              onChange={(e) =>
                form.setFieldValue('amountNaira', Number(e.target.value) || 0)
              }
              className="rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-3 py-3 text-[15px] font-semibold text-[var(--kura-text)]"
            />
            {form.errors.amountNaira ? (
              <span className="text-[11px] text-[var(--kura-coral)]">
                {form.errors.amountNaira}
              </span>
            ) : null}
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--kura-muted)]">
              Tenor
            </span>
            <div className="grid grid-cols-3 gap-2">
              {TENORS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => form.setFieldValue('tenor_days', d)}
                  className={`rounded-xl border px-2 py-2.5 text-[13px] font-bold ${
                    form.values.tenor_days === d
                      ? 'border-[var(--kura-teal)] bg-[var(--kura-teal)]/10 text-[var(--kura-text)]'
                      : 'border-[var(--kura-border)] text-[var(--kura-muted)]'
                  }`}
                >
                  {d} days
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--kura-muted)]">
              Confirm with PIN
            </span>
            <PinDigitInputs
              values={pinDigits}
              onChange={setPinDigits}
              masked
              autoFocus
              disabled={busy}
              error={Boolean(error)}
            />
          </div>

          {error ? (
            <p className="text-[12px] font-semibold text-[var(--kura-coral)]">
              {error}
            </p>
          ) : null}

          <OperatorPrimaryButton
            tone="teal"
            disabled={busy || !pinReady}
            onClick={() => {
              submit()
            }}
          >
            {busy ? 'Applying…' : 'Submit application'}
          </OperatorPrimaryButton>
        </div>
      </div>
    </div>
  )
}
