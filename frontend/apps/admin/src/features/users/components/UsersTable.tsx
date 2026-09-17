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
import type { AdminUserRecord } from '@shared/mock/adminMockData'
import { userStatusLabel, userStatusTone } from '../userDetailHelpers'

const USER_HEADERS: TableHeader[] = [
  { key: 'publicId', label: 'User ID' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'last', label: 'Last login' },
  { key: 'status', label: 'Status' },
]

type Props = {
  users: AdminUserRecord[]
  pagination: TablePaginationConfig
  searchQuery: string
  setSearchQuery: (v: string) => void
  onFilter: () => void
  onExportFormat: (format: TableExportFormat) => void
  isExporting?: boolean
}

export function UsersTable({
  users,
  pagination,
  searchQuery,
  setSearchQuery,
  onFilter,
  onExportFormat,
  isExporting,
}: Props) {
  const navigate = useNavigate()

  return (
    <DynamicTableSection<AdminUserRecord>
      variant="embedded"
      headers={USER_HEADERS}
      data={users}
      pagination={pagination}
      getRowKey={(item) => item.id}
      toolbar={{
        title: 'All Users',
        searchQuery,
        onSearchChange: setSearchQuery,
        searchPlaceholder: 'Search by name or email',
        onFilter,
        showFilter: true,
        showExport: true,
        onExportFormat,
        isExporting,
        actions: (
          <Button
            leftSection={<PlusSignIcon size={16} />}
            className="bg-[var(--pr)] hover:opacity-90"
            onClick={() => navigate('/users/new')}
          >
            Add New User
          </Button>
        ),
      }}
      onRowClick={(item) => navigate(`/users/${item.id}`)}
      renderItems={(item) => [
        <span key="pid" className="font-mono text-xs font-bold text-[var(--pr)]">
          {item.publicId || item.id.slice(0, 8)}
        </span>,
        <span key="name" className="text-xs font-bold text-[var(--tx)]">
          {item.name}
        </span>,
        <span key="email" className="text-xs text-[var(--mu)]">
          {item.email}
        </span>,
        <span key="role" className="text-xs text-[var(--tx)]">
          {item.role}
        </span>,
        <span key="last" className="text-xs text-[var(--mu)]">
          {item.lastLogin}
        </span>,
        <TableStatusBadge
          key="st"
          label={userStatusLabel(item.status)}
          tone={userStatusTone(item.status)}
        />,
      ]}
    />
  )
}
