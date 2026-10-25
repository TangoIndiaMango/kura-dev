import { PaymentsListFilters, PaymentsScopeControls, RefundsListFilters } from './PaymentsFilterBar'
import { useRefundsTab } from './hooks/use-refunds'
import { useTabHubs } from './hooks/use-tab-hub'
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
import { PaymentsRefundsTable } from './PaymentsRefundsTable'
import {
  kpisForTab,
  PaymentsMethodBreakdown,
} from './paymentsPanelMetrics'
import { CASH_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS } from './paymentsPanelShared'

export function PaymentsPanel() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { can } = useCapabilities()
  const canCash = can('shifts:manage')
  const canRefunds = can('wallets:manage')
  const [tab, setTab] = useUrlTab('payments', { valid: ['payments', 'cash', 'refunds'] })
  const [cursor, setCursor] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  // Each tab keeps its own hub and days, so one tab's filter never silently
  // narrows another. Payments: hub / payments_*; Cash: cash_hub / payments_cash_*.
  const tabHubs = useTabHubs()
  const hubScope = tabHubs.hubOf('hub')
  const cashHub = tabHubs.hubOf('cash_hub')

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
  const dateRange = paymentsControls.dateRange
  const cashRange = cashControls.dateRange

  // Hub / method / status live in the URL so links and refreshes keep scope.
  const statusFilter = searchParams.get('status')?.trim() || undefined
  const channelFilter = searchParams.get('channel')?.trim() || undefined
  const refundStatusFilter = searchParams.get('refund_status')?.trim() || undefined
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

  const resetCursor = () => {
    setCursor(undefined)
    setPage(1)
  }


  const shiftsQuery = useShifts({
    enabled: tab === 'cash' && canCash,
    hub: cashHub,
    start_date: cashRange.start_date,
    end_date: cashRange.end_date,
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

  const refundsTab = useRefundsTab({
    enabled: tab === 'refunds' && canRefunds,
    status: refundStatusFilter,
    cursor,
    setCursor,
    page,
    setPage,
  })

  useEffect(() => {
    resetCursor()
  }, [
    dateRange.start_date,
    dateRange.end_date,
    statusFilter,
    channelFilter,
    paymentsControls.search,
    refundStatusFilter,
    hubScope,
    refundsTab.dateRange.start_date,
    refundsTab.dateRange.end_date,
  ])

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
        subtitle="Swap and plan payments, hub cash, and refunds"
        dateRangeSlot={
          // Refunds aren't tied to a hub: that tab has its own days only.
          tab === 'refunds' ? (
            refundsTab.dateRangeSlot
          ) : tab === 'cash' ? (
            <PaymentsScopeControls
              hubId={cashHub}
              hubOptions={tabHubs.optionsFor('cash_hub')}
              onHubChange={(id, label) => tabHubs.setHub('cash_hub', id, label)}
              dateRangeSlot={cashControls.dateRangeSlot}
            />
          ) : (
            <PaymentsScopeControls
              hubId={hubScope}
              hubOptions={tabHubs.optionsFor('hub')}
              onHubChange={(id, label) => tabHubs.setHub('hub', id, label)}
              dateRangeSlot={paymentsControls.dateRangeSlot}
            />
          )
        }
        tabs={[
          { id: 'payments', label: 'Payments' },
          // Shift cash needs shifts:manage — finance-read roles see payments only.
          ...(canCash ? [{ id: 'cash', label: 'Cash reconciliation' }] : []),
          // Unused Paystack payments wait here for finance to approve the refund.
          ...(canRefunds ? [{ id: 'refunds', label: 'Refunds' }] : []),
        ]}
        activeTab={tab}
        onTabChange={(next) => {
          resetCursor()
          setTab(next)
        }}
        kpis={kpisForTab(tab, paymentStats, cashMapped, Boolean(cashHub), refundsTab.stats)}
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
        ) : tab === 'refunds' && canRefunds ? (
          <PaymentsRefundsTable
            {...refundsTab}
            onSearchChange={(v) => {
              resetCursor()
              refundsTab.setSearchQuery(v)
            }}
            onReviewed={refundsTab.refresh}
            filters={
              <RefundsListFilters
                status={refundStatusFilter}
                onStatusChange={(v) => setParam('refund_status', v || null)}
              />
            }
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
