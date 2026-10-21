import { PaymentsListFilters, PaymentsScopeControls } from './PaymentsFilterBar'
import { useHubs } from '@features/hubs/hooks/use-hubs'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AdminModuleLayout, useAdminModuleControls } from '@shared/components'
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
  PaymentsMethodBreakdown,
  paymentTabKpis,
} from './paymentsPanelMetrics'
import { CASH_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS } from './paymentsPanelShared'

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
  const statusFilter = searchParams.get('status')?.trim() || undefined
  const channelFilter = searchParams.get('channel')?.trim() || undefined
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
    () => hubList.map((h) => ({ value: h.id, label: h.name })),
    [hubList],
  )

  // A hub opened from a link stays labelled even before the hub list loads.
  const hubOptionsWithScope = useMemo(
    () =>
      hubScope && !hubOptions.some((o) => o.value === hubScope)
        ? [...hubOptions, { value: hubScope, label: hubLabelParam ?? 'Selected hub' }]
        : hubOptions,
    [hubOptions, hubScope, hubLabelParam],
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

  // KPIs show every status for the scope, so the status filter is list-only.
  const { stats: paymentStats } = usePaymentStats(
    {
      channel: channelFilter,
      hub: hubScope,
      start_date: dateRange.start_date,
      end_date: dateRange.end_date,
    },
    { enabled: tab === 'payments' },
  )
  return (
    <>
      <AdminModuleLayout
        title="Payments"
        subtitle="Wallet funding, swaps, renewals, and hub cash reconciliation"
        dateRangeSlot={
          <PaymentsScopeControls
            hubId={hubScope}
            hubOptions={hubOptionsWithScope}
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
          />
        }
        tabs={[
          { id: 'payments', label: 'Payments' },
          // Shift cash needs shifts:manage — finance-read roles see payments only.
          ...(canCash ? [{ id: 'cash', label: 'Cash reconciliation' }] : []),
        ]}
        activeTab={tab}
        onTabChange={(next) => {
          resetCursor()
          setTab(next)
        }}
        kpis={
          tab === 'payments'
            ? paymentTabKpis(paymentStats)
            : cashTabKpis(cashMapped, Boolean(hubScope))
        }
        chartsSlot={
          tab === 'payments' ? <PaymentsMethodBreakdown stats={paymentStats} /> : undefined
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
            filters={
              <PaymentsListFilters
                channel={channelFilter}
                onChannelChange={(v) => setParam('channel', v || null)}
                status={statusFilter}
                onStatusChange={(v) => setParam('status', v || null)}
              />
            }
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
      {cashControls.filterModal}
    </>
  )
}
