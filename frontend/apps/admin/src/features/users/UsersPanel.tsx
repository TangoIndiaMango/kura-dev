import { useState } from 'react'
import { notifications } from '@mantine/notifications'
import {
  AdminModuleLayout,
  LoadingState,
  useAdminModuleControls,
  type TableExportFormat,
  type TablePaginationConfig,
} from '@shared/components'
import { useUrlTab } from '@shared/hooks/useUrlTab'
import { apiErrorMessage } from '@lib/api/auth'
import { downloadExportFromApi } from '@shared/utils/downloadCsvFromApi'
import { ROLES_ENDPOINTS, USERS_ENDPOINTS } from './constants/users-api.constants'
import { RolesTable } from './components/RolesTable'
import { UsersTable } from './components/UsersTable'
import {
  useRoleStats,
  useRoles,
  useStaffUserStats,
  useStaffUsers,
} from './hooks/use-users'

const USER_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INVITED', label: 'Invited' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'REVOKED', label: 'Revoked' },
]

const ROLE_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
]

function serverPagination(
  page: number,
  totalPages: number,
  pageSize: number,
  setPage: (p: number) => void,
): TablePaginationConfig {
  return {
    page,
    totalPages: Math.max(1, totalPages),
    onPageChange: setPage,
    variant: 'controls',
    pageSize: String(pageSize).padStart(2, '0'),
  }
}

const USER_TABS = ['users', 'roles'] as const

export function UsersPanel() {
  const [tab, setTab] = useUrlTab('users', { valid: USER_TABS })
  const onUsers = tab === 'users'
  const onRoles = tab === 'roles'
  const [exporting, setExporting] = useState(false)

  const usersControls = useAdminModuleControls({
    scope: 'users',
    statusOptions: USER_STATUS_OPTIONS,
    filterTitle: 'Filter users',
  })
  const rolesControls = useAdminModuleControls({
    scope: 'users_roles',
    statusOptions: ROLE_STATUS_OPTIONS,
    filterTitle: 'Filter roles',
  })
  const controls = onRoles ? rolesControls : usersControls

  const userStatus =
    usersControls.filterValues.status && usersControls.filterValues.status !== 'all'
      ? String(usersControls.filterValues.status)
      : undefined

  const roleStatus =
    rolesControls.filterValues.status && rolesControls.filterValues.status !== 'all'
      ? String(rolesControls.filterValues.status)
      : undefined

  const {
    users,
    isPending: usersPending,
    isFetching: usersFetching,
    isError: usersError,
    totalPages: userPages,
    currentPage: userPage,
  } = useStaffUsers({
    search: usersControls.search || undefined,
    status: userStatus,
    page: usersControls.page,
    page_size: usersControls.pageSize,
    enabled: onUsers,
  })

  const {
    roles,
    isPending: rolesPending,
    isFetching: rolesFetching,
    isError: rolesError,
    totalPages: rolePages,
    currentPage: rolePage,
  } = useRoles({
    search: rolesControls.search || undefined,
    page: rolesControls.page,
    page_size: rolesControls.pageSize,
    enabled: onRoles,
    ...(roleStatus === 'ACTIVE'
      ? { is_active: true }
      : roleStatus === 'INACTIVE'
        ? { is_active: false }
        : {}),
  })

  const { data: userStats } = useStaffUserStats({
    start_date: usersControls.dateRange.start_date || undefined,
    end_date: usersControls.dateRange.end_date || undefined,
    enabled: onUsers,
  })
  const { data: roleStats } = useRoleStats({ enabled: onRoles })

  const t = userStats?.totals
  const rt = roleStats?.totals

  const userKpis = [
    { title: 'Users', value: String(t?.all ?? '—'), tone: 'default' as const },
    { title: 'Active', value: String(t?.active ?? '—'), tone: 'success' as const },
    {
      title: 'Pending invites',
      value: String(t?.invited ?? '—'),
      tone: 'warning' as const,
    },
    { title: 'Roles', value: String(t?.roles ?? '—'), tone: 'default' as const },
  ]

  const roleKpis = [
    { title: 'Roles', value: String(rt?.all ?? '—'), tone: 'default' as const },
    {
      title: 'System roles',
      value: String(rt?.system ?? '—'),
      tone: 'default' as const,
    },
    {
      title: 'Custom roles',
      value: String(rt?.custom ?? '—'),
      tone: 'default' as const,
    },
    {
      title: 'Users assigned',
      value: String(rt?.users_assigned ?? '—'),
      tone: 'success' as const,
    },
  ]

  const loading = onRoles ? rolesPending : usersPending
  const fetching = onRoles ? rolesFetching : usersFetching
  const errored = onRoles ? rolesError : usersError

  const userFilters = {
    ...(usersControls.search
      ? { q: usersControls.search, search: usersControls.search }
      : {}),
    ...(userStatus ? { status: userStatus } : {}),
    ...(usersControls.dateRange.start_date
      ? { start_date: usersControls.dateRange.start_date }
      : {}),
    ...(usersControls.dateRange.end_date
      ? { end_date: usersControls.dateRange.end_date }
      : {}),
  }

  const roleFilters = {
    ...(rolesControls.search ? { search: rolesControls.search } : {}),
  }

  const handleExportUsers = async (format: TableExportFormat) => {
    setExporting(true)
    try {
      await downloadExportFromApi(
        USERS_ENDPOINTS.export,
        `users.${format}`,
        { ...userFilters, export: format },
      )
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Export failed'),
      })
    } finally {
      setExporting(false)
    }
  }

  const handleExportRoles = async (format: TableExportFormat) => {
    setExporting(true)
    try {
      await downloadExportFromApi(
        ROLES_ENDPOINTS.export,
        `roles.${format}`,
        { ...roleFilters, export: format },
      )
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Export failed'),
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <AdminModuleLayout
        title="User Management"
        subtitle="Admin users & role-based access"
        dateRangeSlot={controls.dateRangeSlot}
        tabs={[
          { id: 'users', label: 'Users' },
          { id: 'roles', label: 'Roles' },
        ]}
        activeTab={tab}
        onTabChange={setTab}
        kpis={onRoles ? roleKpis : userKpis}
      >
        {loading ? (
          <LoadingState cols={6} rows={8} />
        ) : errored ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--mu)]">
            Could not load {tab}. Check your session and try again.
          </p>
        ) : (
          <div className={fetching ? 'opacity-70 transition-opacity' : undefined}>
            {onUsers ? (
              <UsersTable
                users={users}
                pagination={serverPagination(
                  userPage,
                  userPages,
                  usersControls.pageSize,
                  usersControls.setPage,
                )}
                searchQuery={usersControls.searchQuery}
                setSearchQuery={usersControls.setSearchQuery}
                onFilter={usersControls.openFilter}
                onExportFormat={handleExportUsers}
                isExporting={exporting}
              />
            ) : (
              <RolesTable
                roles={roles}
                pagination={serverPagination(
                  rolePage,
                  rolePages,
                  rolesControls.pageSize,
                  rolesControls.setPage,
                )}
                searchQuery={rolesControls.searchQuery}
                setSearchQuery={rolesControls.setSearchQuery}
                onFilter={rolesControls.openFilter}
                onExportFormat={handleExportRoles}
                isExporting={exporting}
              />
            )}
          </div>
        )}
      </AdminModuleLayout>
      {controls.filterModal}
    </>
  )
}
