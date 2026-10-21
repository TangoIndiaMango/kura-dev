import { useFetchData } from '@shared/hooks/api'
import {
  ADMIN_LIST_PAGE_SIZE,
  cursorFromLink,
} from '@shared/utils/cursor-pagination'
import { useCapabilities } from '../../auth/useCapabilities'

export const AUDIT_ENDPOINTS = {
  list: '/audit/',
  stats: '/audit/stats/',
} as const

export type AuditEventApi = {
  id: string
  at: string
  action: string
  actor_email: string
  actor_name: string
  actor_role: string
  subject_type: string
  subject_id: string
  subject_label: string
  before: Record<string, unknown>
  after: Record<string, unknown>
  metadata: Record<string, unknown>
  ip_address: string | null
  request_id: string
}

type CursorPage<T> = {
  results: T[]
  next: string | null
  previous: string | null
}

export type AuditListParams = {
  search?: string
  subject_type?: string
  /** One id, or comma-separated (e.g. account id + owner user id). */
  subject_id?: string
  action?: string
  start_date?: string
  end_date?: string
  page_size?: number
  cursor?: string
  enabled?: boolean
}

export function useAuditEvents(params?: AuditListParams) {
  const { can } = useCapabilities()
  const enabled =
    (params?.enabled !== false) && can('audit:read')
  const query = useFetchData<CursorPage<AuditEventApi>>(
    AUDIT_ENDPOINTS.list,
    {
      ...(params?.search ? { q: params.search, search: params.search } : {}),
      ...(params?.subject_type ? { subject_type: params.subject_type } : {}),
      ...(params?.subject_id ? { subject_id: params.subject_id } : {}),
      ...(params?.action ? { action: params.action } : {}),
      ...(params?.start_date ? { start_date: params.start_date } : {}),
      ...(params?.end_date ? { end_date: params.end_date } : {}),
      page_size: params?.page_size ?? ADMIN_LIST_PAGE_SIZE,
      ...(params?.cursor ? { cursor: params.cursor } : {}),
    },
    { keepPreviousData: true, enabled },
  )
  return {
    ...query,
    events: query.data?.results ?? [],
    next: query.data?.next ?? null,
    previous: query.data?.previous ?? null,
    nextCursor: cursorFromLink(query.data?.next),
    previousCursor: cursorFromLink(query.data?.previous),
    isPending: query.isPending,
    isFetching: query.isFetching,
  }
}

export function useAuditStats(options?: { enabled?: boolean }) {
  const { can } = useCapabilities()
  const enabled = (options?.enabled !== false) && can('audit:read')
  return useFetchData<{ totals: { all: number; last_24h: number } }>(
    AUDIT_ENDPOINTS.stats,
    undefined,
    { enabled },
  )
}
