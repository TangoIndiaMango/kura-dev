import { useState } from 'react'
import {
  DynamicTableSection,
  LoadingState,
  TableStatusBadge,
  type TableHeader,
} from '@shared/components'
import {
  ADMIN_LIST_PAGE_SIZE,
  buildCursorPagination,
} from '@shared/utils/cursor-pagination'
import {
  usePspWebhookEvents,
  type PspWebhookEventApi,
} from './hooks/use-psp-events'

const HEADERS: TableHeader[] = [
  { key: 'event', label: 'EVENT' },
  { key: 'psp', label: 'PSP' },
  { key: 'id', label: 'PSP EVENT ID' },
  { key: 'when', label: 'RECEIVED' },
  { key: 'error', label: 'ERROR' },
  { key: 'status', label: 'STATUS' },
]

function statusTone(status: string) {
  if (status === 'PROCESSED') return 'success' as const
  if (status === 'FAILED') return 'danger' as const
  if (status === 'IGNORED') return 'default' as const
  return 'warning' as const
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function PspWebhooksTab() {
  const [cursor, setCursor] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const {
    events,
    isPending,
    isError,
    isPlaceholderData,
    nextCursor,
    previousCursor,
  } = usePspWebhookEvents({ cursor, page_size: ADMIN_LIST_PAGE_SIZE })

  const pagination = buildCursorPagination({
    page,
    setPage,
    cursor,
    setCursor,
    nextCursor,
    previousCursor,
    isPlaceholderData,
    pageSize: ADMIN_LIST_PAGE_SIZE,
  })

  if (isPending) return <LoadingState variant="inline" cols={6} rows={6} />
  if (isError) {
    return (
      <p className="p-4 text-[13px] text-[var(--mu)]">
        Could not load webhook events (need finance:read).
      </p>
    )
  }

  const failed = events.filter((e) => e.status === 'FAILED').length

  return (
    <div className="flex flex-col gap-3">
      <p className="px-4 pt-3 text-[12px] text-[var(--mu)] sm:px-5">
        Live Paystack/Nomba ingest · {failed} failed on this page
      </p>
      <DynamicTableSection<PspWebhookEventApi>
        variant="embedded"
        headers={HEADERS}
        data={events}
        getRowKey={(row) => row.id}
        showRowAction={false}
        pagination={pagination}
        toolbar={{ title: 'Webhook events', showFilter: false }}
        renderItems={(row) => [
          <span key="ev" className="text-xs font-bold text-[var(--tx)]">
            {row.event_kind || '—'}
          </span>,
          <span key="psp" className="text-xs uppercase text-[var(--mu)]">
            {row.psp}
          </span>,
          <span
            key="id"
            className="max-w-[200px] truncate font-mono text-xs text-[var(--mu)]"
          >
            {row.psp_event_id || row.id.slice(0, 8)}
          </span>,
          <span key="when" className="text-xs text-[var(--mu)]">
            {formatWhen(row.created_at)}
          </span>,
          <span
            key="err"
            className="max-w-[180px] truncate text-xs text-[var(--mu)]"
          >
            {row.error || '—'}
          </span>,
          <TableStatusBadge
            key="st"
            label={row.status}
            tone={statusTone(row.status)}
          />,
        ]}
      />
    </div>
  )
}
