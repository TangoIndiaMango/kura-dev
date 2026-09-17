import React, { useState } from 'react'
import { ArrowLeft01Icon } from 'hugeicons-react'
import { PinDigitInputs } from '../../shared/components/operator/PinDigitInputs'
import { OperatorPrimaryButton } from '../../shared/components/operator/OperatorPrimaryButton'
import { OperatorSubtleButton } from '../../shared/components/operator/OperatorSubtleButton'

interface UnlockPinScreenProps {
  name: string
  onUnlock: (pin: string) => void | Promise<void>
  onBack: () => void
  onForgotPin: () => void | Promise<void>
  loading?: boolean
  error?: string | null
}

const empty = () => ['', '', '', '']

export const UnlockPinScreen: React.FC<UnlockPinScreenProps> = ({
  name,
  onUnlock,
  onBack,
  onForgotPin,
  loading = false,
  error = null,
}) => {
  const [pin, setPin] = useState(empty())
  const [localError, setLocalError] = useState<string | null>(null)
  const ready = pin.every((d) => d.length === 1)
  const shownError = error || localError

  const tryUnlock = async () => {
    setLocalError(null)
    await onUnlock(pin.join(''))
  }

  return (
    <div className="flex min-h-full flex-col px-5 pb-8 pt-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 inline-flex items-center gap-1 self-start text-sm text-[var(--kura-muted)]"
        disabled={loading}
      >
        <ArrowLeft01Icon size={16} />
        Back
      </button>

      <h1 className="text-[26px] font-bold tracking-tight text-[var(--kura-text)]">
        Welcome back{name ? `, ${name.split(' ')[0]}` : ''}
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[var(--kura-muted)]">
        Enter your 4-digit PIN to unlock this device.
      </p>

      <div className="mt-8">
        <PinDigitInputs
          values={pin}
          onChange={(vals) => {
            setPin(vals)
            if (localError) setLocalError(null)
          }}
          masked
          autoFocus
          error={Boolean(shownError)}
          disabled={loading}
        />
      </div>

      {shownError ? (
        <p className="mt-3 text-[13px] font-bold text-[var(--kura-coral)]" role="alert">
          {shownError}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-1.5">
        <OperatorPrimaryButton
          onClick={() => {
            tryUnlock().catch(() => undefined)
          }}
          disabled={!ready || loading}
          loading={loading}
        >
          Unlock
        </OperatorPrimaryButton>
        <OperatorSubtleButton onClick={onForgotPin} disabled={loading}>
          Forgot PIN?
        </OperatorSubtleButton>
      </div>
    </div>
  )
}
