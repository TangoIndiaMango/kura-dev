import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Skeleton } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  AdminModuleLayout,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableExportFormat,
  type TableHeader,
  type TablePaginationConfig,
} from '@shared/components'
import { AdminDonutChart, ADMIN_CHART_COLORS } from '@shared/components/charts'
import { apiErrorMessage } from '@lib/api/auth'
import { downloadExportFromApi } from '@shared/utils/downloadCsvFromApi'
import {
  RISK_ENDPOINTS,
  useRiskEvents,
  useRiskEventStats,
  type RiskEventListApi,
} from '@features/risk'
import {
  formatAge,
  readFilterValue,
  riskDonutFromStats,
  riskKpisFromStats,
  riskStatusTone,
  ruleLabel,
  severityTone,
} from './riskQueueMetrics'

const RISK_HEADERS: TableHeader[] = [
  { key: 'rule', label: 'RULE' },
  { key: 'operator', label: 'OPERATOR' },
  { key: 'severity', label: 'SEVERITY' },
  { key: 'status', label: 'STATUS' },
  { key: 'age', label: 'AGE' },
]

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'ESCALATED', label: 'Escalated' },
  { value: 'REVIEWED_OK', label: 'Reviewed OK' },
  { value: 'REVIEWED_FRAUD', label: 'Reviewed fraud' },
]

const SEVERITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
]

export function RiskPanel() {
  const navigate = useNavigate()
  const [exporting, setExporting] = useState(false)
  const [cursor, setCursor] = useState<string | undefined>()

  const controls = useAdminModuleControls({
    scope: 'risk',
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter risk events',
    includeNameSort: false,
    includeValueSort: false,
    extraFilterFields: [
      {
        type: 'select',
        key: 'severity',
        label: 'Severity',
        required: false,
        placeholder: 'Any severity',
        options: SEVERITY_OPTIONS,
      },
    ],
  })

  useEffect(() => {
    setCursor(undefined)
  }, [
    controls.search,
    controls.filterValues,
    controls.dateRange.start_date,
    controls.dateRange.end_date,
  ])

  const statusFilter = readFilterValue(controls.filterValues, 'status')
  const severityFilter = readFilterValue(controls.filterValues, 'severity')

  const listFilters = {
    ...(controls.search ? { search: controls.search } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(severityFilter ? { severity: severityFilter } : {}),
    ...(controls.dateRange.start_date
      ? { start_date: controls.dateRange.start_date }
      : {}),
    ...(controls.dateRange.end_date
      ? { end_date: controls.dateRange.end_date }
      : {}),
  }

  const { events, isPending, isError, nextCursor, previousCursor } =
    useRiskEvents({
      ...listFilters,
      cursor,
      page_size: controls.pageSize,
    })

  const { data: stats } = useRiskEventStats({
    start_date: controls.dateRange.start_date || undefined,
    end_date: controls.dateRange.end_date || undefined,
  })

  const donut = useMemo(() => riskDonutFromStats(stats), [stats])
  const kpis = useMemo(() => riskKpisFromStats(stats), [stats])

  const pagination: TablePaginationConfig = {
    page: cursor ? 2 : 1,
    totalPages: nextCursor ? (cursor ? 3 : 2) : cursor ? 2 : 1,
    onPageChange: () => undefined,
    variant: 'controls',
    pageSize: String(controls.pageSize).padStart(2, '0'),
    onNext: nextCursor ? () => setCursor(nextCursor) : undefined,
    onPrevious: previousCursor
      ? () => setCursor(previousCursor)
      : cursor
        ? () => setCursor(undefined)
        : undefined,
  }

  const handleExport = async (format: TableExportFormat) => {
    setExporting(true)
    try {
      await downloadExportFromApi(
        RISK_ENDPOINTS.export,
        `risk-events.${format}`,
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
        title="Risk"
        subtitle="Fraud and compliance review queue"
        dateRangeSlot={controls.dateRangeSlot}
        kpis={kpis}
        chartsSlot={
          <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)] lg:max-w-md">
            <h3 className="mb-2 text-[14px] font-bold text-[var(--tx)]">
              Opened by rule
            </h3>
            <AdminDonutChart
              data={
                donut.length
                  ? donut
                  : [{ name: 'No events', value: 1, color: ADMIN_CHART_COLORS.teal }]
              }
              height={200}
              centerValue={stats?.period.opened ?? 0}
              centerLabel="Opened"
            />
          </div>
        }
      >
        {isPending ? <Skeleton height={280} radius="md" /> : null}
        {isError ? (
          <p className="mb-4 text-[13px] text-[var(--mu)]">
            Could not load risk events (need risk:read).
          </p>
        ) : null}
        {!isPending && !isError ? (
          <DynamicTableSection<RiskEventListApi>
            variant="embedded"
            headers={RISK_HEADERS}
            data={events}
            pagination={pagination}
            getRowKey={(item) => item.id}
            toolbar={{
              title: 'Risk queue',
              searchQuery: controls.searchQuery,
              onSearchChange: controls.setSearchQuery,
              searchPlaceholder: 'Search rule, operator, or subject…',
              onFilter: controls.openFilter,
              showFilter: true,
              showExport: true,
              onExportFormat: handleExport,
              isExporting: exporting,
            }}
            onRowClick={(item) => navigate(`/risk/${item.id}`)}
            emptyTitle="No risk events"
            emptyMessage="Flag an operator from CRM, or wait for rule hits."
            renderItems={(item) => [
              <span key="rule" className="text-xs font-bold text-[var(--tx)]">
                {ruleLabel(item.rule_code)}
              </span>,
              <span key="op" className="text-xs text-[var(--mu)]">
                {item.account_kura_id
                  ? `${item.account_kura_id} · ${item.account_display_name}`
                  : `${item.subject_type}:${item.subject_id}`}
              </span>,
              <TableStatusBadge
                key="sev"
                label={item.severity}
                tone={severityTone(item.severity)}
              />,
              <TableStatusBadge
                key="st"
                label={item.status.replace(/_/g, ' ')}
                tone={riskStatusTone(item.status)}
              />,
              <span key="age" className="text-xs text-[var(--mu)]">
                {formatAge(item.created_at)}
              </span>,
            ]}
          />
        ) : null}
      </AdminModuleLayout>
      {controls.filterModal}
    </>
  )
}
