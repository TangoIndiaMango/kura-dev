import React from 'react'
import { ArrowLeft01Icon } from 'hugeicons-react'
import { PinDigitInputs } from '../../../shared/components/operator/PinDigitInputs'
import { HoldFillButton } from '../../../shared/components/operator/HoldFillButton'
import { OperatorSubtleButton } from '../../../shared/components/operator/OperatorSubtleButton'

interface PinStepProps {
  pin: string[]
  onPinChange: (values: string[]) => void
  onSubmit: () => void
  onBack: () => void
  onForgotPin: () => void
  error?: string | null
  attemptsLeft?: number | null
}

export const PinStep: React.FC<PinStepProps> = ({
  pin,
  onPinChange,
  onSubmit,
  onBack,
  onForgotPin,
  error = null,
  attemptsLeft = null,
}) => {
  const ready = pin.every((d) => d.length === 1)
  const hasError = Boolean(error)
  const locked = attemptsLeft === 0

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
          Confirm with PIN
        </h2>
        <p className="mt-1 text-xs text-[var(--kura-muted)]">
          Wallet debit needs your 4-digit PIN.
        </p>
      </div>

      <PinDigitInputs
        values={pin}
        onChange={onPinChange}
        masked
        autoFocus={!locked}
        error={hasError}
        disabled={locked}
      />

      {hasError ? (
        <div className="rounded-xl border border-[var(--kura-coral)]/35 bg-[var(--kura-coral)]/10 px-3.5 py-3">
          <p className="text-[13px] font-bold text-[var(--kura-coral)]">{error}</p>
          {attemptsLeft != null ? (
            <p className="mt-0.5 text-[12px] text-[var(--kura-muted)]">
              {locked
                ? 'PIN locked — reset with your phone code.'
                : `${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left`}
            </p>
          ) : null}
        </div>
      ) : null}

      <OperatorSubtleButton
        fullWidth={false}
        className="self-start"
        onClick={onForgotPin}
      >
        Forgot your PIN?
      </OperatorSubtleButton>

      <div className="pt-2">
        <HoldFillButton
          disabled={!ready || locked}
          onComplete={onSubmit}
          hint="Hold to confirm"
          tone={hasError ? 'danger' : 'teal'}
        >
          Confirm
        </HoldFillButton>
      </div>
    </div>
  )
}
