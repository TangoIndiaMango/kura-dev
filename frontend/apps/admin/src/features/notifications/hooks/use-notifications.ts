import { useFetchData, usePostData } from '@shared/hooks/api'
import {
  ADMIN_LIST_PAGE_SIZE,
  cursorFromLink,
} from '@shared/utils/cursor-pagination'

export const NOTIFICATIONS_ENDPOINTS = {
  list: '/notifications/',
  stats: '/notifications/stats/',
  read: (id: string) => `/notifications/${id}/read/`,
  readAll: '/notifications/read-all/',
} as const

export type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export type NotificationApi = {
  id: string
  at: string
  title: string
  body: string
  source: string
  severity: NotificationSeverity | string
  channel: string
  status: string
  link_path: string
  params: Record<string, unknown>
  read_at: string | null
  is_read: boolean
  template_code: string
}

type CursorPage<T> = {
  results: T[]
  next: string | null
  previous: string | null
}

export type NotificationListParams = {
  unread?: boolean
  search?: string
  source?: string
  severity?: string
  start_date?: string
  end_date?: string
  page_size?: number
  cursor?: string
}

export function useNotifications(params?: NotificationListParams) {
  const query = useFetchData<CursorPage<NotificationApi>>(
    NOTIFICATIONS_ENDPOINTS.list,
    {
      ...(params?.unread != null ? { unread: params.unread } : {}),
      ...(params?.search ? { q: params.search, search: params.search } : {}),
      ...(params?.source ? { source: params.source } : {}),
      ...(params?.severity ? { severity: params.severity } : {}),
      ...(params?.start_date ? { start_date: params.start_date } : {}),
      ...(params?.end_date ? { end_date: params.end_date } : {}),
      page_size: params?.page_size ?? ADMIN_LIST_PAGE_SIZE,
      ...(params?.cursor ? { cursor: params.cursor } : {}),
    },
    { keepPreviousData: true },
  )
  return {
    ...query,
    notifications: query.data?.results ?? [],
    next: query.data?.next ?? null,
    previous: query.data?.previous ?? null,
    nextCursor: cursorFromLink(query.data?.next),
    previousCursor: cursorFromLink(query.data?.previous),
    isPending: query.isPending,
    isFetching: query.isFetching,
  }
}

export function useNotificationStats() {
  return useFetchData<{
    totals: { all: number; unread: number; last_7d: number }
  }>(NOTIFICATIONS_ENDPOINTS.stats)
}

export function useMarkNotificationRead() {
  return usePostData<string, NotificationApi>(
    (id) => NOTIFICATIONS_ENDPOINTS.read(id),
    [NOTIFICATIONS_ENDPOINTS.list, NOTIFICATIONS_ENDPOINTS.stats],
    { silentError: true, body: () => ({}) },
  )
}

export function useMarkAllNotificationsRead() {
  return usePostData<Record<string, never>, { updated: number }>(
    NOTIFICATIONS_ENDPOINTS.readAll,
    [NOTIFICATIONS_ENDPOINTS.list, NOTIFICATIONS_ENDPOINTS.stats],
    { silentError: true, body: () => ({}) },
  )
}
