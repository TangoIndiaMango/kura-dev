import { useFetchData, usePatchData, usePostData } from '@shared/hooks/api'
import { useCapabilities } from '../../auth/useCapabilities'
import { VEHICLES_ENDPOINTS } from '../constants'
import type {
  PageNumberPaginated,
  VehicleDetailApi,
  VehicleListApi,
  VehicleNotePayload,
  VehicleStats,
  VehicleStatusPayload,
  VehicleWritePayload,
} from '../types'

const INVALIDATE = [VEHICLES_ENDPOINTS.list, VEHICLES_ENDPOINTS.stats]

const EMPTY_VEHICLES: VehicleListApi[] = []

export function useVehicles(
  params?: {
    search?: string
    status?: string
    page?: number
    page_size?: number
  },
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('vehicles:read')
  const query = useFetchData<PageNumberPaginated<VehicleListApi>>(
    VEHICLES_ENDPOINTS.list,
    {
      page: params?.page ?? 1,
      page_size: params?.page_size ?? 10,
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.status && params.status !== 'all'
        ? { status: params.status }
        : {}),
    },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  return {
    ...query,
    vehicles: query.data?.results ?? EMPTY_VEHICLES,
    count: query.data?.count ?? 0,
    totalPages: query.data?.total_pages ?? 1,
    currentPage: query.data?.current_page ?? params?.page ?? 1,
  }
}

export function useVehicleStats(options?: { enabled?: boolean }) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('vehicles:read')
  return useFetchData<VehicleStats>(VEHICLES_ENDPOINTS.stats, undefined, {
    enabled,
    keepPreviousData: true,
    staleTime: 30_000,
  })
}

export function useVehicle(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const vehicleId = id ?? ''
  const enabled =
    Boolean(vehicleId) && options?.enabled !== false && can('vehicles:read')
  const query = useFetchData<VehicleDetailApi>(
    vehicleId ? VEHICLES_ENDPOINTS.vehicle(vehicleId) : VEHICLES_ENDPOINTS.list,
    undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, vehicle: query.data ?? null }
}

export {
  useVehicleModels,
  useVehicleModelsList,
  useVehicleModelStats,
  useVehicleModel,
  useCreateVehicleModel,
  useUpdateVehicleModel,
} from './use-vehicle-models'

export function useCreateVehicle() {
  return usePostData<VehicleWritePayload, VehicleDetailApi>(
    VEHICLES_ENDPOINTS.list,
    INVALIDATE,
    { silentError: true },
  )
}

export function useUpdateVehicle(vehicleId: string) {
  return usePatchData<Partial<VehicleWritePayload>, VehicleDetailApi>(
    VEHICLES_ENDPOINTS.vehicle(vehicleId),
    [...INVALIDATE, VEHICLES_ENDPOINTS.vehicle(vehicleId)],
    { silentError: true },
  )
}

export function useSetVehicleStatus(vehicleId: string) {
  return usePostData<VehicleStatusPayload, VehicleDetailApi>(
    VEHICLES_ENDPOINTS.status(vehicleId),
    [...INVALIDATE, VEHICLES_ENDPOINTS.vehicle(vehicleId)],
    { silentError: true },
  )
}

export function useRotateVehicleQr(vehicleId: string) {
  return usePostData<Record<string, never>, { qr: string }>(
    VEHICLES_ENDPOINTS.rotateQr(vehicleId),
    [VEHICLES_ENDPOINTS.vehicle(vehicleId)],
    { silentError: true },
  )
}

export function useRetireVehicle(vehicleId: string) {
  return usePostData<VehicleNotePayload, VehicleDetailApi>(
    VEHICLES_ENDPOINTS.retire(vehicleId),
    [...INVALIDATE, VEHICLES_ENDPOINTS.vehicle(vehicleId)],
    { silentError: true },
  )
}

export function useAssignVehicleDriver(vehicleId: string) {
  return usePostData<{ driver_id: string | null }, VehicleDetailApi>(
    VEHICLES_ENDPOINTS.assignDriver(vehicleId),
    [...INVALIDATE, VEHICLES_ENDPOINTS.vehicle(vehicleId)],
    { silentError: true },
  )
}

export type VehicleCommandRow = {
  id: string
  kind: string
  status: string
  note: string
  error: string
  created_at: string
  acked_at: string | null
}

export function useVehicleCommands(
  vehicleId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const id = vehicleId ?? ''
  const enabled =
    Boolean(id) && options?.enabled !== false && can('vehicles:read')
  const query = useFetchData<VehicleCommandRow[]>(
    id ? VEHICLES_ENDPOINTS.commands(id) : VEHICLES_ENDPOINTS.list,
    undefined,
    { enabled, staleTime: 10_000 },
  )
  return { ...query, commands: query.data ?? [] }
}

export function useEnqueueVehicleCommand(vehicleId: string) {
  return usePostData<{ kind: string; note?: string }, VehicleCommandRow>(
    VEHICLES_ENDPOINTS.command(vehicleId),
    [VEHICLES_ENDPOINTS.commands(vehicleId), VEHICLES_ENDPOINTS.vehicle(vehicleId)],
    { silentError: true },
  )
}

export function useRotateVehicleIotKey(vehicleId: string) {
  return usePostData<
    Record<string, never>,
    { vehicle_id: string; hardware_id: string; api_key: string; hint: string }
  >(VEHICLES_ENDPOINTS.rotateIotKey(vehicleId), [VEHICLES_ENDPOINTS.vehicle(vehicleId)], {
    silentError: true,
  })
}

type CursorPage<T> = {
  results: T[]
  next: string | null
  previous: string | null
}

export type VehicleSwapRow = {
  id: string
  hub: string
  hub_code: string | null
  hub_name: string | null
  returned_serial: string | null
  issued_serial: string | null
  returned_charge_pct: number
  issued_charge_pct: number
  payment_mode: string
  amount_kobo: number
  status: string
  mismatch_flag: boolean
  created_at: string
}

export type VehicleReservationRow = {
  id: string
  code: string
  hub: string
  hub_name: string
  hub_code: string
  status: string
  payment_mode: string
  expires_at: string
  created_at: string
}

export function useVehicleSwaps(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const vehicleId = id ?? ''
  const enabled =
    Boolean(vehicleId) &&
    options?.enabled !== false &&
    (can('swaps:read') || can('vehicles:read'))
  const query = useFetchData<CursorPage<VehicleSwapRow>>(
    '/mobility/swaps/',
    vehicleId ? { vehicle: vehicleId, page_size: 50 } : undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, swaps: query.data?.results ?? [] }
}

export function useVehicleReservations(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const vehicleId = id ?? ''
  const enabled =
    Boolean(vehicleId) &&
    options?.enabled !== false &&
    (can('swaps:read') || can('vehicles:read'))
  const query = useFetchData<CursorPage<VehicleReservationRow>>(
    '/mobility/reservations/',
    vehicleId ? { vehicle: vehicleId, page_size: 50 } : undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, reservations: query.data?.results ?? [] }
}

export { VEHICLES_ENDPOINTS }
