import React from 'react'
import { Navigate } from 'react-router-dom'
import { PhoneScreen } from './PhoneScreen'
import { OtpScreen } from './OtpScreen'
import { ProfilePinScreen } from './ProfilePinScreen'
import { UnlockPinScreen } from './UnlockPinScreen'
import { useOperatorOnboarding } from './hooks/use-operator-onboarding'
import { useAuth } from '../auth/AuthProvider'

/** Auth entry only — phone / OTP / PIN → home. */
export const OnboardingFlow: React.FC = () => {
  const flow = useOperatorOnboarding()
  const { isAuthenticated, status } = useAuth()

  if (status !== 'loading' && isAuthenticated && flow.step !== 'pin') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex min-h-screen justify-center bg-[var(--kura-bg)] text-[var(--kura-text)]">
      <div className="flex w-full max-w-md min-h-screen flex-col border-x border-[var(--kura-border-subtle)] bg-[var(--kura-bg)]">
        {flow.step === 'phone' ? (
          <PhoneScreen
            phone={flow.phone}
            onPhoneChange={flow.setPhone}
            loading={flow.isBusy}
            error={flow.error}
            onSendCode={flow.handleSendCode}
          />
        ) : null}

        {flow.step === 'otp' ? (
          <OtpScreen
            phoneDisplay={`+234 ${flow.phone}`}
            knownEmail={null}
            channel={flow.otpChannel}
            destinationLabel={flow.otpDestinationLabel}
            otp={flow.otp}
            onOtpChange={flow.setOtp}
            loading={flow.isBusy}
            error={flow.error}
            onVerify={flow.handleVerifyOtp}
            onBack={flow.handleOtpBack}
            onResendSms={flow.handleResendSms}
            onSendViaEmail={flow.handleSendViaEmail}
          />
        ) : null}

        {flow.step === 'unlock' ? (
          <UnlockPinScreen
            name={flow.fullName || flow.session?.name || ''}
            loading={flow.isBusy}
            error={flow.error}
            onUnlock={flow.handleUnlock}
            onBack={flow.handleUnlockBack}
            onForgotPin={flow.handleForgotPin}
          />
        ) : null}

        {flow.step === 'pin' ? (
          <ProfilePinScreen
            fullName={flow.fullName}
            onFullNameChange={flow.setFullName}
            pin={flow.pin}
            onPinChange={flow.setPinDigits}
            confirmPin={flow.confirmPin}
            onConfirmPinChange={flow.setConfirmPin}
            loading={flow.isBusy}
            error={flow.error}
            onContinue={flow.handlePinContinue}
            onBack={flow.handlePinBack}
          />
        ) : null}
      </div>
    </div>
  )
}
