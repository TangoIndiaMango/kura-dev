import { useEffect, useState } from 'react'
import { useFetchData, usePostData } from '@shared/hooks/api'
import { ALERTS_ENDPOINTS } from '../constants'
import type {
  AlertDetailApi,
  AlertListApi,
  AlertNotePayload,
  AlertStats,
  CursorPaginated,
} from '../types'
import { useCapabilities } from '@/features/auth/useCapabilities'

const INVALIDATE = [ALERTS_ENDPOINTS.list, ALERTS_ENDPOINTS.stats]

function cursorFromLink(link: string | null | undefined): string | undefined {
  if (!link) return undefined
  try {
    return new URL(link).searchParams.get('cursor') ?? undefined
  } catch {
    return undefined
  }
}

function useDocumentVisible() {
  const [visible, setVisible] = useState(
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true,
  )
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])
  return visible
}

export function useAlerts(
  params?: {
    status?: string
    severity?: string
    kind?: string
    hub?: string
    search?: string
    start_date?: string
    end_date?: string
    cursor?: string
    page_size?: number
  },
  options?: { enabled?: boolean; poll?: boolean },
) {
  const { can } = useCapabilities()
  const visible = useDocumentVisible()
  const enabled = options?.enabled !== false && can('alerts:read')
  const poll = options?.poll !== false && visible && enabled
  const query = useFetchData<CursorPaginated<AlertListApi>>(
    ALERTS_ENDPOINTS.list,
    {
      page_size: params?.page_size ?? 25,
      ...(params?.status && params.status !== 'all'
        ? { status: params.status }
        : {}),
      ...(params?.severity && params.severity !== 'all'
        ? { severity: params.severity }
        : {}),
      ...(params?.kind ? { kind: params.kind } : {}),
      ...(params?.hub ? { hub: params.hub } : {}),
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.start_date ? { start_date: params.start_date } : {}),
      ...(params?.end_date ? { end_date: params.end_date } : {}),
      ...(params?.cursor ? { cursor: params.cursor } : {}),
    },
    {
      enabled,
      keepPreviousData: true,
      staleTime: 15_000,
      refetchInterval: poll ? 30_000 : false,
    },
  )
  const next = query.data?.next ?? null
  const previous = query.data?.previous ?? null
  return {
    ...query,
    alerts: query.data?.results ?? [],
    next,
    previous,
    nextCursor: cursorFromLink(next),
    previousCursor: cursorFromLink(previous),
  }
}

export function useAlertStats(params?: {
  start_date?: string
  end_date?: string
  enabled?: boolean
  poll?: boolean
}) {
  const { can } = useCapabilities()
  const visible = useDocumentVisible()
  const enabled = params?.enabled !== false && can('alerts:read')
  const poll = params?.poll !== false && visible && enabled
  return useFetchData<AlertStats>(
    ALERTS_ENDPOINTS.stats,
    {
      ...(params?.start_date ? { start_date: params.start_date } : {}),
      ...(params?.end_date ? { end_date: params.end_date } : {}),
    },
    {
      enabled,
      keepPreviousData: true,
      staleTime: 15_000,
      refetchInterval: poll ? 30_000 : false,
    },
  )
}

export function useAlert(id: string | null | undefined, options?: { enabled?: boolean }) {
  const { can } = useCapabilities()
  const alertId = id ?? ''
  const enabled =
    Boolean(alertId) && options?.enabled !== false && can('alerts:read')
  const query = useFetchData<AlertDetailApi>(
    alertId ? ALERTS_ENDPOINTS.alert(alertId) : ALERTS_ENDPOINTS.list,
    undefined,
    { enabled, staleTime: 10_000 },
  )
  return { ...query, alert: query.data ?? null }
}

export function useAckAlert(alertId: string) {
  return usePostData<AlertNotePayload, AlertDetailApi>(
    ALERTS_ENDPOINTS.ack(alertId),
    INVALIDATE,
    { silentError: true },
  )
}

export function useResolveAlert(alertId: string) {
  return usePostData<AlertNotePayload, AlertDetailApi>(
    ALERTS_ENDPOINTS.resolve(alertId),
    INVALIDATE,
    { silentError: true },
  )
}

export function useEscalateAlert(alertId: string) {
  return usePostData<AlertNotePayload, AlertDetailApi>(
    ALERTS_ENDPOINTS.escalate(alertId),
    INVALIDATE,
    { silentError: true },
  )
}
