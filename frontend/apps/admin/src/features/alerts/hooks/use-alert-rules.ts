import { useFetchData, usePatchData, usePostData } from '@shared/hooks/api'
import { useCapabilities } from '@/features/auth/useCapabilities'
import { ALERTS_ENDPOINTS } from '../constants'

export type AlertRuleApi = {
  id: string
  name: string
  kind: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | string
  threshold: Record<string, unknown>
  channels: string[]
  cooldown_minutes: number
  status: 'ACTIVE' | 'PAUSED' | string
  created_at?: string
  updated_at?: string
}

export type AlertRuleWrite = {
  name: string
  kind: string
  severity?: string
  threshold?: Record<string, unknown>
  channels?: string[]
  cooldown_minutes?: number
  status?: string
}

type Page<T> = {
  count: number
  results: T[]
  current_page?: number
  total_pages?: number
}

const INVALIDATE = [ALERTS_ENDPOINTS.rules]

export function useAlertRules(options?: { enabled?: boolean }) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('alerts:read')
  const query = useFetchData<Page<AlertRuleApi>>(
    ALERTS_ENDPOINTS.rules,
    { page: 1, page_size: 100 },
    { enabled, staleTime: 30_000, keepPreviousData: true },
  )
  return {
    ...query,
    rules: query.data?.results ?? [],
    count: query.data?.count ?? 0,
  }
}

export function useAlertRule(id: string | undefined, options?: { enabled?: boolean }) {
  const { can } = useCapabilities()
  const enabled =
    Boolean(id) && options?.enabled !== false && can('alerts:read')
  return useFetchData<AlertRuleApi>(
    id ? ALERTS_ENDPOINTS.rule(id) : ALERTS_ENDPOINTS.rules,
    undefined,
    { enabled, staleTime: 15_000 },
  )
}

export function useCreateAlertRule() {
  return usePostData<AlertRuleWrite, AlertRuleApi>(ALERTS_ENDPOINTS.rules, INVALIDATE, {
    silentError: true,
  })
}

export function useUpdateAlertRule(id: string) {
  return usePatchData<Partial<AlertRuleWrite>, AlertRuleApi>(
    ALERTS_ENDPOINTS.rule(id),
    [...INVALIDATE, ALERTS_ENDPOINTS.rule(id)],
    { silentError: true },
  )
}
