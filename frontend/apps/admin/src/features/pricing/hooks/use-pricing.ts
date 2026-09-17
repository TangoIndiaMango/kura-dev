import {
  useFetchData,
  usePostData,
  usePutData,
  usePatchData,
} from '@shared/hooks/api'
import { useCapabilities } from '../../auth/useCapabilities'
import { PRICING_ENDPOINTS, pricingQueryKeys } from '../constants'
import type {
  HoldPolicyApi,
  PageNumberPaginated,
  PlanWritePayload,
  PriceMatrixApi,
  PriceMatrixCreatePayload,
} from '../types'
import type { PlanApi } from '@features/mobility'

const MATRIX_INVALIDATE = [PRICING_ENDPOINTS.matrices]
const PLAN_INVALIDATE = [PRICING_ENDPOINTS.plans]
const EMPTY_MATRICES: PriceMatrixApi[] = []

export function usePriceMatrices(
  params?: { page?: number; page_size?: number; status?: string },
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('tariffs:manage')
  const query = useFetchData<PageNumberPaginated<PriceMatrixApi>>(
    PRICING_ENDPOINTS.matrices,
    {
      page: params?.page ?? 1,
      page_size: params?.page_size ?? 50,
      ...(params?.status ? { status: params.status } : {}),
    },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  return {
    ...query,
    matrices: query.data?.results ?? EMPTY_MATRICES,
    count: query.data?.count ?? 0,
    queryKey: pricingQueryKeys.matrices(),
  }
}

export function usePriceMatrix(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const matrixId = id ?? ''
  const enabled =
    Boolean(matrixId) && options?.enabled !== false && can('tariffs:manage')
  const query = useFetchData<PriceMatrixApi>(
    matrixId ? PRICING_ENDPOINTS.matrix(matrixId) : PRICING_ENDPOINTS.matrices,
    undefined,
    { enabled, staleTime: 15_000 },
  )
  return {
    ...query,
    matrix: query.data ?? null,
    queryKey: pricingQueryKeys.matrix(matrixId),
  }
}

export function useCreatePriceMatrix() {
  return usePostData<PriceMatrixCreatePayload, PriceMatrixApi>(
    PRICING_ENDPOINTS.matrices,
    MATRIX_INVALIDATE,
    { silentError: true },
  )
}

export function useActivatePriceMatrix(matrixId: string) {
  return usePostData<Record<string, never>, PriceMatrixApi>(
    PRICING_ENDPOINTS.activateMatrix(matrixId),
    [...MATRIX_INVALIDATE, PRICING_ENDPOINTS.matrix(matrixId)],
    { silentError: true },
  )
}

export function useSchedulePriceMatrix(matrixId: string) {
  return usePostData<
    { effective_from?: string; send_customer_notice?: boolean },
    PriceMatrixApi
  >(
    PRICING_ENDPOINTS.scheduleMatrix(matrixId),
    [...MATRIX_INVALIDATE, PRICING_ENDPOINTS.matrix(matrixId)],
    { silentError: true },
  )
}

export function useRejectPriceMatrix(matrixId: string) {
  return usePostData<{ reason?: string }, PriceMatrixApi>(
    PRICING_ENDPOINTS.rejectMatrix(matrixId),
    [...MATRIX_INVALIDATE, PRICING_ENDPOINTS.matrix(matrixId)],
    { silentError: true },
  )
}

export function useHoldPolicy(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false
  const query = useFetchData<HoldPolicyApi>(
    PRICING_ENDPOINTS.holdPolicy,
    undefined,
    { enabled, staleTime: 60_000 },
  )
  return {
    ...query,
    policy: query.data ?? null,
    queryKey: pricingQueryKeys.holdPolicy(),
  }
}

export function useUpdateHoldPolicy() {
  return usePutData<
    { default_hold_minutes: number; max_extend_minutes: number },
    HoldPolicyApi
  >(PRICING_ENDPOINTS.holdPolicy, [PRICING_ENDPOINTS.holdPolicy], {
    silentError: true,
  })
}

export function useCreatePlan() {
  return usePostData<PlanWritePayload, PlanApi>(
    PRICING_ENDPOINTS.plans,
    PLAN_INVALIDATE,
    { silentError: true },
  )
}

export function useUpdatePlan(planId: string) {
  return usePatchData<PlanWritePayload, PlanApi>(
    PRICING_ENDPOINTS.plan(planId),
    [...PLAN_INVALIDATE, PRICING_ENDPOINTS.plan(planId)],
    { silentError: true },
  )
}

export function useActivatePlan(planId: string) {
  return usePostData<Record<string, never>, PlanApi>(
    PRICING_ENDPOINTS.activatePlan(planId),
    [...PLAN_INVALIDATE, PRICING_ENDPOINTS.plan(planId)],
    { silentError: true },
  )
}

export function useDeactivatePlan(planId: string) {
  return usePostData<Record<string, never>, PlanApi>(
    PRICING_ENDPOINTS.deactivatePlan(planId),
    [...PLAN_INVALIDATE, PRICING_ENDPOINTS.plan(planId)],
    { silentError: true },
  )
}
