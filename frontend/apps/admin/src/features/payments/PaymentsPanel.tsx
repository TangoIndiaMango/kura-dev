import { PaymentsFilterBar, channelOptionLabel } from './PaymentsFilterBar'
import { useHubs } from '@features/hubs/hooks/use-hubs'
import dayjs from 'dayjs'
import { formatNaira } from '@shared/utils/currency'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AdminModuleLayout,
  AdminBarChart,
  ADMIN_CHART_COLORS,
  useAdminModuleControls,
} from '@shared/components'
import { useUrlTab } from '@shared/hooks/useUrlTab'
import {
  ADMIN_LIST_PAGE_SIZE,
  buildCursorPagination,
} from '@shared/utils/cursor-pagination'
import { usePaymentStats, usePayments } from '@features/finance'
import { useCapabilities } from '@features/auth'
import { notifications } from '@mantine/notifications'
import { apiErrorMessage } from '@lib/api/auth'
import { downloadExportFromApi } from '@shared/utils/downloadCsvFromApi'
import { mapShiftToCashRow, useShifts } from './hooks/use-cash-ops'
import { PaymentsCashTable } from './PaymentsCashTable'
import { PaymentsLedgerTable } from './PaymentsLedgerTable'
import {
  cashTabKpis,
  cashVarianceBarData,
  channelBarData,
  paymentTabKpis,
} from './paymentsPanelMetrics'
import {
  CASH_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  PAYMENTS_EXTRA_FILTER_FIELDS,
  readFilter,
} from './paymentsPanelShared'

export function PaymentsPanel() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { can } = useCapabilities()
  const canCash = can('shifts:manage')
  const [tab, setTab] = useUrlTab('payments', { valid: ['payments', 'cash'] })
  const [cursor, setCursor] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const hubScope = searchParams.get('hub')?.trim() || undefined
  const hubLabelParam = searchParams.get('hub_label')?.trim() || undefined

  const paymentsControls = useAdminModuleControls({
    scope: 'payments',
    statusOptions: PAYMENT_STATUS_OPTIONS,
    filterTitle: 'Filter payments',
    includeNameSort: false,
    includeValueSort: false,
    pageSize: ADMIN_LIST_PAGE_SIZE,
    extraFilterFields: PAYMENTS_EXTRA_FILTER_FIELDS,
  })
  const cashControls = useAdminModuleControls({
    scope: 'payments_cash',
    statusOptions: CASH_STATUS_OPTIONS,
    filterTitle: 'Filter cash reconciliation',
    pageSize: ADMIN_LIST_PAGE_SIZE,
  })
  // One date range for the whole page (both tabs, KPIs and export) — tabs used
  // to keep separate ranges, so arriving from a hub showed different days.
  const controls = paymentsControls
  const dateRange = controls.dateRange

  // Hub / method / status live in the URL so links and refreshes keep scope.
  const statusFilter =
    searchParams.get('status')?.trim() || readFilter(paymentsControls.filterValues, 'status')
  const channelFilter =
    searchParams.get('channel')?.trim() || readFilter(paymentsControls.filterValues, 'channel')
  const setParam = (key: string, value: string | null) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  const { hubs: hubList } = useHubs({ page_size: 200 })
  const hubOptions = useMemo(
    () => hubList.map((h) => ({ value: h.id, label: `${h.name} · ${h.code}` })),
    [hubList],
  )

  const resetCursor = () => {
    setCursor(undefined)
    setPage(1)
  }

  useEffect(() => {
    resetCursor()
  }, [
    dateRange.start_date,
    dateRange.end_date,
    statusFilter,
    channelFilter,
    paymentsControls.search,
    hubScope,
  ])

  const shiftsQuery = useShifts({
    enabled: tab === 'cash' && canCash,
    hub: hubScope,
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
  })
  const liveShifts = shiftsQuery.data?.results ?? []
  const hubScopeLabel =
    hubOptions.find((o) => o.value === hubScope)?.label ||
    hubLabelParam ||
    liveShifts[0]?.hub_name ||
    liveShifts[0]?.hub_code ||
    (hubScope ? `Hub ${hubScope.slice(0, 8)}…` : null)


  const {
    payments,
    isPending: paymentsPending,
    isPlaceholderData,
    nextCursor,
    previousCursor,
  } = usePayments(
    {
      status: statusFilter,
      channel: channelFilter,
      hub: hubScope,
      search: paymentsControls.search || undefined,
      start_date: dateRange.start_date,
      end_date: dateRange.end_date,
      cursor,
      page_size: ADMIN_LIST_PAGE_SIZE,
    },
    { enabled: tab === 'payments' },
  )

  // Server statement: every row for the current filters (not just this page),
  // Lagos-day bounds, plus totals by channel and by account.
  const exportStatement = async (format: 'csv' | 'pdf') => {
    const stem = ['kura-payments', dateRange.start_date, dateRange.end_date]
      .filter(Boolean)
      .join('-')
    try {
      await downloadExportFromApi('/finance/payments/export/', `${stem}.${format}`, {
        export: format,
        status: statusFilter,
        channel: channelFilter,
        hub: hubScope,
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      })
    } catch (err) {
      notifications.show({ color: 'red', message: apiErrorMessage(err, 'Export failed') })
    }
  }

  const paymentsPagination = buildCursorPagination({
    page,
    setPage,
    cursor,
    setCursor,
    nextCursor,
    previousCursor,
    isPlaceholderData,
    pageSize: ADMIN_LIST_PAGE_SIZE,
  })

  const cashMapped = useMemo(
    () => liveShifts.map(mapShiftToCashRow),
    [liveShifts],
  )
  const cashRows = useMemo(() => {
    const q = cashControls.search.toLowerCase()
    return cashMapped.filter(
      (r) =>
        cashControls.matchesStatus(r.status) &&
        (r.hub.toLowerCase().includes(q) || r.agent.toLowerCase().includes(q)),
    )
  }, [cashMapped, cashControls.search, cashControls.filterValues])
  const { pageRows: cashPageRows, pagination: cashPagination } =
    cashControls.paginate(cashRows)

  // Drawer cash = opening float + cash taken on open duty windows.
  const cashOnHand = cashMapped
    .filter((r) => r.status === 'ON_DUTY')
    .reduce((s, r) => s + r.openingNaira + Math.max(0, r.collectedNaira ?? 0), 0)

  const scopeSummary = [
    hubScope ? hubScopeLabel : 'All hubs',
    dateRange.start_date && dateRange.end_date
      ? `${dayjs(dateRange.start_date).format('D MMM')} – ${dayjs(dateRange.end_date).format('D MMM YYYY')}`
      : 'All dates',
    ...(tab === 'payments'
      ? [channelFilter ? channelOptionLabel(channelFilter) : 'All methods']
      : []),
    ...(tab === 'payments' && statusFilter ? [statusFilter.toLowerCase()] : []),
  ].join(' · ')

  const { stats: paymentStats } = usePaymentStats(
    {
      status: statusFilter,
      channel: channelFilter,
      hub: hubScope,
      start_date: dateRange.start_date,
      end_date: dateRange.end_date,
    },
    { enabled: tab === 'payments' },
  )
  const channelBar = useMemo(() => channelBarData(paymentStats), [paymentStats])
  const cashVarianceBar = useMemo(
    () => cashVarianceBarData(cashMapped),
    [cashMapped],
  )

  return (
    <>
      <AdminModuleLayout
        title="Payments"
        subtitle="Wallet funding, swaps, renewals, and hub cash reconciliation"
        overviewTitle={`Showing: ${scopeSummary}`}
        filtersSlot={
          <PaymentsFilterBar
            hubId={hubScope}
            hubOptions={hubOptions}
            onHubChange={(id, label) =>
              setSearchParams(
                (prev) => {
                  const next = new URLSearchParams(prev)
                  if (id) {
                    next.set('hub', id)
                    if (label) next.set('hub_label', label)
                  } else {
                    next.delete('hub')
                    next.delete('hub_label')
                  }
                  return next
                },
                { replace: true },
              )
            }
            dateRangeSlot={controls.dateRangeSlot}
            channel={channelFilter}
            onChannelChange={(v) => setParam('channel', v || null)}
            status={statusFilter}
            onStatusChange={(v) => setParam('status', v || null)}
            showPaymentFilters={tab === 'payments'}
          />
        }
        tabs={[
          { id: 'payments', label: 'Payments' },
          // Shift cash needs shifts:manage — finance-read roles see payments only.
          ...(canCash ? [{ id: 'cash', label: 'Cash Reconciliation' }] : []),
        ]}
        activeTab={tab}
        onTabChange={(next) => {
          resetCursor()
          setTab(next)
        }}
        kpis={
          tab === 'payments'
            ? paymentTabKpis(paymentStats, cashOnHand)
            : cashTabKpis(cashMapped, cashOnHand, Boolean(hubScope))
        }
        chartsSlot={
          <div className="overflow-visible rounded-[14px] border border-[var(--bd)] bg-[var(--sf)] p-4 pb-5 shadow-[var(--sh)]">
            <h3 className="mb-3 text-[13px] font-bold text-[var(--tx)]">
              {tab === 'payments'
                ? 'Collected by channel · selected period (₦)'
                : 'Cash variance by hub · ₦ thousands'}
            </h3>
            <AdminBarChart
              data={tab === 'payments' ? channelBar : cashVarianceBar}
              series={[
                {
                  dataKey: tab === 'payments' ? 'amount' : 'variance',
                  name: tab === 'payments' ? 'Collections' : 'Variance',
                  color:
                    tab === 'payments'
                      ? ADMIN_CHART_COLORS.teal
                      : ADMIN_CHART_COLORS.amber,
                },
              ]}
              height={220}
              {...(tab === 'payments'
                ? { yAxisWidth: 64, valueFormatter: (v: number) => formatNaira(v) }
                : {})}
            />
          </div>
        }
      >
        {tab === 'payments' ? (
          <PaymentsLedgerTable
            payments={payments}
            pending={paymentsPending}
            pagination={paymentsPagination}
            searchQuery={paymentsControls.searchQuery}
            onSearchChange={(v) => {
              resetCursor()
              paymentsControls.setSearchQuery(v)
            }}
            onFilter={paymentsControls.openFilter}
            onRowClick={(item) => navigate(`/payments/${item.id}`)}
            onExport={exportStatement}
          />
        ) : (
          <PaymentsCashTable
            pageRows={cashPageRows}
            allRows={cashRows}
            pagination={cashPagination}
            searchQuery={cashControls.searchQuery}
            onSearchChange={cashControls.setSearchQuery}
            onFilter={cashControls.openFilter}
            onRowClick={(item) => navigate(`/payments/cash/${item.id}`)}
            onRecordCash={() => navigate('/payments/record-cash')}
            canRecord={can('shifts:manage')}
          />
        )}
      </AdminModuleLayout>
      {paymentsControls.filterModal}
      {cashControls.filterModal}
    </>
  )
}
