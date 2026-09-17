import { useNavigate } from 'react-router-dom'
import { Button } from '@mantine/core'
import { PlusSignIcon } from 'hugeicons-react'
import {
  DynamicTableSection,
  TableStatusBadge,
  type TableExportFormat,
  type TableHeader,
  type TablePaginationConfig,
} from '@shared/components'
import type { RoleItem } from '../rolesData'

const ROLE_HEADERS: TableHeader[] = [
  { key: 'id', label: 'Role ID' },
  { key: 'name', label: 'Role' },
  { key: 'desc', label: 'Description' },
  { key: 'users', label: 'Users' },
  { key: 'type', label: 'Type' },
  { key: 'updated', label: 'Updated' },
  { key: 'status', label: 'Status' },
]

function roleTone(status: RoleItem['status']) {
  return status === 'ACTIVE' ? ('success' as const) : ('warning' as const)
}

type Props = {
  roles: RoleItem[]
  pagination: TablePaginationConfig
  searchQuery: string
  setSearchQuery: (v: string) => void
  onFilter: () => void
  onExportFormat: (format: TableExportFormat) => void
  isExporting?: boolean
}

export function RolesTable({
  roles,
  pagination,
  searchQuery,
  setSearchQuery,
  onFilter,
  onExportFormat,
  isExporting,
}: Props) {
  const navigate = useNavigate()

  return (
    <DynamicTableSection<RoleItem>
      variant="embedded"
      headers={ROLE_HEADERS}
      data={roles}
      pagination={pagination}
      getRowKey={(item) => item.code}
      toolbar={{
        title: 'All Roles',
        searchQuery,
        onSearchChange: setSearchQuery,
        searchPlaceholder: 'Search roles',
        onFilter,
        showFilter: true,
        showExport: true,
        onExportFormat,
        isExporting,
        actions: (
          <Button
            leftSection={<PlusSignIcon size={16} />}
            className="bg-[var(--pr)] hover:opacity-90"
            onClick={() => navigate('/users/roles/new')}
          >
            Create Role
          </Button>
        ),
      }}
      onRowClick={(item) => navigate(`/users/roles/${item.id}`)}
      renderItems={(item) => [
        <span key="id" className="font-mono text-xs font-bold text-[var(--pr)]">
          {item.code}
        </span>,
        <span key="name" className="text-xs font-bold text-[var(--tx)]">
          {item.name}
        </span>,
        <span key="desc" className="text-xs text-[var(--mu)]">
          {item.description || '—'}
        </span>,
        <span key="users" className="text-xs text-[var(--tx)]">
          {item.usersAssigned}
        </span>,
        <span key="type" className="text-xs text-[var(--mu)]">
          {item.is_system ? 'System' : 'Custom'}
        </span>,
        <span key="updated" className="text-xs text-[var(--mu)]">
          {item.updatedAt}
        </span>,
        <TableStatusBadge key="st" label={item.status} tone={roleTone(item.status)} />,
      ]}
    />
  )
}
