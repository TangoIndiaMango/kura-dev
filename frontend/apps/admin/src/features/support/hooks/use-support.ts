import { useFetchData, usePostData } from '@shared/hooks/api'
import { useCapabilities } from '../../auth/useCapabilities'
import { SUPPORT_ENDPOINTS } from '../constants'
import type {
  CursorPaginated,
  OpenCasePayload,
  SupportCaseDetailApi,
  SupportCaseListApi,
  SupportCaseStats,
} from '../types'

const INVALIDATE = [SUPPORT_ENDPOINTS.cases, SUPPORT_ENDPOINTS.stats]

function cursorFromLink(link: string | null | undefined): string | undefined {
  if (!link) return undefined
  try {
    return new URL(link).searchParams.get('cursor') ?? undefined
  } catch {
    return undefined
  }
}

export function useSupportCases(
  params?: {
    account?: string
    status?: string
    search?: string
    start_date?: string
    end_date?: string
    unassigned?: boolean
    sla?: string
    cursor?: string
    page_size?: number
  },
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('cases:read')
  const query = useFetchData<CursorPaginated<SupportCaseListApi>>(
    SUPPORT_ENDPOINTS.cases,
    {
      page_size: params?.page_size ?? 25,
      ...(params?.account ? { account: params.account } : {}),
      ...(params?.status && params.status !== 'all'
        ? { status: params.status }
        : {}),
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.start_date ? { start_date: params.start_date } : {}),
      ...(params?.end_date ? { end_date: params.end_date } : {}),
      ...(params?.unassigned ? { unassigned: true } : {}),
      ...(params?.sla ? { sla: params.sla } : {}),
      ...(params?.cursor ? { cursor: params.cursor } : {}),
    },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  const next = query.data?.next ?? null
  const previous = query.data?.previous ?? null
  return {
    ...query,
    cases: query.data?.results ?? [],
    next,
    previous,
    nextCursor: cursorFromLink(next),
    previousCursor: cursorFromLink(previous),
  }
}

export function useSupportCaseStats(params?: {
  start_date?: string
  end_date?: string
  enabled?: boolean
}) {
  const { can } = useCapabilities()
  const enabled = params?.enabled !== false && can('cases:read')
  return useFetchData<SupportCaseStats>(
    SUPPORT_ENDPOINTS.stats,
    {
      ...(params?.start_date ? { start_date: params.start_date } : {}),
      ...(params?.end_date ? { end_date: params.end_date } : {}),
    },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
}

export function useAccountCases(
  accountId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const id = accountId ?? ''
  return useSupportCases(
    { account: id || undefined, page_size: 25 },
    { enabled: Boolean(id) && options?.enabled !== false },
  )
}

export function useSupportCase(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const caseId = id ?? ''
  const enabled =
    Boolean(caseId) && options?.enabled !== false && can('cases:read')
  const query = useFetchData<SupportCaseDetailApi>(
    caseId ? SUPPORT_ENDPOINTS.case(caseId) : SUPPORT_ENDPOINTS.cases,
    undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, supportCase: query.data ?? null }
}

export function useOpenCase() {
  return usePostData<OpenCasePayload, SupportCaseDetailApi>(
    SUPPORT_ENDPOINTS.cases,
    INVALIDATE,
    { silentError: true },
  )
}

export function useAddCaseNote(caseId: string) {
  return usePostData<
    { body?: string; attachment_asset_id?: string },
    SupportCaseDetailApi
  >(SUPPORT_ENDPOINTS.notes(caseId), INVALIDATE, { silentError: true })
}

export function useSetCaseStatus(caseId: string) {
  return usePostData<{ status: string; note?: string }, SupportCaseDetailApi>(
    SUPPORT_ENDPOINTS.status(caseId),
    INVALIDATE,
    { silentError: true },
  )
}

export function useAssignCase(caseId: string) {
  return usePostData<
    { assigned_to_id: string | null },
    SupportCaseDetailApi
  >(SUPPORT_ENDPOINTS.assign(caseId), INVALIDATE, { silentError: true })
}
