import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notifications } from '@mantine/notifications'
import {
  AdminModuleLayout,
  LoadingState,
  useAdminModuleControls,
  type TableExportFormat,
  type TableHeader,
} from '@shared/components'
import {
  AdminLineChart,
  ADMIN_CHART_COLORS,
} from '@shared/components/charts'
import { apiErrorMessage } from '@lib/api/auth'
import { downloadExportFromApi } from '@shared/utils/downloadCsvFromApi'
import { buildPagePagination } from '@shared/utils/cursor-pagination'
import { ACCOUNTS_ENDPOINTS } from './constants/operators-api.constants'
import { useOperatorStats, useOperators } from './hooks/use-operators'
import { OperatorsTable } from './OperatorsTable'
import { useCapabilities } from '../auth/useCapabilities'

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'DEREGISTERED', label: 'Deregistered' },
]


export function OperatorsPanel() {
  const navigate = useNavigate()
  const [exporting, setExporting] = useState(false)
  const controls = useAdminModuleControls({
    scope: 'operators',
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter operators',
    extraFilterFields: [
      {
        type: 'select',
        key: 'kind',
        label: 'Account kind',
        placeholder: 'Any',
        options: [
          { value: 'INDIVIDUAL', label: 'Individual' },
          { value: 'FLEET', label: 'Fleet' },
        ],
      },
    ],
  })

  const statusFilter = controls.getFilter('status')
  const kindFilter = controls.getFilter('kind')


  const listFilters = {
    ...(controls.search ? { q: controls.search, search: controls.search } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(kindFilter ? { kind: kindFilter } : {}),
    ...(controls.dateRange.start_date
      ? { start_date: controls.dateRange.start_date }
      : {}),
    ...(controls.dateRange.end_date
      ? { end_date: controls.dateRange.end_date }
      : {}),
  }

  const { can } = useCapabilities()
  const canSeeFinance = can('finance:read')

  const headers = useMemo<TableHeader[]>(
    () => [
      { key: 'kuraId', label: 'KURA ID' },
      { key: 'name', label: 'OPERATOR NAME' },
      { key: 'phone', label: 'PHONE NUMBER' },
      { key: 'kyc', label: 'KYC STATUS' },
      { key: 'vehicle', label: 'VEHICLE' },
      { key: 'plan', label: 'PLAN' },
      { key: 'wallet', label: canSeeFinance ? 'WALLET' : 'SWAP ACCESS' },
      { key: 'status', label: 'STATUS' },
    ],
    [canSeeFinance],
  )

  const { operators, isPending, isFetching, isError, totalPages, isPlaceholderData } =
    useOperators({
      search: controls.search || undefined,
      status: statusFilter,
      kind: kindFilter,
      start_date: controls.dateRange.start_date || undefined,
      end_date: controls.dateRange.end_date || undefined,
      page: controls.page,
      page_size: controls.pageSize,
    })

  const { data: stats } = useOperatorStats({
    start_date: controls.dateRange.start_date || undefined,
    end_date: controls.dateRange.end_date || undefined,
  })

  const totals = stats?.totals
  const chartData = stats?.registrations?.length
    ? stats.registrations
    : [{ label: '—', count: 0 }]

  const handleExport = async (format: TableExportFormat) => {
    setExporting(true)
    try {
      await downloadExportFromApi(
        ACCOUNTS_ENDPOINTS.export,
        `operators.${format}`,
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
        title="Operators"
        subtitle="Operator accounts, KYC, and standing"
        dateRangeSlot={controls.dateRangeSlot}
        kpis={[
          { title: 'All', value: totals?.all ?? '—', sub: 'Registered' },
          {
            title: 'Active',
            value: totals?.active ?? '—',
            tone: 'success',
            sub: 'Account status',
          },
          {
            title: 'Suspended',
            value: totals?.suspended ?? '—',
            tone: 'warning',
            sub: 'Blocked',
          },
          {
            title: 'Deregistered',
            value: totals?.deregistered ?? '—',
            tone: 'danger',
            sub: 'Closed',
          },
        ]}
        chartsSlot={
          <div className="overflow-hidden rounded-[14px] border border-[var(--bd)] bg-[var(--sf)] p-4 pb-5 shadow-[var(--sh)]">
            <h3 className="mb-3 text-[13px] font-bold text-[var(--tx)]">
              New registrations
            </h3>
            <AdminLineChart
              data={chartData}
              series={[
                {
                  dataKey: 'count',
                  name: 'Registrations',
                  color: ADMIN_CHART_COLORS.teal,
                },
              ]}
              height={220}
            />
          </div>
        }
      >
        {isPending ? (
          <LoadingState cols={8} rows={8} />
        ) : isError ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--mu)]">
            Could not load operators. Check your session and try again.
          </p>
        ) : (
          <div className={isFetching ? 'opacity-70 transition-opacity' : undefined}>
            <OperatorsTable
              headers={headers}
              operators={operators}
              pagination={buildPagePagination({
              page: controls.page,
              setPage: controls.setPage,
              totalPages,
              isPlaceholderData,
              pageSize: controls.pageSize,
            })}
              canSeeFinance={canSeeFinance}
              searchQuery={controls.searchQuery}
              onSearchChange={controls.setSearchQuery}
              onFilter={controls.openFilter}
              onExportFormat={handleExport}
              isExporting={exporting}
              onRegister={() => navigate('/operators/new')}
              onRowClick={(item) => navigate(`/operators/${item.id}`)}
            />
          </div>
        )}
      </AdminModuleLayout>
      {controls.filterModal}
    </>
  )
}
