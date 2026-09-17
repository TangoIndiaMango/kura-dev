import { axiosInstance } from '@lib/api/client'

/** Download a file returned by a filtered backend export endpoint (csv/pdf). */
export async function downloadExportFromApi(
  endpoint: string,
  filename: string,
  params?: Record<string, unknown>,
) {
  const { data } = await axiosInstance.get<Blob>(endpoint, {
    params,
    responseType: 'blob',
    silentError: true,
  })
  const blob = data instanceof Blob ? data : new Blob([data])
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** @deprecated Prefer downloadExportFromApi */
export async function downloadCsvFromApi(
  endpoint: string,
  filename: string,
  params?: Record<string, unknown>,
) {
  const name = filename.endsWith('.csv') ? filename : `${filename}.csv`
  return downloadExportFromApi(endpoint, name, params)
}
