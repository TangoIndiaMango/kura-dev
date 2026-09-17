import { useFetchData, usePostData } from '@shared/hooks/api'
import { useCapabilities } from '../../auth/useCapabilities'
import { RISK_ENDPOINTS } from '../constants'
import type {
  CursorPaginated,
  FlagRiskPayload,
  RiskEventDetailApi,
  RiskEventListApi,
  RiskEventStats,
  ReviewRiskPayload,
} from '../types'

const INVALIDATE = [RISK_ENDPOINTS.events, RISK_ENDPOINTS.stats]

function cursorFromLink(link: string | null | undefined): string | undefined {
  if (!link) return undefined
  try {
    return new URL(link).searchParams.get('cursor') ?? undefined
  } catch {
    return undefined
  }
}

export function useRiskEvents(
  params?: {
    account?: string
    status?: string
    severity?: string
    rule?: string
    search?: string
    start_date?: string
    end_date?: string
    cursor?: string
    page_size?: number
  },
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('risk:read')
  const query = useFetchData<CursorPaginated<RiskEventListApi>>(
    RISK_ENDPOINTS.events,
    {
      page_size: params?.page_size ?? 25,
      ...(params?.account ? { account: params.account } : {}),
      ...(params?.status && params.status !== 'all'
        ? { status: params.status }
        : {}),
      ...(params?.severity && params.severity !== 'all'
        ? { severity: params.severity }
        : {}),
      ...(params?.rule ? { rule: params.rule } : {}),
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.start_date ? { start_date: params.start_date } : {}),
      ...(params?.end_date ? { end_date: params.end_date } : {}),
      ...(params?.cursor ? { cursor: params.cursor } : {}),
    },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  const next = query.data?.next ?? null
  const previous = query.data?.previous ?? null
  return {
    ...query,
    events: query.data?.results ?? [],
    next,
    previous,
    nextCursor: cursorFromLink(next),
    previousCursor: cursorFromLink(previous),
  }
}

export function useRiskEventStats(params?: {
  start_date?: string
  end_date?: string
  enabled?: boolean
}) {
  const { can } = useCapabilities()
  const enabled = params?.enabled !== false && can('risk:read')
  return useFetchData<RiskEventStats>(
    RISK_ENDPOINTS.stats,
    {
      ...(params?.start_date ? { start_date: params.start_date } : {}),
      ...(params?.end_date ? { end_date: params.end_date } : {}),
    },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
}

export function useAccountRiskEvents(
  accountId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const id = accountId ?? ''
  return useRiskEvents(
    { account: id || undefined, page_size: 25 },
    { enabled: Boolean(id) && options?.enabled !== false },
  )
}

export function useRiskEvent(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const eventId = id ?? ''
  const enabled =
    Boolean(eventId) && options?.enabled !== false && can('risk:read')
  const query = useFetchData<RiskEventDetailApi>(
    eventId ? RISK_ENDPOINTS.event(eventId) : RISK_ENDPOINTS.events,
    undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, event: query.data ?? null }
}

export function useFlagRiskEvent() {
  return usePostData<FlagRiskPayload, RiskEventDetailApi>(
    RISK_ENDPOINTS.events,
    INVALIDATE,
    { silentError: true },
  )
}

export function useReviewRiskEvent(eventId: string) {
  return usePostData<ReviewRiskPayload, RiskEventDetailApi>(
    RISK_ENDPOINTS.review(eventId),
    INVALIDATE,
    { silentError: true },
  )
}
