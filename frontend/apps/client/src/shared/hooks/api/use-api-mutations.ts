import { useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosInstance } from '@lib/api/client'

type EndpointArg<T> = string | ((variables: T) => string)

export type MutationOptions<TVariables> = {
  body?: (variables: TVariables) => unknown
  silentError?: boolean
}

function resolveEndpoint<T>(endpoint: EndpointArg<T>, variables: T): string {
  return typeof endpoint === 'function' ? endpoint(variables) : endpoint
}

function resolveBody<T>(
  variables: T,
  body?: (variables: T) => unknown,
): unknown {
  if (body) return body(variables)
  if (typeof variables === 'object' && variables !== null) return variables
  return {}
}

function invalidateKeys(
  queryClient: ReturnType<typeof useQueryClient>,
  keys?: string[],
) {
  keys?.forEach((key) => {
    void queryClient.invalidateQueries({ queryKey: [key] })
  })
}

export function usePostData<TPayload = void, TResponse = unknown>(
  endpoint: EndpointArg<TPayload>,
  invalidateKeysList?: string[],
  options?: MutationOptions<TPayload>,
) {
  const queryClient = useQueryClient()

  return useMutation<TResponse, Error, TPayload>({
    mutationFn: async (variables) => {
      const body = resolveBody(variables, options?.body)
      const isFormData =
        typeof FormData !== 'undefined' && body instanceof FormData

      const { data } = await axiosInstance.post<TResponse>(
        resolveEndpoint(endpoint, variables),
        body,
        isFormData
          ? {
              headers: { 'Content-Type': 'multipart/form-data' },
              silentError: options?.silentError,
            }
          : { silentError: options?.silentError },
      )
      return data
    },
    onSuccess: () => invalidateKeys(queryClient, invalidateKeysList),
  })
}

export function usePutData<TPayload = void, TResponse = unknown>(
  endpoint: EndpointArg<TPayload>,
  invalidateKeysList?: string[],
  options?: MutationOptions<TPayload>,
) {
  const queryClient = useQueryClient()

  return useMutation<TResponse, Error, TPayload>({
    mutationFn: async (variables) => {
      const { data } = await axiosInstance.put<TResponse>(
        resolveEndpoint(endpoint, variables),
        resolveBody(variables, options?.body),
        { silentError: options?.silentError },
      )
      return data
    },
    onSuccess: () => invalidateKeys(queryClient, invalidateKeysList),
  })
}

export function usePatchData<TPayload = void, TResponse = unknown>(
  endpoint: EndpointArg<TPayload>,
  invalidateKeysList?: string[],
  options?: MutationOptions<TPayload>,
) {
  const queryClient = useQueryClient()

  return useMutation<TResponse, Error, TPayload>({
    mutationFn: async (variables) => {
      const { data } = await axiosInstance.patch<TResponse>(
        resolveEndpoint(endpoint, variables),
        resolveBody(variables, options?.body),
        { silentError: options?.silentError },
      )
      return data
    },
    onSuccess: () => invalidateKeys(queryClient, invalidateKeysList),
  })
}

export function useDeleteData<TId = string | number, TResponse = void>(
  endpoint: EndpointArg<TId>,
  invalidateKeysList?: string[],
  options?: MutationOptions<TId>,
) {
  const queryClient = useQueryClient()

  return useMutation<TResponse, Error, TId>({
    mutationFn: async (variables) => {
      const { data } = await axiosInstance.delete<TResponse>(
        resolveEndpoint(endpoint, variables),
        { silentError: options?.silentError },
      )
      return data
    },
    onSuccess: () => invalidateKeys(queryClient, invalidateKeysList),
  })
}
