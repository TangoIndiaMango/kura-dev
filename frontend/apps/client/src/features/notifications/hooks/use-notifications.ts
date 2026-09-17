import { useFetchData, usePostData } from '@shared/hooks/api'

export const NOTIFICATIONS_ENDPOINTS = {
  list: '/notifications/',
  stats: '/notifications/stats/',
  read: (id: string) => `/notifications/${id}/read/`,
  readAll: '/notifications/read-all/',
} as const

export type NotificationApi = {
  id: string
  at: string
  title: string
  body: string
  source: string
  severity: string
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

export function useNotifications(params?: { page_size?: number; enabled?: boolean }) {
  const query = useFetchData<CursorPage<NotificationApi>>(
    NOTIFICATIONS_ENDPOINTS.list,
    { page_size: params?.page_size ?? 40 },
    {
      enabled: params?.enabled !== false,
      keepPreviousData: true,
      staleTime: 30_000,
    },
  )
  return {
    ...query,
    notifications: query.data?.results ?? [],
  }
}

export function useNotificationStats(options?: { enabled?: boolean }) {
  return useFetchData<{
    totals: { all: number; unread: number; last_7d: number }
  }>(NOTIFICATIONS_ENDPOINTS.stats, undefined, {
    enabled: options?.enabled !== false,
    staleTime: 30_000,
  })
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

export function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return 'Just now'
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
