import { axiosInstance } from './client'
import { apiErrorMessage } from './auth'

export { apiErrorMessage }

export type UploadedMedia = {
  id: string
  url: string | null
  provider: string
  storage_key: string
  kind?: string | null
  content_type?: string
  resource_type?: string
  bytes?: number | null
  width?: number | null
  height?: number | null
  original_filename?: string | null
  visibility?: string
}

export type UploadMediaResponse = {
  files: UploadedMedia[]
  count: number
  file?: UploadedMedia
}

export type UploadProgressHandler = (percent: number) => void

type UploadOptions = {
  onProgress?: UploadProgressHandler
}

function multipartConfig(onProgress?: UploadProgressHandler) {
  return {
    headers: { 'Content-Type': 'multipart/form-data' as const },
    silentError: true as const,
    transformRequest: [
      (payload: unknown, headers?: Record<string, unknown>) => {
        if (payload instanceof FormData && headers) {
          delete headers['Content-Type']
        }
        return payload
      },
    ],
    onUploadProgress: (event: { loaded: number; total?: number }) => {
      if (!onProgress) return
      const total = event.total ?? 0
      if (total <= 0) {
        onProgress(0)
        return
      }
      onProgress(Math.min(100, Math.round((event.loaded / total) * 100)))
    },
  }
}

export async function uploadMedia(file: File, kind = 'general', options?: UploadOptions) {
  const body = new FormData()
  body.append('file', file)
  body.append('kind', kind)
  const { data } = await axiosInstance.post<UploadMediaResponse>(
    `/media/upload/?kind=${encodeURIComponent(kind)}`,
    body,
    multipartConfig(options?.onProgress),
  )
  const uploaded = data.file ?? data.files?.[0]
  if (!uploaded?.id) {
    throw new Error('Upload did not return a media asset id')
  }
  options?.onProgress?.(100)
  return uploaded
}

export async function uploadMany(files: File[], kind = 'general', options?: UploadOptions) {
  const body = new FormData()
  for (const file of files) body.append('files', file)
  body.append('kind', kind)
  const { data } = await axiosInstance.post<UploadMediaResponse>(
    `/media/upload/?kind=${encodeURIComponent(kind)}`,
    body,
    multipartConfig(options?.onProgress),
  )
  options?.onProgress?.(100)
  return data.files ?? []
}
