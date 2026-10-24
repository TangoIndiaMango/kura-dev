import { useFetchData, usePostData } from '@shared/hooks/api'

export const SWAP_API = {
  discoverHubs: '/mobility/hubs/discover/',
  vehicles: '/mobility/vehicles/',
  reservations: '/mobility/reservations/',
  reservationCancel: (id: string) => `/mobility/reservations/${id}/cancel/`,
  holdPolicy: '/mobility/pricing/hold-policy/',
  swaps: '/mobility/swaps/',
  precheck: '/mobility/reservations/precheck/',
  swapCheckout: (id: string) => `/mobility/swaps/${id}/checkout/`,
} as const

export type DiscoverHubApi = {
  id: string
  code: string
  name: string
  address: string
  status: string
  ui_status: 'ready' | 'low' | 'offline'
  lat: number
  lng: number
  ready_count: number
  hours_label: string
  distance_km?: number | null
  duration_s?: number | null
  battery_type_id?: string | null
}

export type LiveVehicleApi = {
  id: string
  registration_plate: string
  make: string
  model_name: string
  vehicle_type: string
  pay_per_swap_kobo?: number | null
  current_battery_serial?: string | null
  current_battery_charge?: number | null
  current_battery_charge_source?: string | null
  current_battery_charge_at?: string | null
  estimated_range_km?: number | null
  status: string
  account_id?: string
  battery_type_name?: string | null
  assigned_driver_id?: string | null
  assigned_driver_name?: string | null
}

export type VehicleModelApi = {
  id: string
  make: string
  model: string
  vehicle_type: string
  battery_type: string
  battery_type_name: string
}

export type VehicleCreatePayload = {
  account_id?: string
  vehicle_model_id: string
  registration_plate: string
  hardware_id?: string
}

export type VehicleDetailApi = LiveVehicleApi & {
  vehicle_model_id: string
  vin?: string
  hardware_id?: string | null
}

export type ReservationCreatePayload = {
  vehicle: string
  hub: string
  payment_mode: string
  account?: string
  discount_code?: string
}

export type ReservationApi = {
  id: string
  code: string
  qr?: string | null
  hub: string
  hub_name: string
  vehicle: string
  vehicle_plate: string
  payment_mode: string
  expires_at: string
  status: string
  created_at?: string
  hold_amount_kobo?: number
  list_price_kobo?: number
  discount_code?: string
  discount_kobo?: number
}

export type HoldPolicyApi = {
  default_hold_minutes: number
  max_extend_minutes: number
}

export type SwapListApi = {
  id: string
  hub_name: string | null
  vehicle_plate: string | null
  payment_mode: string
  amount_kobo: number
  display_amount_kobo?: number
  payment?: string | null
  payment_id?: string | null
  status: string
  ui_status?: string
  reservation_status?: string
  reservation_expires_at?: string | null
  created_at: string
  returned_serial?: string | null
  issued_serial?: string | null
}

type PageNumberPaginated<T> = {
  count: number
  page_size: number
  current_page: number
  total_pages: number
  results: T[]
  next: string | null
  previous: string | null
}
type CursorPage<T> = { results: T[]; next: string | null; previous: string | null }

export function useDiscoverHubs(options?: {
  enabled?: boolean
  vehicleId?: string | null
  lat?: number | null
  lng?: number | null
  openNow?: boolean
}) {
  const query = useFetchData<DiscoverHubApi[]>(
    SWAP_API.discoverHubs,
    {
      ...(options?.vehicleId ? { vehicle: options.vehicleId } : {}),
      ...(options?.lat != null ? { lat: options.lat } : {}),
      ...(options?.lng != null ? { lng: options.lng } : {}),
      ...(options?.openNow ? { open_now: true } : {}),
    },
    {
      enabled: options?.enabled !== false,
      staleTime: 30_000,
      keepPreviousData: true,
    },
  )
  return { ...query, hubs: query.data ?? [] }
}

export function useMyVehicles(options?: {
  enabled?: boolean
  page?: number
  pageSize?: number
}) {
  const page = options?.page ?? 1
  const pageSize = Math.min(options?.pageSize ?? 25, 100)
  const query = useFetchData<PageNumberPaginated<LiveVehicleApi>>(
    SWAP_API.vehicles,
    { page, page_size: pageSize },
    {
      enabled: options?.enabled !== false,
      staleTime: 10_000,
      refetchOnWindowFocus: true,
      keepPreviousData: true,
    },
  )
  return {
    ...query,
    vehicles: query.data?.results ?? [],
    count: query.data?.count ?? 0,
    totalPages: query.data?.total_pages ?? 1,
    currentPage: query.data?.current_page ?? page,
    pageSize,
  }
}

export function useVehicleModels(options?: { enabled?: boolean }) {
  const query = useFetchData<VehicleModelApi[]>(
    `${SWAP_API.vehicles}models/`,
    undefined,
    {
      enabled: options?.enabled !== false,
      staleTime: 5 * 60_000,
    },
  )
  return { ...query, models: query.data ?? [] }
}

export function useCreateVehicle() {
  return usePostData<VehicleCreatePayload, VehicleDetailApi>(
    SWAP_API.vehicles,
    [SWAP_API.vehicles],
    { silentError: true },
  )
}

export function useHoldPolicy(options?: { enabled?: boolean }) {
  const query = useFetchData<HoldPolicyApi>(
    SWAP_API.holdPolicy,
    undefined,
    {
      enabled: options?.enabled !== false,
      staleTime: 5 * 60_000,
    },
  )
  return {
    ...query,
    defaultHoldMinutes: query.data?.default_hold_minutes ?? 15,
    maxExtendMinutes: query.data?.max_extend_minutes ?? 15,
  }
}

export function useMyReservations(options?: {
  enabled?: boolean
  status?: string
}) {
  const query = useFetchData<CursorPage<ReservationApi>>(
    SWAP_API.reservations,
    {
      page_size: 25,
      ...(options?.status ? { status: options.status } : {}),
    },
    {
      enabled: options?.enabled !== false,
      staleTime: 15_000,
      keepPreviousData: true,
      refetchOnWindowFocus: true,
    },
  )
  return { ...query, reservations: query.data?.results ?? [] }
}

export function useMySwaps(options?: { enabled?: boolean; page_size?: number }) {
  const query = useFetchData<CursorPage<SwapListApi>>(
    SWAP_API.swaps,
    { page_size: options?.page_size ?? 25 },
    {
      enabled: options?.enabled !== false,
      staleTime: 30_000,
      keepPreviousData: true,
    },
  )
  return { ...query, swaps: query.data?.results ?? [] }
}

export function useCreateReservation() {
  return usePostData<ReservationCreatePayload, ReservationApi>(
    SWAP_API.reservations,
    [SWAP_API.reservations, '/finance/wallets/mine/'],
    { silentError: true },
  )
}

export function useCancelReservation() {
  return usePostData<{ id: string }, { status: string; id: string }>(
    (v) => SWAP_API.reservationCancel(v.id),
    [SWAP_API.reservations, '/finance/wallets/mine/'],
    { body: () => ({}), silentError: true },
  )
}

export type BlockedVehicleApi = { vehicle: string; plate: string; battery: string; code: string; message: string }
export type BookingPrecheckApi = {
  ok: boolean
  code?: string
  message?: string
  blocked_vehicles?: BlockedVehicleApi[]
}

/**
 * What would refuse a booking, checked before the steps: a paused account
 * blocks everything; a pack past its 48 h return window blocks only its vehicle.
 */
export function useBookingPrecheck(enabled: boolean) {
  const query = useFetchData<BookingPrecheckApi>(SWAP_API.precheck, undefined, {
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  })
  const blockedByVehicle = new Map(
    (query.data?.blocked_vehicles ?? []).map((b) => [b.vehicle, b.message] as const),
  )
  return {
    ...query,
    blockedMessage: query.data && !query.data.ok ? (query.data.message ?? null) : null,
    blockedByVehicle,
  }
}
