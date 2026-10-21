import { Button } from '@mantine/core'
import { PlusSignIcon } from 'hugeicons-react'
import {
  DynamicTableSection,
  TableStatusBadge,
  type TablePaginationConfig,
} from '@shared/components'
import { formatNaira } from '@shared/utils/currency'
import { downloadCsv } from '@shared/utils/downloadCsv'
import {
  cashStatusLabel,
  cashStatusTone,
} from './paymentDetailHelpers'
import { CASH_HEADERS, type CashTableRow } from './paymentsPanelShared'

const WHEN = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Africa/Lagos',
})

export function PaymentsCashTable({
  pageRows,
  allRows,
  pagination,
  searchQuery,
  onSearchChange,
  onFilter,
  onRowClick,
  onRecordCash,
  canRecord,
}: {
  pageRows: CashTableRow[]
  allRows: CashTableRow[]
  pagination: TablePaginationConfig
  searchQuery: string
  onSearchChange: (v: string) => void
  onFilter: () => void
  onRowClick: (item: CashTableRow) => void
  onRecordCash: () => void
  canRecord: boolean
}) {
  return (
    <DynamicTableSection<CashTableRow>
      variant="embedded"
      headers={CASH_HEADERS}
      data={pageRows}
      pagination={pagination}
      getRowKey={(item) => item.id}
      toolbar={{
        title: 'Cash reconciliation',
        searchQuery,
        onSearchChange,
        searchPlaceholder: 'Search hub or agent…',
        onFilter,
        showFilter: true,
        actions: canRecord ? (
          <Button
            leftSection={<PlusSignIcon size={16} />}
            onClick={onRecordCash}
          >
            Record cash
          </Button>
        ) : undefined,
        onExport: () =>
          downloadCsv(
            'cash-reconciliation.csv',
            [
              'hub',
              'agent',
              'opening_float',
              'cash_taken',
              'expected',
              'counted',
              'variance',
              'opened_at',
              'closed_at',
              'status',
            ],
            allRows.map((r) => [
              r.hub,
              r.agent,
              r.openingNaira,
              r.collectedNaira,
              r.expectedNaira,
              r.countedNaira,
              r.varianceNaira,
              r.openedAt,
              r.closedAt,
              r.status,
            ]),
          ),
      }}
      onRowClick={onRowClick}
      renderItems={(item) => [
        <span key="hub" className="font-mono text-xs font-bold text-[var(--tx)]">
          {item.hub}
        </span>,
        <span key="agent" className="text-[13px] text-[var(--tx)]">
          {item.agent}
        </span>,
        <span key="exp" className="flex flex-col gap-0.5">
          <span className="font-mono text-[13px] font-bold tabular-nums text-[var(--tx)]">
            {formatNaira(item.expectedNaira)}
          </span>
          <span className="text-[11.5px] text-[var(--mu)]">
            {formatNaira(item.openingNaira)} float + {formatNaira(Math.max(0, item.collectedNaira ?? 0))} taken
          </span>
        </span>,
        <span key="cnt" className="font-mono text-[13px] tabular-nums text-[var(--tx)]">
          {item.countedNaira != null ? (
            formatNaira(item.countedNaira)
          ) : (
            <span className="font-sans text-[var(--mu)]">Not counted</span>
          )}
        </span>,
        <span
          key="var"
          className={`font-mono text-[13px] font-bold tabular-nums ${
            !item.varianceNaira ? 'text-[var(--mu)]' : 'text-[#C0392B]'
          }`}
        >
          {item.varianceNaira != null ? formatNaira(item.varianceNaira) : '—'}
        </span>,
        <span key="asOf" className="flex flex-col gap-0.5 text-[11.5px] text-[var(--mu)]">
          <span>Opened {WHEN.format(new Date(item.openedAt))}</span>
          <span>{item.closedAt ? `Closed ${WHEN.format(new Date(item.closedAt))}` : 'Still open'}</span>
        </span>,
        <TableStatusBadge
          key="st"
          // A window open for days mixes many days' cash — close and reconcile it.
          label={item.isStale ? 'Open > 24h · close it' : cashStatusLabel(item.status)}
          tone={item.isStale ? 'danger' : cashStatusTone(item.status)}
        />,
      ]}
    />
  )
}
