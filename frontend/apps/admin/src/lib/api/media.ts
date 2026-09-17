import { axiosInstance } from './client'

export type UploadedMedia = {
  id: string
  url: string | null
  original_filename?: string | null
}

type UploadMediaResponse = {
  files: UploadedMedia[]
  file?: UploadedMedia
}

export async function uploadMedia(file: File, kind = 'general') {
  const body = new FormData()
  body.append('file', file)
  body.append('kind', kind)
  const { data } = await axiosInstance.post<UploadMediaResponse>(
    `/media/upload/?kind=${encodeURIComponent(kind)}`,
    body,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      silentError: true,
      transformRequest: [
        (payload: unknown, headers?: Record<string, unknown>) => {
          if (payload instanceof FormData && headers) {
            delete headers['Content-Type']
          }
          return payload
        },
      ],
    },
  )
  const uploaded = data.file ?? data.files?.[0]
  if (!uploaded?.id) {
    throw new Error('Upload did not return a media asset id')
  }
  return uploaded
}
