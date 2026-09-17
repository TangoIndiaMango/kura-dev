import React from 'react'
import { KuraLogo } from '../../shared/components/KuraLogo'
import {
  isCompleteNgNational,
  OperatorPhoneField,
} from '../../shared/components/operator/OperatorPhoneField'
import { OperatorPrimaryButton } from '../../shared/components/operator/OperatorPrimaryButton'

interface PhoneScreenProps {
  phone: string
  onPhoneChange: (value: string) => void
  onSendCode: () => void | Promise<void>
  loading?: boolean
  error?: string | null
}

export const PhoneScreen: React.FC<PhoneScreenProps> = ({
  phone,
  onPhoneChange,
  onSendCode,
  loading = false,
  error = null,
}) => {
  const ready = isCompleteNgNational(phone)

  return (
    <div className="flex min-h-full flex-col px-5 pb-8 pt-10">
      <KuraLogo size="md" />

      <div className="mt-10 flex flex-col gap-3">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[var(--kura-text)]">
          Welcome to KURA
        </h1>
        <p className="max-w-sm text-[14px] leading-relaxed text-[var(--kura-muted)]">
          Cheaper than petrol. Swap a battery in under a minute at any KURA hub.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <OperatorPhoneField value={phone} onChange={onPhoneChange} error={error} />
        <OperatorPrimaryButton
          onClick={onSendCode}
          loading={loading}
          disabled={loading || !ready}
        >
          Send code
        </OperatorPrimaryButton>
        <p className="text-center text-[11px] text-[var(--kura-muted)]">
          We’ll text a 6-digit code to this number.
        </p>
      </div>
    </div>
  )
}
