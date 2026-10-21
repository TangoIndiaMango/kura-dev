import { axiosInstance } from './client'
import { getRefreshToken, setTokens } from './token-storage'

export const AUTH_ME_QUERY_KEY = ['auth', 'me'] as const

export type ApiErrorBody = {
  error?: { code?: string; message?: string; details?: unknown; request_id?: string }
}

export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const ax = err as { response?: { data?: ApiErrorBody }; message?: string }
  return ax.response?.data?.error?.message || ax.message || fallback
}

export type ConsentPurpose = 'SERVICE' | 'DATA_SHARING'

export type ConsentRecord = {
  granted: boolean
  granted_at: string | null
  withdrawn_at: string | null
  channel: string | null
  policy_version: string | null
}

export type ConsentState = {
  policy_version: string
  service: ConsentRecord
  data_sharing: ConsentRecord
  /** No SERVICE grant at the current policy version. */
  needs_service_consent: boolean
  /** Existing rider with ID data on file — confirm before continuing. */
  prompt_required: boolean
}

export type MePayload = {
  user: {
    id: string
    phone?: string
    first_name?: string
    last_name?: string
    email?: string
    role?: string
  }
  account: {
    id: string
    display_name?: string
    kura_id?: string
    kyc_status?: string
    status?: string
  } | null
  capabilities: string[]
  onboarding_step: string
  has_pin: boolean
  photo_url?: string | null
  kyc?: {
    status?: string
    id_type?: string | null
    id_last4?: string | null
    face_asset_id?: string | null
    photo_url?: string | null
    document_status?: string | null
    reject_reason?: string | null
    request_note?: string | null
    photos_requested?: boolean
    next_action?: string
    id_front_asset_id?: string | null
    id_back_asset_id?: string | null
    id_front_url?: string | null
    id_back_url?: string | null
  } | null
  consent?: ConsentState | null
}

export type OtpRequestResult = {
  status: string
  message: string
  phone: string
  next?: 'otp' | 'pin'
  has_pin?: boolean
  display_name?: string | null
  purpose?: string
  channel?: string
}

export async function beginLogin(phone: string, channel: 'WEB' | 'APP' = 'WEB') {
  const { data } = await axiosInstance.post<OtpRequestResult>(
    '/auth/login/begin/',
    { phone, channel },
    { silentError: true },
  )
  return data
}

export async function requestOtp(
  phone: string,
  purpose: 'LOGIN' | 'REGISTER' | 'PIN_RESET' | 'PHONE_CHANGE' = 'LOGIN',
  channel: 'WEB' | 'APP' = 'WEB',
  opts?: { force_otp?: boolean },
) {
  const { data } = await axiosInstance.post<OtpRequestResult>(
    '/auth/otp/request/',
    {
      phone,
      purpose,
      channel,
      force_otp: Boolean(opts?.force_otp),
    },
    { silentError: true },
  )
  return data
}

export async function verifyOtp(
  phone: string,
  code: string,
  purpose: 'LOGIN' | 'REGISTER' | 'PIN_RESET' | 'PHONE_CHANGE' = 'LOGIN',
  channel: 'WEB' | 'APP' = 'WEB',
) {
  const { data } = await axiosInstance.post(
    '/auth/otp/verify/',
    { phone, purpose, code, channel },
    { silentError: true },
  )
  const body = data as {
    access: string
    refresh: string
    is_new_user: boolean
    onboarding_step?: string
    user: MePayload['user']
  }
  setTokens(body.access, body.refresh)
  return body
}

export async function pinLogin(phone: string, pin: string, channel: 'WEB' | 'APP' = 'WEB') {
  const { data } = await axiosInstance.post(
    '/auth/pin/login/',
    { phone, pin, channel },
    { silentError: true },
  )
  const body = data as {
    access: string
    refresh: string
    has_pin: boolean
    display_name?: string | null
    onboarding_step?: string
    user: MePayload['user']
  }
  setTokens(body.access, body.refresh)
  return body
}

export async function setPin(pin: string, pinConfirm?: string) {
  const { data } = await axiosInstance.post(
    '/auth/pin/set/',
    {
      pin,
      pin_confirm: pinConfirm ?? pin,
    },
    { silentError: true },
  )
  return data
}

export async function verifyPin(pin: string) {
  const { data } = await axiosInstance.post(
    '/auth/pin/verify/',
    { pin },
    { silentError: true },
  )
  return data as { status: string; pin_grant: string; expires_at: string }
}

export async function fetchMe() {
  const { data } = await axiosInstance.get<MePayload>('/auth/me/', {
    silentError: true,
  })
  return data
}

export async function updateConsent(purpose: ConsentPurpose, granted: boolean) {
  const { data } = await axiosInstance.post<ConsentState>(
    '/auth/me/consent/',
    { purpose, granted, channel: 'WEB' },
    { silentError: true },
  )
  return data
}

export async function completeAccountProfile(payload: {
  display_name: string
  first_name?: string
  last_name?: string
}) {
  const { data } = await axiosInstance.post('/accounts/', payload, {
    silentError: true,
  })
  return data
}

export async function logoutRemote() {
  const refresh = getRefreshToken()
  if (!refresh) return
  await axiosInstance.post(
    '/auth/logout/',
    { refresh },
    { silentError: true },
  )
}
