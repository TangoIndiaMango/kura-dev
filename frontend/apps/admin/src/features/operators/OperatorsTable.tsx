import { Badge, Button } from '@mantine/core'
import { PlusSignIcon } from 'hugeicons-react'
import {
  DynamicTableSection,
  TableStatusBadge,
  type TableExportFormat,
  type TableHeader,
  type TablePaginationConfig,
} from '@shared/components'
import { formatNaira } from '@shared/utils/currency'
import {
  accountStatusLabel,
  accountStatusTone,
  kycStatusLabel,
  kycStatusTone,
  type OperatorRecord,
} from './types'

export function OperatorsTable({
  headers,
  operators,
  pagination,
  canSeeFinance,
  searchQuery,
  onSearchChange,
  onFilter,
  onExportFormat,
  isExporting,
  onRegister,
  onRowClick,
}: {
  headers: TableHeader[]
  operators: OperatorRecord[]
  pagination: TablePaginationConfig
  canSeeFinance: boolean
  searchQuery: string
  onSearchChange: (v: string) => void
  onFilter: () => void
  onExportFormat: (format: TableExportFormat) => void
  isExporting: boolean
  onRegister: () => void
  onRowClick: (item: OperatorRecord) => void
}) {
  return (
    <DynamicTableSection<OperatorRecord>
      variant="embedded"
      headers={headers}
      data={operators}
      pagination={pagination}
      toolbar={{
        title: 'All Operators',
        searchQuery,
        onSearchChange,
        searchPlaceholder: 'Search by name, phone, plate, or KURA ID…',
        onFilter,
        showFilter: true,
        showExport: true,
        onExportFormat,
        isExporting,
        actions: (
          <Button
            leftSection={<PlusSignIcon size={16} />}
            className="bg-[var(--pr)] hover:opacity-90"
            onClick={onRegister}
          >
            Register Operator
          </Button>
        ),
      }}
      onRowClick={onRowClick}
      renderItems={(item) => [
        <span key="id" className="font-mono text-xs font-bold text-[var(--pr)]">
          {item.kuraId}
        </span>,
        <span key="name" className="text-xs font-bold text-[var(--tx)]">
          {item.name}
        </span>,
        <span key="phone" className="text-xs text-[var(--mu)]">
          {item.phone}
        </span>,
        <TableStatusBadge
          key="kyc"
          label={kycStatusLabel(item.kycStatus)}
          tone={kycStatusTone(item.kycStatus)}
        />,
        <span
          key="veh"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--mu)]"
        >
          {item.vehicleReg || '—'}
          {item.vehicleCount && item.vehicleCount > 1 ? (
            <Badge
              size="xs"
              variant="light"
              color="brand"
              radius="sm"
              className="font-sans font-semibold"
            >
              +{item.vehicleCount - 1}
            </Badge>
          ) : null}
        </span>,
        <span key="plan" className="text-xs text-[var(--mu)]">
          {item.planName || '—'}
        </span>,
        canSeeFinance ? (
          <span key="wallet" className="text-xs text-[var(--mu)]">
            {typeof item.walletAvailableKobo === 'number'
              ? formatNaira(item.walletAvailableKobo, { fromKobo: true })
              : '—'}
          </span>
        ) : (
          <TableStatusBadge
            key="wallet"
            label={
              item.status === 'ACTIVE' && item.kycStatus === 'VERIFIED'
                ? 'Eligible'
                : item.status === 'SUSPENDED'
                  ? 'Blocked'
                  : 'At Risk'
            }
            tone={
              item.status === 'ACTIVE' && item.kycStatus === 'VERIFIED'
                ? 'success'
                : item.status === 'SUSPENDED'
                  ? 'danger'
                  : 'warning'
            }
          />
        ),
        <TableStatusBadge
          key="st"
          label={accountStatusLabel(item.status)}
          tone={accountStatusTone(item.status)}
        />,
      ]}
    />
  )
}
