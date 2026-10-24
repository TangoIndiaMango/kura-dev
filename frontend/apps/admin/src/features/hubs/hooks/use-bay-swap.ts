/** Live bay swap: holds, multi-step F4 session, battery catalogue. */
import { useFetchData, usePostData } from '@shared/hooks/api'
import { useBatteries } from '@features/batteries/hooks/use-batteries'
import {
  useOpenShift,
  useRecordCashDeposit,
  useShifts,
} from '@features/payments/hooks/use-cash-ops'

export const BAY_ENDPOINTS = {
  reservations: '/mobility/reservations/',
  reservationLookup: '/mobility/reservations/lookup/',
  swapStart: '/mobility/swaps/start/',
  swapComplete: '/mobility/swaps/complete/',
  identityMismatch: '/mobility/swaps/identity-mismatch/',
  verifyRiderPin: '/mobility/swaps/verify-rider-pin/',
  velocityStatus: '/mobility/swaps/velocity-status/',
  requestVelocityException: '/mobility/swaps/request-velocity-exception/',
  vehicles: '/mobility/vehicles/',
} as const

export type ReservationApi = {
  id: string
  account: string
  vehicle: string
  vehicle_plate: string
  driver: string
  driver_name: string
  hub: string
  hub_name: string
  hub_code: string
  battery: string | null
  code: string
  status: string
  payment_mode: string
  hold_amount_kobo: number
  list_price_kobo?: number
  discount_code?: string
  discount_kobo?: number
  expires_at: string
  created_at: string
}

export type SwapSessionApi = {
  id: string
  status: string
  mismatch?: boolean
  mismatch_flag?: boolean
  returned_serial?: string | null
  issued_serial?: string | null
}

type CursorPage<T> = { results: T[]; next: string | null }

const EMPTY_RESERVATIONS: ReservationApi[] = []

export function useHubReservations(
  hubId: string | undefined,
  options?: { enabled?: boolean; status?: string },
) {
  const enabled = Boolean(hubId) && options?.enabled !== false
  const query = useFetchData<CursorPage<ReservationApi>>(
    BAY_ENDPOINTS.reservations,
    {
      hub: hubId,
      status: options?.status ?? 'ACTIVE',
      page_size: 50,
    },
    { enabled, keepPreviousData: true, staleTime: 15_000 },
  )
  return {
    ...query,
    reservations: query.data?.results ?? EMPTY_RESERVATIONS,
  }
}

export function useLookupReservation() {
  return usePostData<
    { code?: string; token?: string; vehicle_qr?: string; hub_id?: string },
    ReservationLookupApi
  >(BAY_ENDPOINTS.reservationLookup, [BAY_ENDPOINTS.reservations], {
    silentError: true,
  })
}

export type ReservationLookupApi = {
  reservation: ReservationApi
  driver: { name: string; photo_url: string | null }
  vehicle: {
    id: string
    registration: string
    current_battery_serial: string | null
    battery_type: string | null
  }
  triage: 'GREEN' | 'AMBER' | 'RED'
  triage_reason: string
  risk_flags: string[]
  first_swap: boolean
}

export type SwapStartPayload = {
  hub_id: string
  client_event_id: string
  reservation_id?: string | null
  vehicle_id?: string
  driver_id?: string
  account_id?: string
}

export function useStartSwap() {
  return usePostData<SwapStartPayload, SwapSessionApi>(
    BAY_ENDPOINTS.swapStart,
    [BAY_ENDPOINTS.reservations],
    { silentError: true },
  )
}

export type VelocityBayStatus = {
  vehicle_id: string
  blocked: boolean
  reason?: string | null
  message?: string | null
  retry_after_seconds?: number
  risk_event_id?: string | null
  bay_request_note?: string | null
  exception_requested?: boolean
  active_grant?: {
    id: string
    uses_remaining: number
    max_uses: number
    expires_at: string
  } | null
}

export function useVelocityBayStatus(
  vehicleId: string | undefined,
  options?: { enabled?: boolean; refetchInterval?: number | false },
) {
  return useFetchData<VelocityBayStatus>(
    BAY_ENDPOINTS.velocityStatus,
    { vehicle_id: vehicleId },
    {
      enabled: Boolean(vehicleId) && options?.enabled !== false,
      staleTime: 5_000,
      refetchInterval: options?.refetchInterval,
    },
  )
}

export function useRequestVelocityException() {
  return usePostData<
    {
      vehicle_id: string
      note: string
      hub_id?: string
      account_id?: string
    },
    { risk_event_id: string; status: string; exception_requested: boolean }
  >(BAY_ENDPOINTS.requestVelocityException, [BAY_ENDPOINTS.velocityStatus], {
    silentError: true,
  })
}

export function useSwapReturn() {
  return usePostData<
    { swapId: string; battery_serial: string; charge_pct?: number; mismatch_reason?: string },
    SwapSessionApi
  >(
    (v) => `/mobility/swaps/${v.swapId}/return/`,
    [BAY_ENDPOINTS.reservations],
    {
      silentError: true,
      body: (v) => ({
        battery_serial: v.battery_serial,
        charge_pct: v.charge_pct,
        mismatch_reason: v.mismatch_reason,
      }),
    },
  )
}

export function useSwapIssue() {
  return usePostData<
    { swapId: string; battery_serial: string; charge_pct?: number },
    SwapSessionApi
  >(
    (v) => `/mobility/swaps/${v.swapId}/issue/`,
    [BAY_ENDPOINTS.reservations],
    {
      silentError: true,
      body: (v) => ({
        battery_serial: v.battery_serial,
        charge_pct: v.charge_pct,
      }),
    },
  )
}

export function useSwapSessionComplete() {
  return usePostData<
    {
      swapId: string
      payment_mode?: 'PLAN' | 'PAYSTACK' | 'WALLET' | 'CREDIT' | 'CASH' | null
      amount_kobo?: number | null
      discount_code?: string
      rider_pin_grant?: string
    },
    SwapSessionApi
  >(
    (v) => `/mobility/swaps/${v.swapId}/complete/`,
    [BAY_ENDPOINTS.reservations],
    {
      silentError: true,
      body: (v) => ({
        payment_mode: v.payment_mode,
        amount_kobo: v.amount_kobo,
        discount_code: v.discount_code,
        rider_pin_grant: v.rider_pin_grant,
      }),
    },
  )
}

export function useSwapAbort() {
  return usePostData<{ swapId: string; reason?: string }, SwapSessionApi>(
    (v) => `/mobility/swaps/${v.swapId}/abort/`,
    [BAY_ENDPOINTS.reservations],
    {
      silentError: true,
      body: (v) => ({ reason: v.reason }),
    },
  )
}

export type IdentityMismatchPayload = {
  account_id: string
  reason: string
  subject?: string
  hub_id?: string
  reservation_code?: string
}

export type IdentityMismatchResult = {
  risk_event_id: string
  case_id: string
  case_code: string
}

export function useIdentityMismatch() {
  return usePostData<IdentityMismatchPayload, IdentityMismatchResult>(
    BAY_ENDPOINTS.identityMismatch,
    [BAY_ENDPOINTS.reservations],
    { silentError: true },
  )
}

/** @deprecated Prefer multi-step start/return/issue/{id}/complete */
export type SwapCompletePayload = {
  reservation_id?: string | null
  hub_id: string
  vehicle_id: string
  driver_id: string
  account_id: string
  returned_battery_serial?: string | null
  issued_battery_serial: string
  returned_charge_pct?: number
  issued_charge_pct?: number
  amount_kobo?: number | null
  payment_mode?: 'PLAN' | 'PAYSTACK' | 'WALLET' | 'CREDIT' | 'CASH' | null
  rider_pin_grant?: string
}

export function useCompleteSwap() {
  return usePostData<SwapCompletePayload, { id: string; status: string }>(
    BAY_ENDPOINTS.swapComplete,
    [BAY_ENDPOINTS.reservations],
    { silentError: true },
  )
}

export function useHubBayBatteries(hubId: string | undefined, enabled = true) {
  return useBatteries(
    { current_hub: hubId, page_size: 100 },
    { enabled: Boolean(hubId) && enabled },
  )
}

/** Mounted pack for return — not hub-scoped (ISSUED packs have no current_hub). */
export function useReturnPackBySerial(
  serial: string | null | undefined,
  enabled = true,
) {
  const q = (serial || '').trim()
  return useBatteries(
    { search: q || undefined, page_size: 5 },
    { enabled: Boolean(q) && enabled },
  )
}

export function useAgentOpenShift(hubId: string | undefined) {
  const shifts = useShifts({
    hub: hubId,
    status: 'OPEN',
    enabled: Boolean(hubId),
  })
  const openMut = useOpenShift()
  const depositMut = useRecordCashDeposit()
  const openShift = shifts.data?.results?.[0] ?? null
  return { openShift, shifts, openMut, depositMut }
}
