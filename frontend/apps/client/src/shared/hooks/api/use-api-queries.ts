import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { axiosInstance } from '@lib/api/client'

export type FetchDataOptions = {
  enabled?: boolean
  staleTime?: number
  refetchOnWindowFocus?: boolean
  keepPreviousData?: boolean
}

export function useFetchData<T>(
  endpoint: string,
  params?: Record<string, unknown>,
  options?: FetchDataOptions,
) {
  return useQuery<T>({
    queryKey: [endpoint, params],
    queryFn: async () => {
      const { data } = await axiosInstance.get<T>(endpoint, {
        params,
        silentError: true,
      })
      return data
    },
    enabled: options?.enabled,
    staleTime: options?.staleTime,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    placeholderData: options?.keepPreviousData ? keepPreviousData : undefined,
  })
}
