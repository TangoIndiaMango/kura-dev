/** Live cooperative catalogue for CRM selects. */
import { useFetchData, usePostData } from '@shared/hooks/api'

export const COOPERATIVES_ENDPOINTS = {
  list: '/cooperatives/',
  detail: (id: string) => `/cooperatives/${id}/`,
} as const

export const COOPERATIVES_QUERY_KEY = 'cooperatives'

export type CooperativeListRow = {
  id: string
  name: string
  region: string
  status: string
  chairman_user_id?: string | null
  chairman_email?: string | null
  member_count?: number
}

type PageNumberPaginated<T> = {
  count: number
  results: T[]
}

export function useCooperatives(params?: { enabled?: boolean; search?: string }) {
  const query = useFetchData<PageNumberPaginated<CooperativeListRow>>(
    COOPERATIVES_ENDPOINTS.list,
    {
      page_size: 100,
      ...(params?.search ? { search: params.search } : {}),
    },
    {
      enabled: params?.enabled !== false,
      keepPreviousData: true,
      staleTime: 60_000,
    },
  )
  const options = (query.data?.results ?? []).map((c) => ({
    value: c.id,
    label: c.region ? `${c.name} (${c.region})` : c.name,
  }))
  return { ...query, options, cooperatives: query.data?.results ?? [] }
}

export function useSetAccountCooperative(accountId: string) {
  return usePostData<{ cooperative_id: string | null }, unknown>(
    accountId ? `/accounts/${accountId}/set-cooperative/` : '/accounts/',
    ['accounts'],
    { silentError: true },
  )
}
