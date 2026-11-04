import { useState } from 'react'
import { Button, Badge } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import dayjs from 'dayjs'
import { apiErrorMessage } from '@lib/api/auth'
import { DynamicTableSection, type TableHeader } from '@shared/components'
import { downloadExportFromApi } from '@shared/utils/downloadCsvFromApi'
import { downloadEndpoint, useDatasets, useReportHistory, type ReportJob } from './api'
import { rangeLabel } from './format'

const HEADERS: TableHeader[] = [
  { key: 'what', label: 'REPORT' },
  { key: 'dates', label: 'DATES' },
  { key: 'made', label: 'MADE' },
  { key: 'status', label: 'STATUS' },
  { key: 'file', label: 'FILE' },
]

const FIXED_KINDS: Record<string, string> = {
  IMPACT_PDF: 'Impact report',
  OPS_CSV: 'Hub daily totals',
  FLEET_CSV: 'Battery fleet',
  REVENUE_CSV: 'Revenue share',
}

const STATUS_COLOR: Record<string, string> = {
  READY: 'teal',
  QUEUED: 'gray',
  RUNNING: 'blue',
  FAILED: 'red',
  EXPIRED: 'gray',
}

/** The caller's own reports and exports, newest first. */
export function ReportsHistoryTab() {
  const [page, setPage] = useState(1)
  const history = useReportHistory(page)
  const datasets = useDatasets()
  const [busy, setBusy] = useState<string | null>(null)
  const label = (job: ReportJob) => {
    if (job.kind !== 'DATASET') return FIXED_KINDS[job.kind] ?? job.kind
    const code = String(job.params.dataset ?? '')
    return datasets.data?.find((d) => d.code === code)?.label ?? code
  }
  const dates = (job: ReportJob) => {
    const p = job.params as { start_date?: string; end_date?: string; period?: string }
    if (p.start_date && p.end_date) return rangeLabel({ start_date: p.start_date, end_date: p.end_date })
    return p.period ?? '—'
  }

  return (
    <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] shadow-[var(--sh)]">
      <DynamicTableSection<ReportJob>
        variant="embedded"
        headers={HEADERS}
        data={history.data?.results ?? []}
        loading={history.isPending}
        getRowKey={(j) => j.id}
        showRowAction={false}
        emptyMessage="Reports you download show up here for 24 hours."
        toolbar={{ title: 'Your reports', showFilter: false }}
        pagination={{ page, totalPages: history.data?.total_pages ?? 1, onPageChange: setPage }}
        renderItems={(j) => [
          <div key="what">
            <div className="font-semibold text-[var(--tx)]">{label(j)}</div>
            <div className="text-[12px] text-[var(--mu)]">
              {Array.isArray(j.params.fields) ? `${j.params.fields.length} fields` : j.kind}
              {j.params.format ? ` · ${String(j.params.format).toUpperCase()}` : ''}
              {j.raw.rows != null ? ` · ${j.raw.rows.toLocaleString('en-NG')} rows` : ''}
              {j.raw.truncated ? ' · cut short at the row limit' : ''}
            </div>
          </div>,
          <span key="dates">{dates(j)}</span>,
          <span key="made">{dayjs(j.created_at).format('D MMM, HH:mm')}</span>,
          <Badge key="status" variant="light" color={STATUS_COLOR[j.status] ?? 'gray'}>
            {j.status === 'FAILED' && j.raw.error ? `Failed: ${j.raw.error}` : j.status.toLowerCase()}
          </Badge>,
          <span key="file">
            {j.status === 'READY' && j.download_path ? (
              <Button
                size="xs"
                variant="light"
                loading={busy === j.id}
                onClick={async () => {
                  setBusy(j.id)
                  try {
                    await downloadExportFromApi(downloadEndpoint(j), j.raw.filename ?? `kura-report-${j.id}`)
                  } catch (err) {
                    notifications.show({ color: 'red', message: apiErrorMessage(err, 'Download failed') })
                  } finally {
                    setBusy(null)
                  }
                }}
              >
                Download
              </Button>
            ) : (
              '—'
            )}
          </span>,
        ]}
      />
    </div>
  )
}
