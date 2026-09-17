import { useFetchData, usePatchData, usePostData } from '@shared/hooks/api'
import { useCapabilities } from '../../auth/useCapabilities'
import { VEHICLES_ENDPOINTS } from '../constants'
import type {
  PageNumberPaginated,
  VehicleModelApi,
  VehicleModelStats,
  VehicleModelWritePayload,
} from '../types'

const MODEL_INVALIDATE = [
  VEHICLES_ENDPOINTS.vehicleModels.list,
  VEHICLES_ENDPOINTS.vehicleModels.stats,
  VEHICLES_ENDPOINTS.models,
]

const EMPTY_MODELS: VehicleModelApi[] = []

/** Catalogue for searchable dropdowns (Add Vehicle) — full unpaginated list. */
export function useVehicleModels(options?: { enabled?: boolean }) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('vehicles:read')
  const query = useFetchData<VehicleModelApi[]>(
    VEHICLES_ENDPOINTS.models,
    undefined,
    { enabled, staleTime: 60_000 },
  )
  return {
    ...query,
    data: query.data ?? EMPTY_MODELS,
  }
}

export function useVehicleModelsList(
  params?: {
    search?: string
    vehicle_type?: string
    page?: number
    page_size?: number
  },
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('vehicles:read')
  const query = useFetchData<PageNumberPaginated<VehicleModelApi>>(
    VEHICLES_ENDPOINTS.vehicleModels.list,
    {
      page: params?.page ?? 1,
      page_size: params?.page_size ?? 10,
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.vehicle_type && params.vehicle_type !== 'all'
        ? { vehicle_type: params.vehicle_type }
        : {}),
    },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  return {
    ...query,
    models: query.data?.results ?? EMPTY_MODELS,
    count: query.data?.count ?? 0,
    totalPages: query.data?.total_pages ?? 1,
    currentPage: query.data?.current_page ?? params?.page ?? 1,
  }
}

export function useVehicleModelStats(options?: { enabled?: boolean }) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('vehicles:read')
  return useFetchData<VehicleModelStats>(
    VEHICLES_ENDPOINTS.vehicleModels.stats,
    undefined,
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
}

export function useVehicleModel(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const modelId = id ?? ''
  const enabled =
    Boolean(modelId) && options?.enabled !== false && can('vehicles:read')
  const query = useFetchData<VehicleModelApi>(
    modelId
      ? VEHICLES_ENDPOINTS.vehicleModels.detail(modelId)
      : VEHICLES_ENDPOINTS.vehicleModels.list,
    undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, model: query.data ?? null }
}

export function useCreateVehicleModel() {
  return usePostData<VehicleModelWritePayload, VehicleModelApi>(
    VEHICLES_ENDPOINTS.vehicleModels.list,
    MODEL_INVALIDATE,
    { silentError: true },
  )
}

export function useUpdateVehicleModel(modelId: string) {
  return usePatchData<Partial<VehicleModelWritePayload>, VehicleModelApi>(
    VEHICLES_ENDPOINTS.vehicleModels.detail(modelId),
    [...MODEL_INVALIDATE, VEHICLES_ENDPOINTS.vehicleModels.detail(modelId)],
    { silentError: true },
  )
}
