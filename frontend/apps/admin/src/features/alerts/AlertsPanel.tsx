import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert02Icon } from 'hugeicons-react'
import { Skeleton } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  AdminModuleLayout,
  AdminBarChart,
  AdminDonutChart,
  ADMIN_CHART_COLORS,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableExportFormat,
  type TableHeader,
  type TablePaginationConfig,
} from '@shared/components'
import { useUrlTab } from '@shared/hooks/useUrlTab'
import { downloadExportFromApi } from '@shared/utils/downloadCsvFromApi'
import { apiErrorMessage } from '@lib/api/auth'
import { AlertRulesTab, rulesKpis } from './AlertRulesTab'
import { ALERTS_ENDPOINTS } from './constants'
import { useAlerts, useAlertStats } from './hooks/use-alerts'
import type { AlertListApi } from './types'
import {
  alertStatusTone,
  alertsDonutFromStats,
  alertsKpisFromStats,
  formatAge,
  formatWhen,
  kindTitle,
  readFilterValue,
  severityLabel,
  severityToneClass,
} from './alertsQueueMetrics'

const ALERT_HEADERS: TableHeader[] = [
  { key: 'time', label: 'RAISED' },
  { key: 'title', label: 'ALERT' },
  { key: 'subject', label: 'SUBJECT' },
  { key: 'severity', label: 'SEVERITY' },
  { key: 'delivery', label: 'CHANNEL' },
  { key: 'age', label: 'AGE' },
  { key: 'status', label: 'STATUS' },
]

const ALERT_STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'ESCALATED', label: 'Escalated' },
]

const SEVERITY_OPTIONS = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'WARNING', label: 'Operational' },
  { value: 'INFO', label: 'Informational' },
]

export function AlertsPanel() {
  const navigate = useNavigate()
  const [tab, setTab] = useUrlTab('alerts', { valid: ['alerts', 'rules'] })
  const [exporting, setExporting] = useState(false)
  const [cursor, setCursor] = useState<string | undefined>()

  const alertsControls = useAdminModuleControls({
    scope: 'alerts',
    statusOptions: ALERT_STATUS_OPTIONS,
    filterTitle: 'Filter alerts',
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
    alertsControls.search,
    alertsControls.filterValues,
    alertsControls.dateRange.start_date,
    alertsControls.dateRange.end_date,
  ])

  const statusFilter = readFilterValue(alertsControls.filterValues, 'status')
  const severityFilter = readFilterValue(alertsControls.filterValues, 'severity')

  const listFilters = {
    ...(alertsControls.search ? { search: alertsControls.search } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(severityFilter ? { severity: severityFilter } : {}),
    ...(alertsControls.dateRange.start_date
      ? { start_date: alertsControls.dateRange.start_date }
      : {}),
    ...(alertsControls.dateRange.end_date
      ? { end_date: alertsControls.dateRange.end_date }
      : {}),
  }

  const { alerts, isPending, isError, nextCursor, previousCursor } = useAlerts(
    {
      ...listFilters,
      cursor,
      page_size: alertsControls.pageSize,
    },
    { enabled: tab === 'alerts', poll: tab === 'alerts' },
  )

  const { data: stats } = useAlertStats({
    start_date: alertsControls.dateRange.start_date || undefined,
    end_date: alertsControls.dateRange.end_date || undefined,
    enabled: true,
    poll: tab === 'alerts',
  })

  const pagination: TablePaginationConfig = {
    page: cursor ? 2 : 1,
    totalPages: nextCursor ? (cursor ? 3 : 2) : cursor ? 2 : 1,
    onPageChange: () => undefined,
    variant: 'controls',
    pageSize: String(alertsControls.pageSize).padStart(2, '0'),
    onNext: nextCursor ? () => setCursor(nextCursor) : undefined,
    onPrevious: previousCursor
      ? () => setCursor(previousCursor)
      : cursor
        ? () => setCursor(undefined)
        : undefined,
  }

  const donut = useMemo(() => alertsDonutFromStats(stats), [stats])
  const kpis =
    tab === 'rules'
      ? rulesKpis(stats?.queue.open ?? '—')
      : alertsKpisFromStats(stats)
  const perDay = stats?.period.by_day?.length
    ? stats.period.by_day
    : [{ label: '—', count: 0 }]

  const handleExport = async (format: TableExportFormat) => {
    setExporting(true)
    try {
      await downloadExportFromApi(ALERTS_ENDPOINTS.export, `alerts.${format}`, {
        ...listFilters,
        export: format,
      })
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
        title="Alerts"
        subtitle="Threshold monitors, hub outages, and operational escalations"
        dateRangeSlot={
          tab === 'alerts' ? alertsControls.dateRangeSlot : null
        }
        tabs={[
          { id: 'alerts', label: 'Alerts' },
          { id: 'rules', label: 'Alert Rules' },
        ]}
        activeTab={tab}
        onTabChange={setTab}
        kpis={kpis}
        chartsSlot={
          tab === 'alerts' ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
                <h3 className="mb-2 text-[14px] font-bold text-[var(--tx)]">
                  Alerts per day
                </h3>
                <AdminBarChart
                  data={perDay}
                  series={[
                    {
                      dataKey: 'count',
                      name: 'Alerts',
                      color: ADMIN_CHART_COLORS.amber,
                    },
                  ]}
                  height={200}
                />
              </div>
              <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
                <h3 className="mb-2 text-[14px] font-bold text-[var(--tx)]">
                  By severity
                </h3>
                <AdminDonutChart
                  data={
                    donut.length
                      ? donut
                      : [
                          {
                            name: 'No alerts',
                            value: 1,
                            color: ADMIN_CHART_COLORS.teal,
                          },
                        ]
                  }
                  height={200}
                  centerValue={stats?.period.opened ?? 0}
                  centerLabel="Alerts"
                />
              </div>
            </div>
          ) : undefined
        }
      >
        {tab === 'alerts' ? (
          isPending ? (
            <Skeleton height={280} radius="md" />
          ) : isError ? (
            <p className="mb-4 text-[13px] text-[var(--mu)]">
              Could not load alerts (need alerts:read).
            </p>
          ) : (
            <DynamicTableSection<AlertListApi>
              variant="embedded"
              headers={ALERT_HEADERS}
              data={alerts}
              pagination={pagination}
              getRowKey={(item) => item.id}
              toolbar={{
                title: 'Alerts',
                searchQuery: alertsControls.searchQuery,
                onSearchChange: alertsControls.setSearchQuery,
                searchPlaceholder: 'Search alert message or hub…',
                onFilter: alertsControls.openFilter,
                showFilter: true,
                showExport: true,
                onExportFormat: handleExport,
                isExporting: exporting,
              }}
              onRowClick={(item) => navigate(`/alerts/${item.id}`)}
              emptyTitle="No alerts"
              emptyMessage="Queue is clear for the current filters."
              renderItems={(item) => [
                <span key="time" className="text-xs text-[var(--mu)]">
                  {formatWhen(item.created_at)}
                </span>,
                <div key="title" className="flex items-center gap-2">
                  <Alert02Icon
                    size={14}
                    className={severityToneClass(item.severity)}
                  />
                  <span className="text-xs font-bold text-[var(--tx)]">
                    {kindTitle(item.kind)}
                  </span>
                </div>,
                <span key="sub" className="font-mono text-xs text-[var(--mu)]">
                  {item.hub_code
                    ? `${item.hub_code} · ${item.hub_name}`
                    : item.message.slice(0, 48)}
                </span>,
                <span
                  key="sev"
                  className="text-[10px] font-extrabold uppercase text-[var(--tx)]"
                >
                  {severityLabel(item.severity)}
                </span>,
                <span key="del" className="text-xs text-[var(--mu)]">
                  {item.delivery_channel || 'IN_APP'}
                </span>,
                <span key="age" className="font-mono text-xs text-[var(--mu)]">
                  {formatAge(item.created_at)}
                </span>,
                <TableStatusBadge
                  key="st"
                  label={item.status}
                  tone={alertStatusTone(item.status)}
                />,
              ]}
            />
          )
        ) : (
          <AlertRulesTab />
        )}
      </AdminModuleLayout>
      {tab === 'alerts' ? alertsControls.filterModal : null}
    </>
  )
}
