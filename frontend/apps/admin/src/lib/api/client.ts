import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import { notifications } from '@mantine/notifications'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './token-storage'

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean
    /** Skip global error toast (caller handles UI). */
    silentError?: boolean
  }
}

const AUTH_PUBLIC_URLS = [
  '/auth/otp/request/',
  '/auth/otp/verify/',
  '/auth/login/',
  '/auth/login/begin/',
  '/auth/pin/login/',
  '/auth/token/refresh/',
  '/auth/password-setup/',
  '/auth/password-setup/context/',
] as const

type UnauthorizedHandler = () => void

let onUnauthorized: UnauthorizedHandler | null = null
let isRefreshing = false
let refreshQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler
}

function processRefreshQueue(error: unknown, token: string | null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error || !token) reject(error)
    else resolve(token)
  })
  refreshQueue = []
}

function isSilentError(config?: AxiosRequestConfig) {
  return Boolean(config?.silentError)
}

function isAuthPublicUrl(url?: string) {
  if (!url) return false
  return AUTH_PUBLIC_URLS.some((path) => url.includes(path))
}

function isAuthRefreshUrl(url?: string) {
  return Boolean(url?.includes('/auth/token/refresh/'))
}

function envelopeMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback
  const err = (data as { error?: { message?: string; code?: string } }).error
  if (err?.message) return err.message
  const detail = (data as { detail?: string }).detail
  if (typeof detail === 'string' && detail) return detail
  return fallback
}

function showErrorToast(message: string, silent?: boolean) {
  if (silent || !message) return
  notifications.show({
    color: 'red',
    message,
    autoClose: 4000,
  })
}

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

/** @deprecated Prefer `axiosInstance` — kept for existing call sites. */
export const api = axiosInstance

async function refreshAccessToken(): Promise<string> {
  const refresh = getRefreshToken()
  if (!refresh) throw new Error('No refresh token')

  const { data } = await axiosInstance.post<{ access?: string; refresh?: string }>(
    '/auth/token/refresh/',
    { refresh },
    { _retry: true, silentError: true },
  )
  const access = data?.access
  if (!access) throw new Error('Refresh failed')
  setTokens(access, data.refresh ?? refresh)
  return access
}

axiosInstance.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token && !isAuthPublicUrl(config.url)) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status
    const originalConfig = error.config as InternalAxiosRequestConfig | undefined
    const silent = isSilentError(originalConfig)

    if (
      status === 401 &&
      originalConfig &&
      !originalConfig._retry &&
      !isAuthPublicUrl(originalConfig.url)
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token: string) => {
              originalConfig.headers.set('Authorization', `Bearer ${token}`)
              originalConfig._retry = true
              resolve(axiosInstance(originalConfig))
            },
            reject,
          })
        })
      }

      originalConfig._retry = true
      isRefreshing = true
      try {
        const newToken = await refreshAccessToken()
        processRefreshQueue(null, newToken)
        originalConfig.headers.set('Authorization', `Bearer ${newToken}`)
        return axiosInstance(originalConfig)
      } catch (refreshError) {
        processRefreshQueue(refreshError, null)
        const hadSession = Boolean(getAccessToken() || getRefreshToken())
        clearTokens()
        if (hadSession) onUnauthorized?.()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    if (status === 401 && isAuthRefreshUrl(originalConfig?.url)) {
      clearTokens()
      onUnauthorized?.()
    }

    const fallback =
      status === 429
        ? 'Too many requests. Try again shortly.'
        : status === 401
          ? 'Session expired'
          : status === 403
            ? 'Forbidden'
            : status === 404
              ? 'Not found'
              : status === 500
                ? 'Server error'
                : error.message || 'Something went wrong'

    const message = envelopeMessage(error.response?.data, fallback)
    showErrorToast(message, silent)
    error.message = message
    return Promise.reject(error)
  },
)
