import React, { useState } from 'react'
import { ArrowLeft01Icon } from 'hugeicons-react'
import { PinDigitInputs } from '../../shared/components/operator/PinDigitInputs'
import { OperatorPrimaryButton } from '../../shared/components/operator/OperatorPrimaryButton'
import { OperatorSubtleButton } from '../../shared/components/operator/OperatorSubtleButton'
import { notifyCodeSent } from '../../shared/utils/notify'
import type { OtpChannelPreference } from '../../shared/session'

/** Show email fallback only after this many Resend taps (initial SMS doesn't count). */
export const OTP_RESENDS_BEFORE_EMAIL = 2

interface OtpScreenProps {
  phoneDisplay: string
  knownEmail?: string | null
  channel: OtpChannelPreference
  destinationLabel: string
  otp: string[]
  onOtpChange: (values: string[]) => void
  onVerify: () => void | Promise<void>
  onBack: () => void
  onResendSms: () => void | Promise<void>
  onSendViaEmail: (email: string) => void
  loading?: boolean
  error?: string | null
}

type Phase = 'code' | 'collect-email'

export const OtpScreen: React.FC<OtpScreenProps> = ({
  phoneDisplay,
  knownEmail,
  channel,
  destinationLabel,
  otp,
  onOtpChange,
  onVerify,
  onBack,
  onResendSms,
  onSendViaEmail,
  loading = false,
  error = null,
}) => {
  const [phase, setPhase] = useState<Phase>('code')
  const [resendCount, setResendCount] = useState(0)
  const [emailDraft, setEmailDraft] = useState(knownEmail ?? '')
  const ready = otp.every((d) => d.length === 1)
  const showEmailEscape =
    channel === 'sms' && resendCount >= OTP_RESENDS_BEFORE_EMAIL

  const onResend = () => {
    onResendSms()
    setResendCount((n) => n + 1)
    notifyCodeSent('sms', phoneDisplay)
  }

  const startEmailFallback = () => {
    setEmailDraft(knownEmail?.trim() ?? '')
    setPhase('collect-email')
  }

  const sendEmailCode = (email: string) => {
    onSendViaEmail(email)
    notifyCodeSent('email', email)
    setPhase('code')
  }

  if (phase === 'collect-email') {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailDraft.trim())
    return (
      <div className="flex min-h-full flex-col px-5 pb-8 pt-6">
        <button
          type="button"
          onClick={() => setPhase('code')}
          className="mb-8 inline-flex items-center gap-1 self-start text-sm text-[var(--kura-muted)]"
        >
          <ArrowLeft01Icon size={16} />
          Back to code
        </button>

        <h1 className="text-[26px] font-bold tracking-tight text-[var(--kura-text)]">
          Try email instead
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--kura-muted)]">
          We’ll send the same 6-digit code to your email. You can keep this for
          future sign-ins in Settings.
        </p>

        <label className="mt-8 text-[12px] font-semibold text-[var(--kura-muted)]">
          Email
        </label>
        <input
          type="email"
          autoFocus
          value={emailDraft}
          onChange={(e) => setEmailDraft(e.target.value)}
          placeholder="you@email.com"
          className="mt-2 w-full rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-3 py-3.5 text-[15px] text-[var(--kura-text)] outline-none focus:border-[var(--kura-teal)]"
        />

        <div className="mt-8 flex flex-col gap-2">
          <OperatorPrimaryButton
            onClick={() => sendEmailCode(emailDraft.trim())}
            disabled={!emailOk}
          >
            Send code to email
          </OperatorPrimaryButton>
          <OperatorSubtleButton color="gray" onClick={() => setPhase('code')}>
            Back to SMS code
          </OperatorSubtleButton>
        </div>
      </div>
    )
  }

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
        Enter the code
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[var(--kura-muted)]">
        {channel === 'email' ? (
          <>
            We sent a 6-digit code to{' '}
            <span className="font-semibold text-[var(--kura-text)]">
              {destinationLabel}
            </span>
          </>
        ) : (
          <>
            We texted a 6-digit code to{' '}
            <span className="font-semibold text-[var(--kura-text)]">
              {phoneDisplay}
            </span>
          </>
        )}
      </p>

      <div className="mt-8">
        <PinDigitInputs length={6} values={otp} onChange={onOtpChange} autoFocus />
      </div>

      <div className="mt-8 flex flex-col gap-1.5">
        {error ? (
          <p className="text-[13px] font-medium text-[var(--kura-coral)]" role="alert">
            {error}
          </p>
        ) : null}
        <OperatorPrimaryButton onClick={onVerify} disabled={!ready || loading} loading={loading}>
          Verify
        </OperatorPrimaryButton>
        {channel === 'sms' ? (
          <OperatorSubtleButton onClick={onResend} loading={loading} disabled={loading}>
            Resend code
          </OperatorSubtleButton>
        ) : (
          <OperatorSubtleButton
            onClick={() => {
              onSendViaEmail(destinationLabel)
              notifyCodeSent('email', destinationLabel)
            }}
            disabled={loading}
          >
            Resend to email
          </OperatorSubtleButton>
        )}

        {showEmailEscape ? (
          <OperatorSubtleButton color="gray" onClick={startEmailFallback} disabled={loading}>
            Not receiving OTP? Try email
          </OperatorSubtleButton>
        ) : null}
      </div>
    </div>
  )
}
