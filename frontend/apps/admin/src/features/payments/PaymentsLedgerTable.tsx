import type { ReactNode } from 'react'
import type { TableExportFormat } from '@shared/components/table/types'
import {
  DynamicTableSection,
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

const PURPOSE_LABEL: Record<string, string> = {
  SWAP: 'Swap',
  PLAN: 'Plan',
  FUND: 'Wallet top-up',
  CREDIT_REPAY: 'Credit repayment',
}

const WHEN = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Africa/Lagos',
})

export function PaymentsLedgerTable({
  payments,
  pending,
  pagination,
  searchQuery,
  onSearchChange,
  filters,
  onRowClick,
  onExport,
}: {
  payments: PaymentApi[]
  pending: boolean
  pagination: TablePaginationConfig
  searchQuery: string
  onSearchChange: (v: string) => void
  /** Method / status selects shown in the toolbar. */
  filters: ReactNode
  onRowClick: (item: PaymentApi) => void
  /** Full server statement for the current filters (not just this page). */
  onExport: (format: TableExportFormat) => void
}) {
  const toolbar = {
    title: 'Payments',
    searchQuery,
    onSearchChange,
    searchPlaceholder: 'Search receipt or account…',
    showFilter: false,
    showExport: true,
    onExportFormat: onExport,
    filters,
  }

  return (
    <DynamicTableSection<PaymentApi>
      variant="embedded"
      headers={PAYMENT_HEADERS}
      data={payments}
      loading={pending}
      pagination={pagination}
      getRowKey={(item) => item.id}
      toolbar={toolbar}
      onRowClick={onRowClick}
      emptyTitle="No payments"
      emptyMessage="Nothing matches this hub, date range and filters."
      renderItems={(item) => [
        <span key="ref" className="flex flex-col gap-0.5">
          <span className="font-mono text-xs font-bold text-[var(--pr)]">
            {item.receipt_code}
          </span>
          <span className="text-[11.5px] text-[var(--mu)]">
            {WHEN.format(new Date(item.created_at))}
          </span>
        </span>,
        <span key="ac" className="flex max-w-[260px] flex-col gap-0.5">
          <span
            className="truncate text-[13px] font-semibold text-[var(--tx)]"
            title={item.account_name || undefined}
          >
            {item.account_name || '—'}
          </span>
          <span className="font-mono text-[11px] text-[var(--mu)]">
            {item.account_kura_id || item.account_id.slice(0, 8)}
          </span>
        </span>,
        <span key="hub" className="font-mono text-xs text-[var(--mu)]">
          {item.hub_code || 'Online'}
        </span>,
        <span key="method" className="flex flex-col gap-0.5">
          <span className="text-[13px] text-[var(--tx)]">
            {paymentChannelLabel(item.channel)}
          </span>
          <span className="text-[11.5px] text-[var(--mu)]">
            {PURPOSE_LABEL[item.purpose] ?? item.purpose}
          </span>
        </span>,
        <span
          key="amt"
          className="font-mono text-[13px] font-bold tabular-nums text-[var(--tx)]"
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
