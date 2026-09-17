import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useOperatorSession,
  type OtpChannelPreference,
} from '@shared/session'
import { notifyCodeSent } from '@shared/utils/notify'
import { apiErrorMessage, completeAccountProfile } from '../../../lib/api/auth'
import {
  useBeginLoginMutation,
  usePinLoginMutation,
  useRequestOtpMutation,
  useSetPinMutation,
  useVerifyOtpMutation,
  useVerifyPinMutation,
} from '../../../lib/api/auth-mutations'
import { AUTH_CHANNEL } from '../../auth/constants/auth-api.constants'
import { useAuth } from '../../auth/AuthProvider'
import {
  isCompleteNgNational,
  normalizeNgNationalDigits,
} from '../../../shared/components/operator/OperatorPhoneField'
import type { OnboardingStep } from '../onboarding.types'


const emptyOtp = () => ['', '', '', '', '', '']
const emptyPin = () => ['', '', '', '']

/** Auth entry only: phone → OTP or PIN → home. */
export function useOperatorOnboarding() {
  const navigate = useNavigate()
  const { setAuthenticatedFromTokens, isAuthenticated } = useAuth()
  const beginLogin = useBeginLoginMutation()
  const requestOtp = useRequestOtpMutation()
  const pinLogin = usePinLoginMutation()
  const verifyOtp = useVerifyOtpMutation()
  const setPinApi = useSetPinMutation()
  const verifyPin = useVerifyPinMutation()
  const { markOnboarded, setEmail, updateSettings, session, onboarded } =
    useOperatorSession()

  const [step, setStep] = useState<OnboardingStep>('phone')
  const [phone, setPhone] = useState('')
  const [otpChannel, setOtpChannel] = useState<OtpChannelPreference>('sms')
  const [otpEmail, setOtpEmail] = useState<string | null>(null)
  const [otp, setOtp] = useState(emptyOtp)
  const [fullName, setFullName] = useState('')
  const [pin, setPinDigits] = useState(emptyPin)
  const [confirmPin, setConfirmPin] = useState(emptyPin)
  const [error, setError] = useState<string | null>(null)
  const [pinEntryFromPhone, setPinEntryFromPhone] = useState(false)
  const [pinFromForgot, setPinFromForgot] = useState(false)

  const otpDestinationLabel =
    otpChannel === 'email' && otpEmail ? otpEmail : `+234 ${phone}`

  const goHome = () => {
    markOnboarded()
    navigate('/', { replace: true })
  }

  const enterApp = () => {
    if (otpEmail) setEmail(otpEmail, true)
    updateSettings({
      otpChannel: otpChannel === 'email' ? 'email' : 'sms',
    })
    goHome()
  }

  const handleSendCode = async () => {
    setError(null)
    const national = normalizeNgNationalDigits(phone)
    if (!isCompleteNgNational(national)) {
      setError('Enter the 10 digits after +234 (e.g. 801 234 5678).')
      return
    }
    try {
      const begin = await beginLogin.mutateAsync({
        phone: national,
        channel: AUTH_CHANNEL,
      })
      setOtpChannel('sms')
      setOtpEmail(null)
      setOtp(emptyOtp())
      if (begin.next === 'pin') {
        setFullName(begin.display_name || '')
        setPinEntryFromPhone(true)
        setStep('unlock')
        return
      }
      await requestOtp.mutateAsync({
        phone: national,
        purpose: 'LOGIN',
        channel: AUTH_CHANNEL,
      })
      setPinEntryFromPhone(false)
      setStep('otp')
      notifyCodeSent('sms', `+234 ${phone}`)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not continue'))
    }
  }

  const nationalPhone = () => normalizeNgNationalDigits(phone)

  const handleVerifyOtp = async () => {
    setError(null)
    try {
      const result = await verifyOtp.mutateAsync({
        phone: nationalPhone(),
        code: otp.join(''),
        purpose: pinFromForgot ? 'PIN_RESET' : 'LOGIN',
        channel: AUTH_CHANNEL,
      })
      const me = await setAuthenticatedFromTokens()
      const name =
        [result.user.first_name, result.user.last_name].filter(Boolean).join(' ') ||
        me?.account?.display_name ||
        'Rider'

      if (pinFromForgot) {
        setFullName(name)
        setStep('pin')
        return
      }
      if (me?.has_pin) {
        setFullName(name)
        setPinEntryFromPhone(false)
        setStep('unlock')
        return
      }

      setFullName(name)
      enterApp()
    } catch (err) {
      setError(apiErrorMessage(err, 'Invalid code'))
    }
  }

  const handleResendSms = async () => {
    setOtp(emptyOtp())
    setError(null)
    try {
      await requestOtp.mutateAsync({
        phone: nationalPhone(),
        purpose: 'PIN_RESET',
        channel: AUTH_CHANNEL,
      })
      notifyCodeSent('sms', `+234 ${phone}`)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not resend'))
    }
  }

  const handleUnlock = async (value: string) => {
    setError(null)
    try {
      if (pinEntryFromPhone) {
        const logged = await pinLogin.mutateAsync({
          phone: nationalPhone(),
          pin: value,
          channel: AUTH_CHANNEL,
        })
        await setAuthenticatedFromTokens()
        const name =
          logged.display_name ||
          [logged.user.first_name, logged.user.last_name].filter(Boolean).join(' ') ||
          fullName ||
          'Rider'
        setFullName(name)
        enterApp()
        return
      }
      await verifyPin.mutateAsync({ pin: value })
      enterApp()
    } catch (err) {
      setError(apiErrorMessage(err, 'Wrong PIN'))
    }
  }

  const handleForgotPin = async () => {
    setError(null)
    try {
      await requestOtp.mutateAsync({
        phone: nationalPhone(),
        purpose: 'LOGIN',
        channel: AUTH_CHANNEL,
        force_otp: true,
      })
      setPinEntryFromPhone(false)
      setPinFromForgot(true)
      setOtp(emptyOtp())
      setStep('otp')
      notifyCodeSent('sms', `+234 ${phone}`)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not send reset code'))
    }
  }

  const handlePinContinue = async () => {
    const pinValue = pin.join('')
    const name = fullName.trim() || 'Rider'
    setError(null)
    try {
      await setPinApi.mutateAsync({
        pin: pinValue,
        pin_confirm: confirmPin.join(''),
      })
      await completeAccountProfile({ display_name: name })
      await setAuthenticatedFromTokens()
      enterApp()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save profile'))
    }
  }

  const handleOtpBack = () => {
    setError(null)
    setOtpChannel('sms')
    setOtpEmail(null)
    setPinFromForgot(false)
    setStep('phone')
  }

  const handleUnlockBack = () => {
    setError(null)
    setStep(pinEntryFromPhone ? 'phone' : 'otp')
  }

  const handlePinBack = () => {
    setStep(pinFromForgot ? 'unlock' : 'otp')
  }

  const handleSendViaEmail = (email: string) => {
    setOtpEmail(email)
    setOtpChannel('email')
    setOtp(emptyOtp())
  }

  const isBusy =
    beginLogin.isPending ||
    requestOtp.isPending ||
    pinLogin.isPending ||
    verifyOtp.isPending ||
    setPinApi.isPending ||
    verifyPin.isPending

  return {
    step,
    phone,
    setPhone,
    otp,
    setOtp,
    otpChannel,
    fullName,
    setFullName,
    pin,
    setPinDigits,
    confirmPin,
    setConfirmPin,
    error,
    otpDestinationLabel,
    session,
    onboarded: onboarded || isAuthenticated,
    isBusy,
    handleSendCode,
    handleVerifyOtp,
    handleResendSms,
    handleUnlock,
    handleForgotPin,
    handlePinContinue,
    handleOtpBack,
    handleUnlockBack,
    handlePinBack,
    handleSendViaEmail,
  }
}
