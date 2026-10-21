import { axiosInstance } from './client'
import { getRefreshToken, setTokens } from './token-storage'

export type ApiErrorBody = {
  error?: {
    code?: string
    message?: string
    details?: Record<string, unknown>
  }
}

export function apiErrorEnvelope(err: unknown): {
  code?: string
  message?: string
  details?: Record<string, unknown>
} {
  const ax = err as { response?: { data?: ApiErrorBody }; message?: string }
  const error = ax.response?.data?.error
  return {
    code: error?.code,
    message: error?.message || ax.message,
    details: error?.details,
  }
}

export function apiErrorMessage(err: unknown, fallback = 'Something went wrong') {
  return apiErrorEnvelope(err).message || fallback
}

export type AdminMePayload = {
  user: {
    id: string
    email?: string
    first_name?: string
    last_name?: string
    phone?: string
    role?: string
    created_at?: string
  }
  capabilities: string[]
  is_staff: boolean
  has_pin?: boolean
  photo_url?: string | null
  notification_prefs?: { email?: boolean; push?: boolean }
}

export async function staffLogin(identifier: string, password: string) {
  const { data } = await axiosInstance.post('/auth/login/', { identifier, password })
  const body = data as {
    access: string
    refresh: string
    user: AdminMePayload['user']
  }
  setTokens(body.access, body.refresh)
  return body
}

export async function fetchAdminMe() {
  const { data } = await axiosInstance.get('/auth/me/')
  return data as AdminMePayload
}

export async function updateAdminProfile(payload: {
  first_name?: string
  last_name?: string
  phone?: string
  email?: string
  avatar_asset_id?: string | null
  notification_prefs?: { email?: boolean; push?: boolean }
}) {
  const { data } = await axiosInstance.patch('/auth/me/profile/', payload, {
    silentError: true,
  })
  return data as AdminMePayload
}

export async function changeAdminPassword(payload: {
  current_password: string
  new_password: string
  new_password_confirmation: string
}) {
  const { data } = await axiosInstance.post('/auth/password/change/', payload, {
    silentError: true,
  })
  return data as { status: string }
}

export type PasswordSetupContext = {
  email: string
  first_name?: string
  expires_at: string
  purpose: string
}

export async function fetchPasswordSetupContext(token: string) {
  const { data } = await axiosInstance.post(
    '/auth/password-setup/context/',
    { token },
    { silentError: true },
  )
  return data as PasswordSetupContext
}

export async function completePasswordSetup(payload: {
  token: string
  password: string
  password_confirmation: string
}) {
  const { data } = await axiosInstance.post('/auth/password-setup/', payload, {
    silentError: true,
  })
  const body = data as {
    access: string
    refresh: string
    user: AdminMePayload['user']
  }
  setTokens(body.access, body.refresh)
  return body
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
