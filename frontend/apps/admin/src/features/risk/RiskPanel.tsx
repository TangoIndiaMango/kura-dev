import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notifications } from '@mantine/notifications'
import {
  AdminModuleLayout,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableExportFormat,
  type TableHeader,
  LoadingState,
} from '@shared/components'
import { AdminDonutChart, ADMIN_CHART_COLORS } from '@shared/components/charts'
import { apiErrorMessage } from '@lib/api/auth'
import {
  ADMIN_LIST_PAGE_SIZE,
  buildCursorPagination,
} from '@shared/utils/cursor-pagination'
import { downloadExportFromApi } from '@shared/utils/downloadCsvFromApi'
import {
  RISK_ENDPOINTS,
  useRiskEvents,
  useRiskEventStats,
  useRiskRules,
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
import { RiskRulesTab, riskRulesKpis } from './RiskRulesTab'

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
  const [tab, setTab] = useState<'queue' | 'rules'>('queue')
  const [exporting, setExporting] = useState(false)
  const [cursor, setCursor] = useState<string | undefined>()
  const [page, setPage] = useState(1)

  const controls = useAdminModuleControls({
    scope: 'risk',
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter risk events',
    includeNameSort: false,
    includeValueSort: false,
    pageSize: ADMIN_LIST_PAGE_SIZE,
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

  const statusFilter = readFilterValue(controls.filterValues, 'status')
  const severityFilter = readFilterValue(controls.filterValues, 'severity')

  useEffect(() => {
    setCursor(undefined)
    setPage(1)
  }, [
    controls.search,
    statusFilter,
    severityFilter,
    controls.dateRange.start_date,
    controls.dateRange.end_date,
  ])

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

  const {
    events,
    isPending,
    isError,
    isPlaceholderData,
    nextCursor,
    previousCursor,
  } = useRiskEvents({
    ...listFilters,
    cursor,
    page_size: ADMIN_LIST_PAGE_SIZE,
  })

  const { data: stats } = useRiskEventStats({
    start_date: controls.dateRange.start_date || undefined,
    end_date: controls.dateRange.end_date || undefined,
  })
  const { rules } = useRiskRules()

  const donut = useMemo(() => riskDonutFromStats(stats), [stats])
  const kpis = useMemo(() => riskKpisFromStats(stats), [stats])
  const rulesKpisList = useMemo(() => riskRulesKpis(rules), [rules])

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
        subtitle={
          tab === 'queue'
            ? 'Fraud and compliance review queue'
            : 'Fraud detection and asset protection rulebook'
        }
        dateRangeSlot={tab === 'queue' ? controls.dateRangeSlot : null}
        tabs={[
          { id: 'queue', label: 'Review Queue' },
          { id: 'rules', label: 'Risk Rules' },
        ]}
        activeTab={tab}
        onTabChange={(id) => setTab(id as 'queue' | 'rules')}
        kpis={tab === 'queue' ? kpis : rulesKpisList}
        chartsSlot={
          tab === 'queue' ? (
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
          ) : undefined
        }
      >
        {tab === 'queue' ? (
          <>
            {isPending ? <LoadingState cols={6} rows={8} /> : null}
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
          </>
        ) : (
          <RiskRulesTab />
        )}
      </AdminModuleLayout>
      {tab === 'queue' ? controls.filterModal : null}
    </>
  )
}
