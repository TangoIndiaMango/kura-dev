import {
  DynamicTableSection,
  TableStatusBadge,
  type TableHeader,
  type TablePaginationConfig,
} from '@shared/components'
import type { SegmentMemberApi } from './types'

const HEADERS: TableHeader[] = [
  { key: 'kura', label: 'KURA ID' },
  { key: 'name', label: 'OPERATOR' },
  { key: 'phone', label: 'PHONE' },
  { key: 'kyc', label: 'KYC' },
  { key: 'status', label: 'STATUS' },
]

function kycTone(status: string) {
  if (status === 'VERIFIED') return 'success' as const
  if (status === 'REJECTED') return 'danger' as const
  if (status === 'PENDING' || status === 'PROVISIONAL') return 'warning' as const
  return 'neutral' as const
}

function statusTone(status: string) {
  if (status === 'ACTIVE') return 'success' as const
  if (status === 'SUSPENDED') return 'danger' as const
  if (status === 'PENDING') return 'warning' as const
  return 'neutral' as const
}

interface SegmentMembersTableProps {
  members: SegmentMemberApi[]
  loading?: boolean
  emptyMessage?: string
  pagination?: TablePaginationConfig
  getRowHref?: (row: SegmentMemberApi) => string
}

/** Covered operators for a segment — list columns only. */
export function SegmentMembersTable({
  members,
  loading,
  emptyMessage = 'No operators match these criteria.',
  pagination,
  getRowHref = (row) => `/operators/${row.id}`,
}: SegmentMembersTableProps) {
  return (
    <DynamicTableSection
      headers={HEADERS}
      data={members}
      loading={Boolean(loading)}
      emptyTitle="No covered operators"
      emptyMessage={emptyMessage}
      pagination={pagination}
      getRowHref={getRowHref}
      getRowKey={(row) => row.id}
      renderItems={(row) => [
        <span key="kura" className="font-mono text-[12.5px]">
          {row.kura_id || '—'}
        </span>,
        <span key="name" className="font-medium">
          {row.display_name}
        </span>,
        <span key="phone" className="font-mono text-[12.5px] text-[var(--mu)]">
          {row.phone || '—'}
        </span>,
        <TableStatusBadge
          key="kyc"
          label={row.kyc_status}
          tone={kycTone(row.kyc_status)}
        />,
        <TableStatusBadge
          key="status"
          label={row.status}
          tone={statusTone(row.status)}
        />,
      ]}
    />
  )
}
