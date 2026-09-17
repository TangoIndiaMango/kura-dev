import React from 'react'
import { ArrowLeft01Icon } from 'hugeicons-react'
import { PinDigitInputs } from '../../shared/components/operator/PinDigitInputs'
import { OperatorPrimaryButton } from '../../shared/components/operator/OperatorPrimaryButton'

interface ProfilePinScreenProps {
  fullName: string
  onFullNameChange: (value: string) => void
  pin: string[]
  onPinChange: (values: string[]) => void
  confirmPin: string[]
  onConfirmPinChange: (values: string[]) => void
  onContinue: () => void | Promise<void>
  onBack: () => void
  loading?: boolean
  error?: string | null
}

export const ProfilePinScreen: React.FC<ProfilePinScreenProps> = ({
  fullName,
  onFullNameChange,
  pin,
  onPinChange,
  confirmPin,
  onConfirmPinChange,
  onContinue,
  onBack,
  loading = false,
  error = null,
}) => {
  const pinReady =
    pin.every((d) => d.length === 1) &&
    confirmPin.every((d) => d.length === 1) &&
    pin.join('') === confirmPin.join('')
  const ready = fullName.trim().length > 1 && pinReady

  return (
    <div className="flex min-h-full flex-col px-5 pb-8 pt-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 inline-flex items-center gap-1 self-start text-sm text-[var(--kura-muted)]"
      >
        <ArrowLeft01Icon size={16} />
        Back
      </button>

      <h1 className="text-[26px] font-bold tracking-tight text-[var(--kura-text)]">
        Profile + PIN
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[var(--kura-muted)]">
        Create your display name and a 4-digit PIN for wallet actions.
      </p>

      <label className="mt-8 flex flex-col gap-2">
        <span className="text-[13px] font-medium text-[var(--kura-muted)]">
          Full name
        </span>
        <input
          type="text"
          value={fullName}
          onChange={(e) => onFullNameChange(e.target.value)}
          placeholder="Yusuf Abdullahi"
          className="rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-3.5 py-3.5 text-[15px] font-medium text-[var(--kura-text)] outline-none placeholder:text-[var(--kura-text)]/35 focus:border-[var(--kura-teal)]"
        />
      </label>

      <div className="mt-6 flex flex-col gap-2">
        <span className="text-[13px] font-medium text-[var(--kura-muted)]">
          Create 4-digit PIN
        </span>
        <PinDigitInputs values={pin} onChange={onPinChange} masked />
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <span className="text-[13px] font-medium text-[var(--kura-muted)]">
          Confirm PIN
        </span>
        <PinDigitInputs
          values={confirmPin}
          onChange={onConfirmPinChange}
          masked
        />
      </div>

      <div className="mt-6 pt-2">
        {error ? (
          <p className="mb-3 text-[13px] font-medium text-[var(--kura-coral)]" role="alert">
            {error}
          </p>
        ) : null}
        <OperatorPrimaryButton onClick={onContinue} disabled={!ready || loading} loading={loading}>
          Continue
        </OperatorPrimaryButton>
      </div>
    </div>
  )
}
