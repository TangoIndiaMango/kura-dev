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
              'collected',
              'deposited',
              'variance',
              'asOf',
              'status',
            ],
            allRows.map((r) => [
              r.hub,
              r.agent,
              r.collectedNaira,
              r.depositedNaira,
              r.varianceNaira,
              r.asOf,
              r.status,
            ]),
          ),
      }}
      onRowClick={onRowClick}
      renderItems={(item) => [
        <span key="hub" className="text-xs font-bold text-[var(--tx)]">
          {item.hub}
        </span>,
        <span key="agent" className="text-xs text-[var(--mu)]">
          {item.agent}
        </span>,
        <span key="col" className="font-mono text-xs text-[var(--tx)]">
          {item.collectedNaira != null
            ? formatNaira(item.collectedNaira)
            : '—'}
        </span>,
        <span key="dep" className="font-mono text-xs text-[var(--tx)]">
          {formatNaira(item.depositedNaira)}
        </span>,
        <span
          key="var"
          className={`font-mono text-xs font-bold ${
            !item.varianceNaira ? 'text-[var(--mu)]' : 'text-[#C0392B]'
          }`}
        >
          {item.varianceNaira != null
            ? formatNaira(item.varianceNaira)
            : '—'}
        </span>,
        <span key="asOf" className="text-xs text-[var(--mu)]">
          {new Date(item.asOf).toLocaleString()}
        </span>,
        <TableStatusBadge
          key="st"
          label={cashStatusLabel(item.status)}
          tone={cashStatusTone(item.status)}
        />,
      ]}
    />
  )
}
