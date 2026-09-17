import { useFetchData, usePatchData, usePostData } from '@shared/hooks/api'
import { useCapabilities } from '../../auth/useCapabilities'
import { BATTERIES_ENDPOINTS } from '../constants'
import type {
  BatteryDetailApi,
  BatteryEventApi,
  BatteryLabelApi,
  BatteryListApi,
  BatteryNotePayload,
  BatteryStats,
  BatteryStatusPayload,
  BatteryTransferPayload,
  BatteryTypeApi,
  BatteryWritePayload,
  CursorPage,
  PageNumberPaginated,
} from '../types'

const INVALIDATE = [BATTERIES_ENDPOINTS.list, BATTERIES_ENDPOINTS.stats]
const EMPTY_BATTERIES: BatteryListApi[] = []

export function useBatteries(
  params?: {
    search?: string
    status?: string
    page?: number
    page_size?: number
    current_hub?: string
  },
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('batteries:read')
  const query = useFetchData<PageNumberPaginated<BatteryListApi>>(
    BATTERIES_ENDPOINTS.list,
    {
      page: params?.page ?? 1,
      page_size: params?.page_size ?? 10,
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.status && params.status !== 'all'
        ? { status: params.status }
        : {}),
      ...(params?.current_hub ? { current_hub: params.current_hub } : {}),
    },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  return {
    ...query,
    batteries: query.data?.results ?? EMPTY_BATTERIES,
    count: query.data?.count ?? 0,
    totalPages: query.data?.total_pages ?? 1,
    currentPage: query.data?.current_page ?? params?.page ?? 1,
  }
}

export function useBatteryStats(options?: { enabled?: boolean }) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('batteries:read')
  return useFetchData<BatteryStats>(BATTERIES_ENDPOINTS.stats, undefined, {
    enabled,
    keepPreviousData: true,
    staleTime: 30_000,
  })
}

export function useBatteryTypes(options?: { enabled?: boolean }) {
  const { can } = useCapabilities()
  const enabled =
    options?.enabled !== false &&
    (can('batteries:read') || can('engines:manage'))
  return useFetchData<BatteryTypeApi[]>(BATTERIES_ENDPOINTS.types, undefined, {
    enabled,
    staleTime: 60_000,
  })
}

export function useBattery(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const batteryId = id ?? ''
  const enabled =
    Boolean(batteryId) && options?.enabled !== false && can('batteries:read')
  const query = useFetchData<BatteryDetailApi>(
    batteryId ? BATTERIES_ENDPOINTS.battery(batteryId) : BATTERIES_ENDPOINTS.list,
    undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, battery: query.data ?? null }
}

export function useBatteryEvents(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const batteryId = id ?? ''
  const enabled =
    Boolean(batteryId) && options?.enabled !== false && can('batteries:read')
  const query = useFetchData<CursorPage<BatteryEventApi>>(
    batteryId ? BATTERIES_ENDPOINTS.events(batteryId) : BATTERIES_ENDPOINTS.list,
    undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, events: query.data?.results ?? [] }
}


export type BatterySwapRow = {
  id: string
  hub_code: string | null
  hub_name: string | null
  vehicle_plate: string | null
  returned_serial: string | null
  issued_serial: string | null
  returned_charge_pct: number
  issued_charge_pct: number
  amount_kobo: number
  status: string
  mismatch_flag: boolean
  created_at: string
}

export function useBatterySwaps(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const batteryId = id ?? ''
  const enabled =
    Boolean(batteryId) &&
    options?.enabled !== false &&
    (can('swaps:read') || can('batteries:read'))
  const query = useFetchData<CursorPage<BatterySwapRow>>(
    '/mobility/swaps/',
    batteryId ? { battery: batteryId } : undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, swaps: query.data?.results ?? [] }
}

export function useCreateBattery() {
  return usePostData<BatteryWritePayload, BatteryDetailApi>(
    BATTERIES_ENDPOINTS.list,
    INVALIDATE,
    { silentError: true },
  )
}

export function useUpdateBattery(batteryId: string) {
  return usePatchData<Partial<BatteryWritePayload>, BatteryDetailApi>(
    BATTERIES_ENDPOINTS.battery(batteryId),
    [...INVALIDATE, BATTERIES_ENDPOINTS.battery(batteryId)],
    { silentError: true },
  )
}

export function useSetBatteryStatus(batteryId: string) {
  return usePostData<BatteryStatusPayload, BatteryDetailApi>(
    BATTERIES_ENDPOINTS.status(batteryId),
    [
      ...INVALIDATE,
      BATTERIES_ENDPOINTS.battery(batteryId),
      BATTERIES_ENDPOINTS.events(batteryId),
    ],
    { silentError: true },
  )
}

export function useTransferBattery(batteryId: string) {
  return usePostData<BatteryTransferPayload, BatteryDetailApi>(
    BATTERIES_ENDPOINTS.transfer(batteryId),
    [
      ...INVALIDATE,
      BATTERIES_ENDPOINTS.battery(batteryId),
      BATTERIES_ENDPOINTS.events(batteryId),
    ],
    { silentError: true },
  )
}

export function useFaultBattery(batteryId: string) {
  return usePostData<BatteryNotePayload, BatteryDetailApi>(
    BATTERIES_ENDPOINTS.fault(batteryId),
    [
      ...INVALIDATE,
      BATTERIES_ENDPOINTS.battery(batteryId),
      BATTERIES_ENDPOINTS.events(batteryId),
    ],
    { silentError: true },
  )
}

export function useRetireBattery(batteryId: string) {
  return usePostData<BatteryNotePayload, BatteryDetailApi>(
    BATTERIES_ENDPOINTS.retire(batteryId),
    [
      ...INVALIDATE,
      BATTERIES_ENDPOINTS.battery(batteryId),
      BATTERIES_ENDPOINTS.events(batteryId),
    ],
    { silentError: true },
  )
}

export function useFoundBattery(batteryId: string) {
  return usePostData<BatteryNotePayload, BatteryDetailApi>(
    BATTERIES_ENDPOINTS.found(batteryId),
    [
      ...INVALIDATE,
      BATTERIES_ENDPOINTS.battery(batteryId),
      BATTERIES_ENDPOINTS.events(batteryId),
    ],
    { silentError: true },
  )
}

export function useBatteryLabel(
  batteryId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const id = batteryId ?? ''
  const enabled =
    Boolean(id) && options?.enabled !== false && can('batteries:manage')
  const query = useFetchData<BatteryLabelApi>(
    id ? BATTERIES_ENDPOINTS.label(id) : BATTERIES_ENDPOINTS.list,
    undefined,
    { enabled, staleTime: 60_000 },
  )
  return { ...query, label: query.data ?? null }
}

export { BATTERIES_ENDPOINTS }
