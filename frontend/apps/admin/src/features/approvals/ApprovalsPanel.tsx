import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Skeleton } from '@mantine/core'
import {
  AdminModuleLayout,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableHeader,
} from '@shared/components'
import { useConfigVersions } from '@features/platform-config'
import {
  approvalTone,
  mapConfigVersion,
  type ApprovalTableRow,
} from './approvalHelpers'

const HEADERS: TableHeader[] = [
  { key: 'code', label: 'REQUEST' },
  { key: 'type', label: 'TYPE' },
  { key: 'subject', label: 'SUBJECT' },
  { key: 'by', label: 'REQUESTED BY' },
  { key: 'when', label: 'SUBMITTED' },
  { key: 'status', label: 'STATUS' },
]

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'SUPERSEDED', label: 'Superseded' },
]

export function ApprovalsPanel() {
  const navigate = useNavigate()
  const controls = useAdminModuleControls({
    scope: 'approvals',
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter approvals',
    pageSize: 25,
    showDateRange: false,
    includeDateRangeInFilter: false,
  })

  const statusFilter =
    controls.filterValues.status && controls.filterValues.status !== 'all'
      ? String(controls.filterValues.status)
      : undefined

  const pendingQuery = useConfigVersions({
    status: 'PENDING',
    page: 1,
    page_size: 100,
  })
  const activeQuery = useConfigVersions({
    status: 'ACTIVE',
    page: 1,
    page_size: 10,
  })
  const otherQuery = useConfigVersions(
    {
      status: statusFilter,
      page: 1,
      page_size: 50,
    },
    {
      enabled:
        Boolean(statusFilter) &&
        statusFilter !== 'PENDING' &&
        statusFilter !== 'ACTIVE',
    },
  )

  const isPending =
    pendingQuery.isPending ||
    activeQuery.isPending ||
    (otherQuery.isFetching && otherQuery.isPending)

  const sourceRows = useMemo(() => {
    if (statusFilter === 'PENDING') return pendingQuery.versions
    if (statusFilter === 'ACTIVE') return activeQuery.versions
    if (statusFilter) return otherQuery.versions
    const seen = new Set(pendingQuery.versions.map((v) => v.id))
    return [
      ...pendingQuery.versions,
      ...activeQuery.versions.filter((v) => !seen.has(v.id)),
    ]
  }, [
    statusFilter,
    pendingQuery.versions,
    activeQuery.versions,
    otherQuery.versions,
  ])

  const rows = useMemo(() => {
    const q = controls.search.toLowerCase()
    return sourceRows
      .map(mapConfigVersion)
      .filter(
        (a) =>
          a.code.toLowerCase().includes(q) ||
          a.subject.toLowerCase().includes(q) ||
          a.type.toLowerCase().includes(q),
      )
  }, [sourceRows, controls.search])

  const { pageRows, pagination } = controls.paginate(rows)
  const pendingCount = pendingQuery.versions.length

  return (
    <>
      <AdminModuleLayout
        title="Approvals"
        subtitle="Config maker-checker — Credit, Offers, and related namespaces"
        dateRangeSlot={controls.dateRangeSlot}
        kpis={[
          {
            title: 'Pending',
            value: isPending ? '—' : String(pendingCount),
            sub: 'Awaiting decision',
            tone: 'warning',
          },
          {
            title: 'Active (recent)',
            value: isPending ? '—' : String(activeQuery.versions.length),
            sub: 'Latest approved tip',
            tone: 'success',
          },
          {
            title: 'Visible',
            value: isPending ? '—' : String(rows.length),
            sub: 'After filters',
            tone: 'default',
          },
          {
            title: 'Namespaces',
            value: 'credit · offers',
            sub: 'Config versions',
            tone: 'default',
          },
        ]}
      >
        {isPending ? (
          <Skeleton height={280} radius="md" className="m-4" />
        ) : (
          <DynamicTableSection<ApprovalTableRow>
            variant="embedded"
            headers={HEADERS}
            data={pageRows}
            pagination={pagination}
            getRowKey={(item) => item.id}
            toolbar={{
              title: 'Approval queue',
              searchQuery: controls.searchQuery,
              onSearchChange: controls.setSearchQuery,
              searchPlaceholder: 'Search code, type, or subject…',
              onFilter: controls.openFilter,
              showFilter: true,
            }}
            onRowClick={(item) => navigate(`/approvals/${item.id}`)}
            renderItems={(item) => [
              <span
                key="code"
                className="font-mono text-xs font-bold text-[var(--pr)]"
              >
                {item.code}
              </span>,
              <span key="type" className="text-xs text-[var(--mu)]">
                {item.type}
              </span>,
              <span key="sub" className="text-xs font-bold text-[var(--tx)]">
                {item.subject}
              </span>,
              <span key="by" className="text-xs text-[var(--mu)]">
                {item.requestedBy}
              </span>,
              <span key="when" className="text-xs text-[var(--mu)]">
                {item.submittedAt}
              </span>,
              <TableStatusBadge
                key="st"
                label={item.status}
                tone={approvalTone(item.status)}
              />,
            ]}
          />
        )}
      </AdminModuleLayout>
      {controls.filterModal}
    </>
  )
}
