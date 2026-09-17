import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Skeleton } from '@mantine/core'
import { PlusSignIcon } from 'hugeicons-react'
import {
  AdminModuleLayout,
  AdminBarChart,
  ADMIN_CHART_COLORS,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableHeader,
  type TablePaginationConfig,
} from '@shared/components'
import { useUrlTab } from '@shared/hooks/useUrlTab'
import { usePayments, type PaymentApi } from '@features/finance'
import { useCapabilities } from '@features/auth'
import { formatNaira } from '@shared/utils/currency'
import { downloadCsv } from '@shared/utils/downloadCsv'
import {
  cashStatusLabel,
  cashStatusTone,
  paymentChannelLabel,
  paymentStatusLabel,
  paymentStatusTone,
} from './paymentDetailHelpers'
import { mapShiftToCashRow, useShifts } from './hooks/use-cash-ops'

const PAYMENT_HEADERS: TableHeader[] = [
  { key: 'ref', label: 'REFERENCE' },
  { key: 'date', label: 'DATE & TIME' },
  { key: 'account', label: 'ACCOUNT' },
  { key: 'channel', label: 'CHANNEL' },
  { key: 'purpose', label: 'PURPOSE' },
  { key: 'amount', label: 'AMOUNT' },
  { key: 'status', label: 'STATUS' },
]

const CASH_HEADERS: TableHeader[] = [
  { key: 'hub', label: 'HUB' },
  { key: 'agent', label: 'AGENT' },
  { key: 'collected', label: 'COLLECTED' },
  { key: 'deposited', label: 'DEPOSITED' },
  { key: 'variance', label: 'VARIANCE' },
  { key: 'asOf', label: 'AS OF' },
  { key: 'status', label: 'STATUS' },
]

const PAYMENT_STATUS_OPTIONS = [
  { value: 'SUCCESS', label: 'Successful' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REVERSED', label: 'Reversed' },
]

const CASH_STATUS_OPTIONS = [
  { value: 'ON_DUTY', label: 'On duty' },
  { value: 'AWAITING_LODGE', label: 'Awaiting bank lodge' },
  { value: 'SETTLED', label: 'Settled' },
  { value: 'SHORT', label: 'Short drawer' },
  { value: 'VARIANCE', label: 'Needs review' },
]

const CHANNEL_OPTIONS = [
  { value: 'NUBAN_TRANSFER', label: 'NUBAN transfer' },
  { value: 'WALLET_DEBIT', label: 'Wallet debit' },
  { value: 'AGENT_CASH', label: 'Cash at hub' },
  { value: 'CARD', label: 'Card' },
  { value: 'CREDIT', label: 'Credit' },
]

type CashTableRow = ReturnType<typeof mapShiftToCashRow>

function readFilter(values: Record<string, unknown>, key: string): string | undefined {
  const raw = values[key]
  if (raw == null || raw === '' || raw === 'all') return undefined
  if (Array.isArray(raw)) return raw.length ? String(raw[0]) : undefined
  return String(raw)
}

function cursorPagination(
  cursor: string | undefined,
  nextCursor: string | undefined,
  previousCursor: string | undefined,
  setCursor: (c: string | undefined) => void,
): TablePaginationConfig {
  return {
    page: cursor ? 2 : 1,
    totalPages: nextCursor ? (cursor ? 3 : 2) : cursor ? 2 : 1,
    onPageChange: () => undefined,
    variant: 'controls',
    pageSize: '25',
    onNext: nextCursor ? () => setCursor(nextCursor) : undefined,
    onPrevious: previousCursor
      ? () => setCursor(previousCursor)
      : cursor
        ? () => setCursor(undefined)
        : undefined,
  }
}

export function PaymentsPanel() {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const [tab, setTab] = useUrlTab('payments', { valid: ['payments', 'cash'] })
  const [cursor, setCursor] = useState<string | undefined>()
  const shiftsQuery = useShifts({ enabled: tab === 'cash' })
  const liveShifts = shiftsQuery.data?.results ?? []

  const paymentsControls = useAdminModuleControls({
    scope: 'payments',
    statusOptions: PAYMENT_STATUS_OPTIONS,
    filterTitle: 'Filter payments',
    includeNameSort: false,
    includeValueSort: false,
    extraFilterFields: [
      {
        type: 'select',
        key: 'channel',
        label: 'Channel',
        placeholder: 'Any',
        options: CHANNEL_OPTIONS,
      },
    ],
  })
  const cashControls = useAdminModuleControls({
    scope: 'payments_cash',
    statusOptions: CASH_STATUS_OPTIONS,
    filterTitle: 'Filter cash reconciliation',
  })
  const controls = tab === 'payments' ? paymentsControls : cashControls

  const statusFilter = readFilter(paymentsControls.filterValues, 'status')
  const channelFilter = readFilter(paymentsControls.filterValues, 'channel')

  const {
    payments,
    isPending: paymentsPending,
    nextCursor,
    previousCursor,
  } = usePayments(
    {
      status: statusFilter,
      channel: channelFilter,
      search: paymentsControls.search || undefined,
      cursor,
      page_size: 25,
    },
    { enabled: tab === 'payments' },
  )

  const cashMapped = useMemo(() => liveShifts.map(mapShiftToCashRow), [liveShifts])
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

  const successSum = payments
    .filter((p) => p.status === 'SUCCESS')
    .reduce((s, p) => s + p.amount_kobo, 0)
  const pendingCount = payments.filter((p) => p.status === 'PENDING').length
  const failedCount = payments.filter((p) => p.status === 'FAILED').length
  const varianceHubs = cashMapped.filter((r) => r.status === 'VARIANCE').length
  const closedCount = cashMapped.filter(
    (r) =>
      r.status === 'SETTLED' ||
      r.status === 'SHORT' ||
      r.status === 'AWAITING_LODGE',
  ).length
  const cashOnHand = cashMapped
    .filter((r) => r.status === 'ON_DUTY')
    .reduce((s, r) => s + Math.max(0, r.collectedNaira ?? r.openingNaira), 0)

  const channelBar = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of payments) {
      if (p.status !== 'SUCCESS') continue
      map.set(p.channel, (map.get(p.channel) ?? 0) + p.amount_kobo)
    }
    return [...map.entries()].map(([channel, kobo]) => ({
      label: paymentChannelLabel(channel).split(' ')[0] ?? channel,
      amount: Math.round(kobo / 100_000) / 10,
    }))
  }, [payments])

  const cashVarianceBar = cashMapped.slice(0, 8).map((r) => ({
    label: r.hub.split('-')[1] || r.hub.slice(0, 4),
    variance: Math.abs(r.varianceNaira ?? 0) / 1000,
  }))

  return (
    <>
      <AdminModuleLayout
        title="Payments"
        subtitle="Wallet funding, swaps, renewals, and hub cash reconciliation"
        dateRangeSlot={controls.dateRangeSlot}
        tabs={[
          { id: 'payments', label: 'Payments' },
          { id: 'cash', label: 'Cash Reconciliation' },
        ]}
        activeTab={tab}
        onTabChange={setTab}
        kpis={
          tab === 'payments'
            ? [
                {
                  title: 'Page success total',
                  value: formatNaira(successSum, { fromKobo: true }),
                  sub: 'Successful on this page',
                  tone: 'success',
                },
                {
                  title: 'Pending',
                  value: pendingCount,
                  sub: 'Awaiting confirm',
                  tone: 'warning',
                },
                {
                  title: 'Failed',
                  value: failedCount,
                  sub: 'On this page',
                  tone: failedCount > 0 ? 'danger' : 'default',
                },
                {
                  title: 'Cash on hand',
                  value: formatNaira(cashOnHand),
                  sub: 'From open shifts',
                  tone: cashOnHand > 0 ? 'warning' : 'default',
                },
              ]
            : [
                {
                  title: 'Hubs reporting',
                  value: cashMapped.length,
                  sub: 'Shifts in view',
                },
                {
                  title: 'Closed',
                  value: closedCount,
                  sub: 'Reconciled shifts',
                  tone: 'success',
                },
                {
                  title: 'Variance / review',
                  value: varianceHubs,
                  sub: 'Needs ops action',
                  tone: varianceHubs > 0 ? 'danger' : 'default',
                },
                {
                  title: 'Outstanding',
                  value: formatNaira(cashOnHand),
                  sub: 'Deposit pending',
                  tone: 'warning',
                },
              ]
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
        {tab === 'payments' ? (
          paymentsPending ? (
            <Skeleton height={220} radius="md" />
          ) : (
            <DynamicTableSection<PaymentApi>
              variant="embedded"
              headers={PAYMENT_HEADERS}
              data={payments}
              pagination={cursorPagination(
                cursor,
                nextCursor,
                previousCursor,
                setCursor,
              )}
              getRowKey={(item) => item.id}
              toolbar={{
                title: 'All payments',
                searchQuery: paymentsControls.searchQuery,
                onSearchChange: (v) => {
                  setCursor(undefined)
                  paymentsControls.setSearchQuery(v)
                },
                searchPlaceholder: 'Search receipt or purpose…',
                onFilter: paymentsControls.openFilter,
                showFilter: true,
                onExport: () =>
                  downloadCsv(
                    'payments.csv',
                    [
                      'receipt',
                      'date',
                      'account',
                      'channel',
                      'purpose',
                      'amount_kobo',
                      'status',
                    ],
                    payments.map((p) => [
                      p.receipt_code,
                      p.created_at,
                      p.account_id,
                      p.channel,
                      p.purpose,
                      p.amount_kobo,
                      p.status,
                    ]),
                  ),
              }}
              onRowClick={(item) => navigate(`/payments/${item.id}`)}
              emptyTitle="No payments"
              emptyMessage="Live rows from GET /finance/payments/."
              renderItems={(item) => [
                <span
                  key="ref"
                  className="font-mono text-xs font-bold text-[var(--pr)]"
                >
                  {item.receipt_code}
                </span>,
                <span key="date" className="text-xs text-[var(--mu)]">
                  {new Date(item.created_at).toLocaleString()}
                </span>,
                <span key="ac" className="font-mono text-xs text-[var(--tx)]">
                  {item.account_id.slice(0, 8)}…
                </span>,
                <span key="ch" className="text-xs text-[var(--mu)]">
                  {paymentChannelLabel(item.channel)}
                </span>,
                <span key="pur" className="text-xs text-[var(--mu)]">
                  {item.purpose}
                </span>,
                <span
                  key="amt"
                  className="font-mono text-xs font-extrabold text-[var(--tx)]"
                >
                  {formatNaira(item.amount_kobo, { fromKobo: true })}
                </span>,
                <TableStatusBadge
                  key="st"
                  label={paymentStatusLabel(item.status)}
                  tone={paymentStatusTone(item.status)}
                />,
              ]}
            />
          )
        ) : (
          <DynamicTableSection<CashTableRow>
            variant="embedded"
            headers={CASH_HEADERS}
            data={cashPageRows}
            pagination={cashPagination}
            getRowKey={(item) => item.id}
            toolbar={{
              title: 'Cash reconciliation',
              searchQuery: cashControls.searchQuery,
              onSearchChange: cashControls.setSearchQuery,
              searchPlaceholder: 'Search hub or agent…',
              onFilter: cashControls.openFilter,
              showFilter: true,
              actions: can('shifts:manage') ? (
                <Button
                  leftSection={<PlusSignIcon size={16} />}
                  onClick={() => navigate('/payments/record-cash')}
                >
                  Record cash
                </Button>
              ) : undefined,
              onExport: () =>
                downloadCsv(
                  'cash-reconciliation.csv',
                  [
                    'hub',
                    'agent',
                    'collected',
                    'deposited',
                    'variance',
                    'asOf',
                    'status',
                  ],
                  cashRows.map((r) => [
                    r.hub,
                    r.agent,
                    r.collectedNaira,
                    r.depositedNaira,
                    r.varianceNaira,
                    r.asOf,
                    r.status,
                  ]),
                ),
            }}
            onRowClick={(item) => navigate(`/payments/${item.id}`)}
            renderItems={(item) => [
              <span key="hub" className="text-xs font-bold text-[var(--tx)]">
                {item.hub}
              </span>,
              <span key="agent" className="text-xs text-[var(--mu)]">
                {item.agent}
              </span>,
              <span key="col" className="font-mono text-xs text-[var(--tx)]">
                {item.collectedNaira != null
                  ? formatNaira(item.collectedNaira)
                  : '—'}
              </span>,
              <span key="dep" className="font-mono text-xs text-[var(--tx)]">
                {formatNaira(item.depositedNaira)}
              </span>,
              <span
                key="var"
                className={`font-mono text-xs font-bold ${
                  !item.varianceNaira
                    ? 'text-[var(--mu)]'
                    : 'text-[#C0392B]'
                }`}
              >
                {item.varianceNaira != null
                  ? formatNaira(item.varianceNaira)
                  : '—'}
              </span>,
              <span key="asOf" className="text-xs text-[var(--mu)]">
                {new Date(item.asOf).toLocaleString()}
              </span>,
              <TableStatusBadge
                key="st"
                label={cashStatusLabel(item.status)}
                tone={cashStatusTone(item.status)}
              />,
            ]}
          />
        )}
      </AdminModuleLayout>
      {paymentsControls.filterModal}
      {cashControls.filterModal}
    </>
  )
}
