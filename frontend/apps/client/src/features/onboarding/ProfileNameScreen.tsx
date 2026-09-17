import React from 'react'
import { ArrowLeft01Icon } from 'hugeicons-react'
import { OperatorPrimaryButton } from '../../shared/components/operator/OperatorPrimaryButton'

interface ProfileNameScreenProps {
  fullName: string
  onFullNameChange: (value: string) => void
  onContinue: () => void
  onBack: () => void
}

export const ProfileNameScreen: React.FC<ProfileNameScreenProps> = ({
  fullName,
  onFullNameChange,
  onContinue,
  onBack,
}) => {
  const ready = fullName.trim().length > 1

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
        What’s your name?
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[var(--kura-muted)]">
        This is how hubs and your wallet will address you.
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

      <div className="mt-auto pt-10">
        <OperatorPrimaryButton onClick={onContinue} disabled={!ready}>
          Continue
        </OperatorPrimaryButton>
      </div>
    </div>
  )
}
