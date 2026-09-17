import {
  DynamicTableSection,
  TableStatusBadge,
  type TableHeader,
} from '@shared/components'

export type CooperativeMemberRow = {
  account_id: string
  kura_id: string
  display_name: string
  status: string
  phone?: string | null
}

const HEADERS: TableHeader[] = [
  { key: 'kura', label: 'KURA ID' },
  { key: 'name', label: 'OPERATOR' },
  { key: 'phone', label: 'PHONE' },
  { key: 'status', label: 'STATUS' },
]

function statusTone(status: string) {
  if (status === 'ACTIVE') return 'success' as const
  if (status === 'SUSPENDED') return 'danger' as const
  if (status === 'PENDING') return 'warning' as const
  return 'neutral' as const
}

interface CooperativeMembersTableProps {
  members: CooperativeMemberRow[]
  loading?: boolean
}

export function CooperativeMembersTable({
  members,
  loading,
}: CooperativeMembersTableProps) {
  return (
    <DynamicTableSection
      variant="embedded"
      headers={HEADERS}
      data={members}
      loading={Boolean(loading)}
      emptyTitle="No members yet"
      emptyMessage="Assign operators to this cooperative in CRM."
      getRowHref={(row) => `/operators/${row.account_id}`}
      getRowKey={(row) => row.account_id}
      toolbar={{
        title: 'Members',
        showFilter: false,
        showExport: false,
      }}
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
          key="status"
          label={row.status}
          tone={statusTone(row.status)}
        />,
      ]}
    />
  )
}
