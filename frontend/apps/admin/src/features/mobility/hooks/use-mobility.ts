import { useFetchData } from '@shared/hooks/api'
import { MOBILITY_ENDPOINTS, mobilityQueryKeys } from '../constants'
import type {
  CursorPaginated,
  PageNumberPaginated,
  PlanApi,
  SubscriptionListApi,
  SwapListApi,
  VehicleListApi,
} from '../types'

export function useAccountVehicles(
  accountId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const id = accountId ?? ''
  const enabled = Boolean(id) && options?.enabled !== false
  const query = useFetchData<PageNumberPaginated<VehicleListApi>>(
    MOBILITY_ENDPOINTS.vehicles,
    { account: id, page_size: 50 },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  return {
    ...query,
    vehicles: query.data?.results ?? [],
    queryKey: mobilityQueryKeys.vehiclesByAccount(id),
  }
}

export function useAccountSubscriptions(
  accountId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const id = accountId ?? ''
  const enabled = Boolean(id) && options?.enabled !== false
  const query = useFetchData<PageNumberPaginated<SubscriptionListApi>>(
    MOBILITY_ENDPOINTS.subscriptions,
    { account: id, page_size: 50 },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  return {
    ...query,
    subscriptions: query.data?.results ?? [],
    queryKey: mobilityQueryKeys.subscriptionsByAccount(id),
  }
}

export function useCataloguePlans(
  params?: {
    page?: number
    page_size?: number
    vehicle_type?: string
    status?: string
    is_active?: boolean | string
  },
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled !== false
  const query = useFetchData<PageNumberPaginated<PlanApi>>(
    MOBILITY_ENDPOINTS.plans,
    {
      page: params?.page ?? 1,
      page_size: params?.page_size ?? 50,
      ...(params?.is_active != null ? { is_active: params.is_active } : {}),
      ...(params?.vehicle_type ? { vehicle_type: params.vehicle_type } : {}),
      ...(params?.status && params.status !== 'all'
        ? { status: params.status }
        : {}),
    },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  return {
    ...query,
    plans: query.data?.results ?? [],
    count: query.data?.count ?? 0,
    totalPages: query.data?.total_pages ?? 1,
    queryKey: mobilityQueryKeys.plans(),
  }
}

export function usePlan(
  planId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const id = planId ?? ''
  const enabled = Boolean(id) && options?.enabled !== false
  const query = useFetchData<PlanApi>(
    id ? MOBILITY_ENDPOINTS.plan(id) : MOBILITY_ENDPOINTS.plans,
    undefined,
    { enabled, staleTime: 15_000 },
  )
  return {
    ...query,
    plan: query.data ?? null,
    queryKey: mobilityQueryKeys.plan(id),
  }
}

export function usePlanSubscriptions(
  planId: string | null | undefined,
  params?: { page?: number; page_size?: number; status?: string },
  options?: { enabled?: boolean },
) {
  const id = planId ?? ''
  const enabled = Boolean(id) && options?.enabled !== false
  const query = useFetchData<PageNumberPaginated<SubscriptionListApi>>(
    MOBILITY_ENDPOINTS.subscriptions,
    {
      plan: id,
      page: params?.page ?? 1,
      page_size: params?.page_size ?? 10,
      ...(params?.status ? { status: params.status } : {}),
    },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  return {
    ...query,
    subscriptions: query.data?.results ?? [],
    count: query.data?.count ?? 0,
    totalPages: query.data?.total_pages ?? 1,
    currentPage: query.data?.current_page ?? params?.page ?? 1,
    queryKey: mobilityQueryKeys.subscriptionsByPlan(id),
  }
}

export function useAccountSwaps(
  accountId: string | null | undefined,
  options?: { enabled?: boolean; page_size?: number },
) {
  const id = accountId ?? ''
  const enabled = Boolean(id) && options?.enabled !== false
  const query = useFetchData<CursorPaginated<SwapListApi>>(
    MOBILITY_ENDPOINTS.swaps,
    { account: id, page_size: options?.page_size ?? 10 },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  return {
    ...query,
    swaps: query.data?.results ?? [],
    queryKey: mobilityQueryKeys.swapsByAccount(id),
  }
}
