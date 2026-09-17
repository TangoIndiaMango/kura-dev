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
  useRepayLoan,
  type LoanApi,
} from '../hooks/use-operator-credit'

const repaySchema = z.object({
  amountNaira: z.number().positive(),
})

interface RepayCreditSheetProps {
  opened: boolean
  loan: LoanApi
  onClose: () => void
  onRepaid?: () => void
}

export function RepayCreditSheet({
  opened,
  loan,
  onClose,
  onRepaid,
}: RepayCreditSheetProps) {
  const repayMut = useRepayLoan()
  const verifyPin = useVerifyPinMutation()
  const [pinDigits, setPinDigits] = useState(['', '', '', ''])
  const [error, setError] = useState<string | null>(null)

  const remainingNaira = Math.max(0, Math.ceil(loan.remaining_due_kobo / 100))
  const dailyNaira = Math.max(1, Math.ceil(loan.daily_installment_kobo / 100))

  const form = useForm<{ amountNaira: number }>({
    initialValues: { amountNaira: Math.min(dailyNaira, remainingNaira || dailyNaira) },
    validate: zodResolver(repaySchema),
  })

  useEffect(() => {
    if (!opened) {
      setPinDigits(['', '', '', ''])
      setError(null)
      return
    }
    form.setValues({
      amountNaira: Math.min(dailyNaira, remainingNaira || dailyNaira),
    })
  }, [opened, loan.id, dailyNaira, remainingNaira])

  if (!opened) return null

  const pin = pinDigits.join('')
  const busy = repayMut.isPending || verifyPin.isPending
  const pinReady = pin.length === 4

  const submit = async () => {
    const result = form.validate()
    if (result.hasErrors || !pinReady || busy) return
    const amountNaira = form.values.amountNaira
    if (amountNaira > remainingNaira) {
      setError(`Remaining balance is ${formatNaira(remainingNaira)}`)
      return
    }
    setError(null)
    try {
      const grant = await verifyPin.mutateAsync({ pin })
      await repayMut.mutateAsync({
        id: loan.id,
        amount_kobo: Math.round(amountNaira * 100),
        idempotency_key: newCreditIdempotencyKey('credit-repay'),
        pin_grant: grant.pin_grant,
      })
      onRepaid?.()
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not repay loan'))
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
            Repay loan
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
            {formatNaira(loan.remaining_due_kobo, { fromKobo: true })} left ·{' '}
            {formatNaira(loan.daily_installment_kobo, { fromKobo: true })}/day
            auto-debit
          </p>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--kura-muted)]">
              Amount (₦)
            </span>
            <input
              type="number"
              min={1}
              max={remainingNaira}
              value={form.values.amountNaira}
              onChange={(e) =>
                form.setFieldValue('amountNaira', Number(e.target.value) || 0)
              }
              className="rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-3 py-3 text-[15px] font-semibold text-[var(--kura-text)]"
            />
          </label>

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
            tone="amber"
            disabled={busy || !pinReady}
            onClick={() => {
              submit()
            }}
          >
            {busy ? 'Repaying…' : 'Repay from wallet'}
          </OperatorPrimaryButton>
        </div>
      </div>
    </div>
  )
}
