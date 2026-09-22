import { Skeleton } from '@mantine/core'
import {
  DynamicTableSection,
  TableStatusBadge,
  type TablePaginationConfig,
} from '@shared/components'
import { formatNaira } from '@shared/utils/currency'
import { downloadCsv } from '@shared/utils/downloadCsv'
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
}: {
  payments: PaymentApi[]
  pending: boolean
  pagination: TablePaginationConfig
  searchQuery: string
  onSearchChange: (v: string) => void
  onFilter: () => void
  onRowClick: (item: PaymentApi) => void
}) {
  if (pending) return <Skeleton height={220} radius="md" />

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
        onExport: () =>
          downloadCsv(
            'payments.csv',
            [
              'receipt',
              'date',
              'account',
              'hub',
              'channel',
              'purpose',
              'amount_kobo',
              'status',
            ],
            payments.map((p) => [
              p.receipt_code,
              p.created_at,
              p.account_id,
              p.hub_id ?? '',
              p.channel,
              p.purpose,
              p.amount_kobo,
              p.status,
            ]),
          ),
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
