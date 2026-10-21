import { useFetchData } from '@shared/hooks/api'
import {
  ADMIN_LIST_PAGE_SIZE,
  cursorFromLink,
} from '@shared/utils/cursor-pagination'
import { useCapabilities } from '@/features/auth/useCapabilities'

export type PspWebhookEventApi = {
  id: string
  psp: string
  psp_event_id: string
  event_kind: string
  status: string
  error: string
  created_at: string
}

type CursorPage<T> = {
  results: T[]
  next: string | null
  previous: string | null
}

export function usePspWebhookEvents(params?: {
  cursor?: string
  status?: string
  psp?: string
  page_size?: number
  enabled?: boolean
}) {
  const { can } = useCapabilities()
  const enabled = params?.enabled !== false && can('finance:read')
  const query = useFetchData<CursorPage<PspWebhookEventApi>>(
    '/webhooks/events/',
    {
      page_size: params?.page_size ?? ADMIN_LIST_PAGE_SIZE,
      ...(params?.cursor ? { cursor: params.cursor } : {}),
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.psp ? { psp: params.psp } : {}),
    },
    { enabled, keepPreviousData: true, staleTime: 20_000 },
  )
  return {
    ...query,
    events: query.data?.results ?? [],
    nextCursor: cursorFromLink(query.data?.next),
    previousCursor: cursorFromLink(query.data?.previous),
  }
}
