import type { TableExportFormat } from '@shared/components/table/types'
import {
  DynamicTableSection,
  LoadingState,
  TableStatusBadge,
  type TablePaginationConfig,
} from '@shared/components'
import { formatNaira } from '@shared/utils/currency'
import type { PaymentApi } from '@features/finance'
import {
  paymentChannelLabel,
  paymentStatusLabel,
  paymentStatusTone,
} from './paymentDetailHelpers'
import { PAYMENT_HEADERS } from './paymentsPanelShared'

export function PaymentsLedgerTable({
  payments,
  pending,
  pagination,
  searchQuery,
  onSearchChange,
  onFilter,
  onRowClick,
  onExport,
}: {
  payments: PaymentApi[]
  pending: boolean
  pagination: TablePaginationConfig
  searchQuery: string
  onSearchChange: (v: string) => void
  onFilter: () => void
  onRowClick: (item: PaymentApi) => void
  /** Full server statement for the current filters (not just this page). */
  onExport: (format: TableExportFormat) => void
}) {
  if (pending) return <LoadingState variant="inline" cols={7} rows={8} />

  return (
    <DynamicTableSection<PaymentApi>
      variant="embedded"
      headers={PAYMENT_HEADERS}
      data={payments}
      pagination={pagination}
      getRowKey={(item) => item.id}
      toolbar={{
        title: 'All payments',
        searchQuery,
        onSearchChange,
        searchPlaceholder: 'Search receipt or purpose…',
        onFilter,
        showFilter: true,
        showExport: true,
        onExportFormat: onExport,
      }}
      onRowClick={onRowClick}
      emptyTitle="No payments"
      emptyMessage="No rows for this scope and date range."
      renderItems={(item) => [
        <span
          key="ref"
          className="font-mono text-xs font-bold text-[var(--pr)]"
        >
          {item.receipt_code}
        </span>,
        <span key="date" className="text-xs text-[var(--mu)]">
          {new Date(item.created_at).toLocaleString()}
        </span>,
        <span key="ac" className="font-mono text-xs text-[var(--tx)]">
          {item.account_id.slice(0, 8)}…
        </span>,
        <span key="ch" className="text-xs text-[var(--mu)]">
          {paymentChannelLabel(item.channel)}
        </span>,
        <span key="pur" className="text-xs text-[var(--mu)]">
          {item.purpose}
        </span>,
        <span
          key="amt"
          className="font-mono text-xs font-extrabold text-[var(--tx)]"
        >
          {formatNaira(item.amount_kobo, { fromKobo: true })}
        </span>,
        <TableStatusBadge
          key="st"
          label={paymentStatusLabel(item.status)}
          tone={paymentStatusTone(item.status)}
        />,
      ]}
    />
  )
}
