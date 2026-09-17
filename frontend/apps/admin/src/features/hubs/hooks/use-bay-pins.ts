/** Bay PIN verification — rider (wallet) + agent (override). */
import { usePostData } from '@shared/hooks/api'
import { BAY_ENDPOINTS } from './use-bay-swap'

export type PinGrantResponse = {
  status: string
  pin_grant: string
  expires_at: string
}

export function useVerifyRiderPin() {
  return usePostData<{ account_id: string; pin: string }, PinGrantResponse>(
    BAY_ENDPOINTS.verifyRiderPin,
    undefined,
    { silentError: true },
  )
}

export function useVerifyAgentPin() {
  return usePostData<{ pin: string }, PinGrantResponse>(
    '/auth/pin/verify/',
    undefined,
    { silentError: true },
  )
}

const BAY_REASON_MAP: Record<string, string> = {
  face_exception: 'FACE_EXCEPTION',
  kyc_pending: 'KYC_PENDING',
  payment_exception: 'PAYMENT_EXCEPTION',
  ops_discretion: 'DISCRETION',
}

export function useRecordBayOverride() {
  return usePostData<
    { reason: string; note: string; pin_grant: string; swap_id: string },
    { id: string }
  >('/operations/overrides/', undefined, {
    silentError: true,
    body: (v) => ({
      reason: BAY_REASON_MAP[v.reason] ?? v.reason.toUpperCase(),
      note: v.note,
      pin_grant: v.pin_grant,
      swap_id: v.swap_id,
    }),
  })
}
