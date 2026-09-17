import React, { useEffect, useState } from 'react'
import { ArrowLeft01Icon } from 'hugeicons-react'
import { useMantineColorScheme } from '@mantine/core'
import { PinDigitInputs } from '../../../shared/components/operator/PinDigitInputs'
import { OperatorPrimaryButton } from '../../../shared/components/operator/OperatorPrimaryButton'
import { OperatorSubtleButton } from '../../../shared/components/operator/OperatorSubtleButton'
import { IllustrationHero } from '../../../shared/components/IllustrationHero'
import { apiErrorMessage, requestOtp, verifyOtp } from '../../../lib/api/auth'
import { notify, notifyCodeSent } from '../../../shared/utils/notify'

const empty = () => ['', '', '', '']

type Step = 'otp' | 'set'

interface ForgotPinFlowProps {
  phoneDisplay: string
  /** E.164 or local digits accepted by auth OTP endpoints. */
  phone: string
  onBack: () => void
  /** Called after OTP verified — parent persists PIN via /auth/pin/set/. */
  onReset: (newPin: string) => void
}

export const ForgotPinFlow: React.FC<ForgotPinFlowProps> = ({
  phoneDisplay,
  phone,
  onBack,
  onReset,
}) => {
  const { colorScheme } = useMantineColorScheme()
  const theme = colorScheme === 'light' ? 'light' : 'dark'
  const [step, setStep] = useState<Step>('otp')
  const [otp, setOtp] = useState(empty())
  const [otpError, setOtpError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pin, setPin] = useState(empty())
  const [confirmPin, setConfirmPin] = useState(empty())

  const otpReady = otp.every((d) => d.length === 1)
  const pinReady = pin.every((d) => d.length === 1)
  const confirmReady = confirmPin.every((d) => d.length === 1)
  const match = pin.join('') === confirmPin.join('')
  const canSave = pinReady && confirmReady && match

  const sendCode = async () => {
    setBusy(true)
    setOtpError(null)
    try {
      await requestOtp(phone, 'PIN_RESET', 'WEB', { force_otp: true })
      notifyCodeSent('sms', phoneDisplay)
    } catch (err) {
      setOtpError(apiErrorMessage(err, 'Could not send code'))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void sendCode()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- send once on mount
  }, [])

  if (step === 'otp') {
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

        <div className="mx-auto flex h-[110px] w-full max-w-[200px] items-center justify-center">
          <IllustrationHero
            id="pin-locked"
            theme={theme}
            imgClassName="max-h-full max-w-full object-contain"
          />
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--kura-text)]">
            Reset your PIN
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--kura-muted)]">
            We sent a 4-digit code to{' '}
            <span className="font-semibold text-[var(--kura-text)]">
              {phoneDisplay}
            </span>
            . Enter it to unlock PIN reset.
          </p>
        </div>

        <PinDigitInputs
          values={otp}
          onChange={(v) => {
            setOtpError(null)
            setOtp(v)
          }}
          autoFocus
          error={Boolean(otpError)}
        />

        {otpError ? (
          <p className="text-[12px] font-medium text-[var(--kura-coral)]">
            {otpError}
          </p>
        ) : (
          <p className="text-[11px] text-[var(--kura-muted)]">
            Code expires in a few minutes.
          </p>
        )}

        <div className="flex flex-col gap-1.5 pt-2">
          <OperatorPrimaryButton
            disabled={!otpReady || busy}
            onClick={() => {
              if (!otpReady) {
                setOtpError('Enter the 4-digit code')
                return
              }
              setBusy(true)
              setOtpError(null)
              verifyOtp(phone, otp.join(''), 'PIN_RESET', 'WEB')
                .then(() => {
                  setPin(empty())
                  setConfirmPin(empty())
                  setStep('set')
                })
                .catch((err) => {
                  setOtpError(apiErrorMessage(err, 'Invalid or expired code'))
                })
                .finally(() => setBusy(false))
            }}
          >
            {busy ? 'Checking…' : 'Continue'}
          </OperatorPrimaryButton>
          <OperatorSubtleButton
            disabled={busy}
            onClick={() => {
              setOtp(empty())
              void sendCode()
            }}
          >
            Resend code
          </OperatorSubtleButton>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setStep('otp')}
        className="inline-flex items-center gap-1 self-start text-sm text-[var(--kura-muted)]"
      >
        <ArrowLeft01Icon size={16} />
        Back
      </button>

      <div>
        <h2 className="text-lg font-bold text-[var(--kura-text)]">
          Create a new PIN
        </h2>
        <p className="mt-1 text-xs text-[var(--kura-muted)]">
          You’ll use this to confirm swaps and wallet spends.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-[var(--kura-muted)]">
          New 4-digit PIN
        </span>
        <PinDigitInputs values={pin} onChange={setPin} masked autoFocus />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-[var(--kura-muted)]">
          Confirm PIN
        </span>
        <PinDigitInputs values={confirmPin} onChange={setConfirmPin} masked />
      </div>

      {pinReady && confirmReady && !match ? (
        <p className="text-[12px] font-medium text-[var(--kura-coral)]">
          PINs don’t match
        </p>
      ) : null}

      <div className="pt-2">
        <OperatorPrimaryButton
          disabled={!canSave}
          onClick={() => {
            onReset(pin.join(''))
            notify({ title: 'Saving new PIN…', tone: 'info' })
          }}
        >
          Save new PIN
        </OperatorPrimaryButton>
      </div>
    </div>
  )
}
