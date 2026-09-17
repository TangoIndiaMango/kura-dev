import { useState } from 'react'
import { notifications } from '@mantine/notifications'
import { apiErrorMessage } from '@lib/api/auth'
import { downloadCsvFromApi } from '@shared/utils/downloadCsvFromApi'

/**
 * Confirm → server CSV export → success. Pass current list filters as params.
 */
export function useServerCsvExport() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exported, setExported] = useState(false)
  const [pending, setPending] = useState<{
    endpoint: string
    filename: string
    params?: Record<string, unknown>
  } | null>(null)

  const requestExport = (
    endpoint: string,
    filename: string,
    params?: Record<string, unknown>,
  ) => {
    setPending({ endpoint, filename, params })
    setConfirmOpen(true)
  }

  const runExport = async () => {
    if (!pending) return
    setExporting(true)
    try {
      await downloadCsvFromApi(pending.endpoint, pending.filename, pending.params)
      setConfirmOpen(false)
      setExported(true)
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Export failed'),
      })
      setConfirmOpen(false)
    } finally {
      setExporting(false)
      setPending(null)
    }
  }

  return {
    confirmOpen,
    setConfirmOpen,
    exporting,
    exported,
    setExported,
    requestExport,
    runExport,
  }
}
