import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { PlusSignIcon } from 'hugeicons-react'
import {
  AdminModuleLayout,
  DynamicTableSection,
  LoadingState,
  TableStatusBadge,
  useAdminModuleControls,
  type TableExportFormat,
  type TableHeader,
} from '@shared/components'
import { AdminDonutChart, ADMIN_CHART_COLORS } from '@shared/components/charts'
import { apiErrorMessage } from '@lib/api/auth'
import {
  ADMIN_LIST_PAGE_SIZE,
  buildCursorPagination,
} from '@shared/utils/cursor-pagination'
import { downloadExportFromApi } from '@shared/utils/downloadCsvFromApi'
import {
  SUPPORT_ENDPOINTS,
  useSupportCases,
  useSupportCaseStats,
  type SupportCaseListApi,
} from '@features/support'
import { useCapabilities } from '../auth/useCapabilities'
import { CreateCaseModal } from './CreateCaseModal'
import {
  caseStatusTone,
  casesDonutFromStats,
  casesKpisFromStats,
  kindLabel,
} from './casesQueueMetrics'

const CASE_HEADERS: TableHeader[] = [
  { key: 'code', label: 'CASE' },
  { key: 'subject', label: 'SUBJECT' },
  { key: 'kind', label: 'KIND' },
  { key: 'operator', label: 'OPERATOR' },
  { key: 'assignee', label: 'ASSIGNEE' },
  { key: 'priority', label: 'PRIORITY' },
  { key: 'status', label: 'STATUS' },
]

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
]

export function CasesPanel() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { can } = useCapabilities()
  const [exporting, setExporting] = useState(false)
  const presetAccount = searchParams.get('account')?.trim() || null
  const presetSubject = searchParams.get('subject')?.trim() || null
  const presetBody = searchParams.get('reason')?.trim() || null
  const [createOpen, setCreateOpen] = useState(
    Boolean(presetAccount || presetSubject),
  )
  const [cursor, setCursor] = useState<string | undefined>()
  const [page, setPage] = useState(1)

  const controls = useAdminModuleControls({
    scope: 'cases',
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter cases',
    pageSize: ADMIN_LIST_PAGE_SIZE,
  })

  const statusFilter = controls.getFilter('status')

  useEffect(() => {
    setCursor(undefined)
    setPage(1)
  }, [
    controls.search,
    statusFilter,
    controls.dateRange.start_date,
    controls.dateRange.end_date,
  ])

  const listFilters = {
    ...(controls.search ? { search: controls.search } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(controls.dateRange.start_date
      ? { start_date: controls.dateRange.start_date }
      : {}),
    ...(controls.dateRange.end_date
      ? { end_date: controls.dateRange.end_date }
      : {}),
  }

  const {
    cases,
    isPending,
    isError,
    refetch,
    isPlaceholderData,
    nextCursor,
    previousCursor,
  } = useSupportCases({
    ...listFilters,
    cursor,
    page_size: ADMIN_LIST_PAGE_SIZE,
  })

  const { data: stats } = useSupportCaseStats({
    start_date: controls.dateRange.start_date || undefined,
    end_date: controls.dateRange.end_date || undefined,
  })

  const donut = useMemo(() => casesDonutFromStats(stats), [stats])
  const kpis = useMemo(() => casesKpisFromStats(stats), [stats])

  const pagination = buildCursorPagination({
    page,
    setPage,
    cursor,
    setCursor,
    nextCursor,
    previousCursor,
    isPlaceholderData,
    pageSize: ADMIN_LIST_PAGE_SIZE,
  })

  const clearPresets = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('account')
    next.delete('subject')
    next.delete('reason')
    next.delete('operator')
    setSearchParams(next, { replace: true })
  }

  const handleExport = async (format: TableExportFormat) => {
    setExporting(true)
    try {
      await downloadExportFromApi(
        SUPPORT_ENDPOINTS.export,
        `support-cases.${format}`,
        { ...listFilters, export: format },
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
        title="Support Cases"
        subtitle="Live queue for disputes, KYC, and operator tickets"
        dateRangeSlot={controls.dateRangeSlot}
        kpis={kpis}
        chartsSlot={
          <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)] lg:max-w-md">
            <h3 className="mb-2 text-[14px] font-bold text-[var(--tx)]">
              Opened by kind
            </h3>
            <AdminDonutChart
              data={
                donut.length
                  ? donut
                  : [{ name: 'No cases', value: 1, color: ADMIN_CHART_COLORS.teal }]
              }
              height={200}
              centerValue={stats?.period.opened ?? 0}
              centerLabel="Opened"
            />
          </div>
        }
      >
        {isPending ? <LoadingState cols={7} rows={8} /> : null}
        {isError ? (
          <p className="mb-4 text-[13px] text-[var(--mu)]">
            Could not load cases (need cases:read).
          </p>
        ) : null}
        {!isPending && !isError ? (
          <DynamicTableSection<SupportCaseListApi>
            variant="embedded"
            headers={CASE_HEADERS}
            data={cases}
            pagination={pagination}
            getRowKey={(item) => item.id}
            toolbar={{
              title: 'Case queue',
              searchQuery: controls.searchQuery,
              onSearchChange: controls.setSearchQuery,
              searchPlaceholder: 'Search case, subject, or operator…',
              onFilter: controls.openFilter,
              showFilter: true,
              showExport: true,
              onExportFormat: handleExport,
              isExporting: exporting,
              actions: can('cases:manage') ? (
                <Button
                  leftSection={<PlusSignIcon size={16} />}
                  className="bg-[var(--pr)] hover:opacity-90"
                  onClick={() => setCreateOpen(true)}
                >
                  Open case
                </Button>
              ) : null,
            }}
            onRowClick={(item) => navigate(`/cases/${item.id}`)}
            emptyTitle="No support cases"
            emptyMessage="Open a case and select the operator account responsible."
            renderItems={(item) => [
              <span
                key="code"
                className="font-mono text-xs font-bold text-[var(--pr)]"
              >
                {item.code}
              </span>,
              <span key="sub" className="text-xs font-bold text-[var(--tx)]">
                {item.subject}
              </span>,
              <span key="kind" className="text-xs text-[var(--mu)]">
                {kindLabel(item.kind)}
              </span>,
              <span key="op" className="text-xs text-[var(--mu)]">
                {item.account_kura_id} · {item.account_display_name}
              </span>,
              <span key="asg" className="text-xs text-[var(--tx)]">
                {item.assigned_to_name ?? 'Unassigned'}
              </span>,
              <span
                key="pri"
                className="text-[10px] font-extrabold uppercase text-[var(--tx)]"
              >
                {item.priority}
              </span>,
              <TableStatusBadge
                key="st"
                label={item.status.replace(/_/g, ' ')}
                tone={caseStatusTone(item.status)}
              />,
            ]}
          />
        ) : null}
      </AdminModuleLayout>
      {controls.filterModal}

      <CreateCaseModal
        opened={createOpen}
        onClose={() => {
          setCreateOpen(false)
          clearPresets()
        }}
        presetAccountId={presetAccount}
        presetSubject={presetSubject}
        presetBody={presetBody}
        lockAccount={Boolean(presetAccount)}
        onCreated={(id) => {
          clearPresets()
          refetch()
          navigate(`/cases/${id}`)
        }}
      />
    </>
  )
}
