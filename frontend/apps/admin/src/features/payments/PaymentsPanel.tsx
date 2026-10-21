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
import { usePayments } from '@features/finance'
import { useCapabilities } from '@features/auth'
import { mapShiftToCashRow, useShifts } from './hooks/use-cash-ops'
import { PaymentsCashTable } from './PaymentsCashTable'
import { PaymentsLedgerTable } from './PaymentsLedgerTable'
import {
  cashTabKpis,
  cashVarianceBarData,
  channelBarData,
  paymentTabKpis,
  PaymentsHubScopeChip,
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
  const controls = tab === 'payments' ? paymentsControls : cashControls
  const dateRange = controls.dateRange

  const statusFilter = readFilter(paymentsControls.filterValues, 'status')
  const channelFilter = readFilter(paymentsControls.filterValues, 'channel')

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
    hubLabelParam ||
    liveShifts[0]?.hub_name ||
    liveShifts[0]?.hub_code ||
    (hubScope ? `Hub ${hubScope.slice(0, 8)}…` : null)

  const clearHubScope = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('hub')
        next.delete('hub_label')
        return next
      },
      { replace: true },
    )
  }

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

  const cashOnHand = cashMapped
    .filter((r) => r.status === 'ON_DUTY')
    .reduce((s, r) => s + Math.max(0, r.collectedNaira ?? r.openingNaira), 0)

  const channelBar = useMemo(() => channelBarData(payments), [payments])
  const cashVarianceBar = useMemo(
    () => cashVarianceBarData(cashMapped),
    [cashMapped],
  )

  return (
    <>
      <AdminModuleLayout
        title="Payments"
        subtitle="Wallet funding, swaps, renewals, and hub cash reconciliation"
        dateRangeSlot={controls.dateRangeSlot}
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
            ? paymentTabKpis(payments, cashOnHand)
            : cashTabKpis(cashMapped, cashOnHand, Boolean(hubScope))
        }
        chartsSlot={
          <div className="overflow-visible rounded-[14px] border border-[var(--bd)] bg-[var(--sf)] p-4 pb-5 shadow-[var(--sh)]">
            <h3 className="mb-3 text-[13px] font-bold text-[var(--tx)]">
              {tab === 'payments'
                ? 'Success by channel · ₦ hundred thousands (page)'
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
            />
          </div>
        }
      >
        {hubScope && hubScopeLabel ? (
          <PaymentsHubScopeChip
            label={hubScopeLabel}
            onClear={clearHubScope}
          />
        ) : null}
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
          />
        ) : (
          <PaymentsCashTable
            pageRows={cashPageRows}
            allRows={cashRows}
            pagination={cashPagination}
            searchQuery={cashControls.searchQuery}
            onSearchChange={cashControls.setSearchQuery}
            onFilter={cashControls.openFilter}
            onRowClick={(item) => navigate(`/payments/${item.id}`)}
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
