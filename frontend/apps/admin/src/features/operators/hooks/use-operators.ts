import { useFetchData, usePostData } from '@shared/hooks/api'
import {
  ACCOUNTS_ENDPOINTS,
  ACCOUNTS_QUERY_KEY,
} from '../constants/operators-api.constants'
import {
  mapAccountToOperatorRecord,
  type AccountCrmDetail,
  type AccountCrmList,
  type KycPayload,
  type PageNumberPaginated,
} from '../utils/map-account'

export type AccountStats = {
  totals: {
    all: number
    active: number
    suspended: number
    pending: number
    deregistered: number
  }
  kyc: {
    none: number
    provisional: number
    pending: number
    verified: number
    rejected: number
  }
  registrations: Array<{ label: string; count: number }>
}

import type { AccountDetailStats } from '../types'
export type { AccountDetailStats }

export function useOperators(params?: {
  search?: string
  status?: string
  kyc_status?: string
  page?: number
  page_size?: number
}) {
  const queryParams: Record<string, unknown> = {
    page: params?.page ?? 1,
    page_size: params?.page_size ?? 10,
  }
  if (params?.search) {
    queryParams.q = params.search
    queryParams.search = params.search
  }
  if (params?.status && params.status !== 'all') queryParams.status = params.status
  if (params?.kyc_status) queryParams.kyc_status = params.kyc_status

  const query = useFetchData<PageNumberPaginated<AccountCrmList>>(
    ACCOUNTS_ENDPOINTS.list,
    queryParams,
    { keepPreviousData: true },
  )

  return {
    ...query,
    operators: (query.data?.results ?? []).map(mapAccountToOperatorRecord),
    count: query.data?.count ?? 0,
    totalPages: query.data?.total_pages ?? 1,
    currentPage: query.data?.current_page ?? params?.page ?? 1,
    isPending: query.isPending,
    isFetching: query.isFetching,
  }
}

export function useOperatorStats(params?: {
  start_date?: string
  end_date?: string
}) {
  return useFetchData<AccountStats>(
    ACCOUNTS_ENDPOINTS.stats,
    {
      ...(params?.start_date ? { start_date: params.start_date } : {}),
      ...(params?.end_date ? { end_date: params.end_date } : {}),
    },
    { keepPreviousData: true },
  )
}

export function useOperatorDetailStats(
  id: string | undefined,
  params?: { start_date?: string; end_date?: string },
) {
  return useFetchData<AccountDetailStats>(
    id ? ACCOUNTS_ENDPOINTS.detailStats(id) : ACCOUNTS_ENDPOINTS.stats,
    params,
    { enabled: Boolean(id), keepPreviousData: true },
  )
}

export function useOperator(id: string | undefined) {
  const query = useFetchData<AccountCrmDetail>(
    id ? ACCOUNTS_ENDPOINTS.detail(id) : ACCOUNTS_ENDPOINTS.list,
    undefined,
    { enabled: Boolean(id) },
  )
  return {
    ...query,
    operator: query.data ? mapAccountToOperatorRecord(query.data) : null,
    account: query.data ?? null,
    isPending: query.isPending,
    isFetching: query.isFetching,
  }
}

export function useOperatorKyc(id: string | undefined) {
  return useFetchData<KycPayload>(
    id ? ACCOUNTS_ENDPOINTS.kyc(id) : ACCOUNTS_ENDPOINTS.list,
    undefined,
    { enabled: Boolean(id) },
  )
}

export function useVerifyOperatorKyc(id: string) {
  return usePostData<{ via?: string; note?: string }, KycPayload>(
    ACCOUNTS_ENDPOINTS.verifyKyc(id),
    [
      ACCOUNTS_QUERY_KEY,
      ACCOUNTS_ENDPOINTS.list,
      ACCOUNTS_ENDPOINTS.detail(id),
      ACCOUNTS_ENDPOINTS.kyc(id),
    ],
    { silentError: true },
  )
}

export function useRejectOperatorKyc(id: string) {
  return usePostData<{ reason: string }, KycPayload>(
    ACCOUNTS_ENDPOINTS.rejectKyc(id),
    [
      ACCOUNTS_QUERY_KEY,
      ACCOUNTS_ENDPOINTS.list,
      ACCOUNTS_ENDPOINTS.detail(id),
      ACCOUNTS_ENDPOINTS.kyc(id),
    ],
    { silentError: true },
  )
}

export function useRequestOperatorKycPhotos(id: string) {
  return usePostData<{ note: string }, KycPayload>(
    ACCOUNTS_ENDPOINTS.requestKycPhotos(id),
    [
      ACCOUNTS_QUERY_KEY,
      ACCOUNTS_ENDPOINTS.list,
      ACCOUNTS_ENDPOINTS.detail(id),
      ACCOUNTS_ENDPOINTS.kyc(id),
    ],
    { silentError: true },
  )
}

export function useNotifyOperator(id: string) {
  return usePostData<{ message: string }, AccountCrmDetail>(
    ACCOUNTS_ENDPOINTS.notify(id),
    [ACCOUNTS_QUERY_KEY, ACCOUNTS_ENDPOINTS.list, ACCOUNTS_ENDPOINTS.detail(id)],
    { silentError: true },
  )
}

export function useSuspendOperator(id: string) {
  return usePostData<{ reason: string }, AccountCrmDetail>(
    ACCOUNTS_ENDPOINTS.suspend(id),
    [ACCOUNTS_QUERY_KEY, ACCOUNTS_ENDPOINTS.list, ACCOUNTS_ENDPOINTS.detail(id)],
    { silentError: true },
  )
}

export function useReinstateOperator(id: string) {
  return usePostData<Record<string, never>, AccountCrmDetail>(
    ACCOUNTS_ENDPOINTS.reinstate(id),
    [ACCOUNTS_QUERY_KEY, ACCOUNTS_ENDPOINTS.list, ACCOUNTS_ENDPOINTS.detail(id)],
    { silentError: true, body: () => ({}) },
  )
}
