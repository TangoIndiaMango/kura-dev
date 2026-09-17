import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePostData } from '@shared/hooks/api'
import { AUTH_ENDPOINTS, AUTH_CHANNEL } from '../../features/auth/constants/auth-api.constants'
import { AUTH_ME_QUERY_KEY, type MePayload, type OtpRequestResult } from './auth'
import { setTokens } from './token-storage'
import { axiosInstance } from './client'

export function useBeginLoginMutation() {
  return usePostData<{ phone: string; channel?: string }, OtpRequestResult>(
    AUTH_ENDPOINTS.loginBegin,
    undefined,
    {
      silentError: true,
      body: (v) => ({ phone: v.phone, channel: v.channel ?? AUTH_CHANNEL }),
    },
  )
}

export function useRequestOtpMutation() {
  return usePostData<
    {
      phone: string
      purpose?: 'LOGIN' | 'REGISTER' | 'PIN_RESET'
      channel?: string
      force_otp?: boolean
    },
    OtpRequestResult
  >(AUTH_ENDPOINTS.otpRequest, undefined, {
    silentError: true,
    body: (v) => ({
      phone: v.phone,
      purpose: v.purpose ?? 'LOGIN',
      channel: v.channel ?? AUTH_CHANNEL,
      force_otp: Boolean(v.force_otp),
    }),
  })
}

type TokenAuthResponse = {
  access: string
  refresh: string
  user: MePayload['user']
}

export function usePinLoginMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { phone: string; pin: string; channel?: string }) => {
      const { data } = await axiosInstance.post<
        TokenAuthResponse & {
          has_pin: boolean
          display_name?: string | null
          onboarding_step?: string
        }
      >(
        AUTH_ENDPOINTS.pinLogin,
        {
          phone: input.phone,
          pin: input.pin,
          channel: input.channel ?? AUTH_CHANNEL,
        },
        { silentError: true },
      )
      setTokens(data.access, data.refresh)
      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY })
    },
  })
}

export function useVerifyOtpMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      phone: string
      code: string
      purpose?: 'LOGIN' | 'REGISTER' | 'PIN_RESET'
      channel?: string
    }) => {
      const { data } = await axiosInstance.post<
        TokenAuthResponse & {
          is_new_user: boolean
          onboarding_step?: string
        }
      >(
        AUTH_ENDPOINTS.otpVerify,
        {
          phone: input.phone,
          code: input.code,
          purpose: input.purpose ?? 'LOGIN',
          channel: input.channel ?? AUTH_CHANNEL,
        },
        { silentError: true },
      )
      setTokens(data.access, data.refresh)
      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY })
    },
  })
}

export function useSetPinMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { pin: string; pin_confirm?: string }) => {
      const { data } = await axiosInstance.post<{
        status: string
        access: string
        refresh: string
        was_reset: boolean
      }>(
        AUTH_ENDPOINTS.pinSet,
        {
          pin: input.pin,
          pin_confirm: input.pin_confirm ?? input.pin,
        },
        { silentError: true },
      )
      setTokens(data.access, data.refresh)
      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY })
    },
  })
}

export function useVerifyPinMutation() {
  return usePostData<{ pin: string }, { status: string; pin_grant: string; expires_at: string }>(
    AUTH_ENDPOINTS.pinVerify,
    undefined,
    {
      silentError: true,
      body: (v) => ({ pin: v.pin }),
    },
  )
}
