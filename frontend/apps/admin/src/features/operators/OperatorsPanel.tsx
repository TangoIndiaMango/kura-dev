import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Badge } from '@mantine/core'
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
  type TablePaginationConfig,
} from '@shared/components'
import {
  AdminLineChart,
  ADMIN_CHART_COLORS,
} from '@shared/components/charts'
import { apiErrorMessage } from '@lib/api/auth'
import { downloadExportFromApi } from '@shared/utils/downloadCsvFromApi'
import { formatNaira } from '@shared/utils/currency'
import {
  accountStatusLabel,
  accountStatusTone,
  kycStatusLabel,
  kycStatusTone,
  type OperatorRecord,
} from './types'
import { ACCOUNTS_ENDPOINTS } from './constants/operators-api.constants'
import { useOperatorStats, useOperators } from './hooks/use-operators'

import { useCapabilities } from '../auth/useCapabilities'

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'DEREGISTERED', label: 'Deregistered' },
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

export function OperatorsPanel() {
  const navigate = useNavigate()
  const [exporting, setExporting] = useState(false)
  const controls = useAdminModuleControls({
    scope: 'operators',
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter operators',
  })

  const statusFilter =
    controls.filterValues.status && controls.filterValues.status !== 'all'
      ? String(controls.filterValues.status)
      : undefined

  const listFilters = {
    ...(controls.search ? { q: controls.search, search: controls.search } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
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

  const { operators, isPending, isFetching, isError, totalPages, currentPage } =
    useOperators({
      search: controls.search || undefined,
      status: statusFilter,
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
            <DynamicTableSection<OperatorRecord>
              variant="embedded"
              headers={headers}
              data={operators}
              pagination={serverPagination(
                currentPage,
                totalPages,
                controls.pageSize,
                controls.setPage,
              )}
              toolbar={{
                title: 'All Operators',
                searchQuery: controls.searchQuery,
                onSearchChange: controls.setSearchQuery,
                searchPlaceholder: 'Search by name, phone, plate, or KURA ID…',
                onFilter: controls.openFilter,
                showFilter: true,
                showExport: true,
                onExportFormat: handleExport,
                isExporting: exporting,
                actions: (
                  <Button
                    leftSection={<PlusSignIcon size={16} />}
                    className="bg-[var(--pr)] hover:opacity-90"
                    onClick={() => navigate('/operators/new')}
                  >
                    Register Operator
                  </Button>
                ),
              }}
              onRowClick={(item) => navigate(`/operators/${item.id}`)}
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
                <span key="veh" className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--mu)]">
                  {item.vehicleReg || '—'}
                  {item.vehicleCount && item.vehicleCount > 1 ? (
                    <Badge size="xs" variant="light" color="brand" radius="sm" className="font-sans font-semibold">
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
          </div>
        )}
      </AdminModuleLayout>
      {controls.filterModal}
    </>
  )
}
