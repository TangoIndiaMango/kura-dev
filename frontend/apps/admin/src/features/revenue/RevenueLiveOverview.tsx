import { Alert, Skeleton } from '@mantine/core'
import {
  AdminAreaChart,
  AdminDonutChart,
  DynamicTableSection,
  ADMIN_CHART_COLORS,
  type TableHeader,
} from '@shared/components'
import { formatNaira } from '@shared/utils/currency'
import type { RevenueBreakdown, RevenueOverview } from './useRevenueOverview'

const BREAKDOWN_HEADERS: TableHeader[] = [
  { key: 'name', label: 'SOURCE' },
  { key: 'transactions', label: 'TRANSACTIONS' },
  { key: 'amount', label: 'COLLECTED' },
]

export function RevenueLiveOverview({
  data,
  isLoading,
  isError,
}: {
  data?: RevenueOverview
  isLoading: boolean
  isError: boolean
}) {
  if (isLoading) {
    return (
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <Skeleton height={280} radius="md" />
        <Skeleton height={280} radius="md" />
      </div>
    )
  }

  if (isError) {
    return (
      <Alert color="red" title="Revenue data unavailable" m="md">
        Live revenue could not be loaded. No fallback or estimated values are shown.
      </Alert>
    )
  }

  if (!data) return null

  const channels = data.channels ?? []
  const sourceRows = [...channels, ...(data.purposes ?? [])]
  const chartRows = data.daily.map((row) => ({
    label: row.day.slice(5),
    revenue: Math.round(row.amount_kobo / 100),
  }))
  const donutRows = channels.map((row, index) => ({
    name: row.channel || 'Other',
    value: row.amount_kobo,
    color: [
      ADMIN_CHART_COLORS.teal,
      ADMIN_CHART_COLORS.navy,
      ADMIN_CHART_COLORS.amber,
      ADMIN_CHART_COLORS.sky,
      ADMIN_CHART_COLORS.green,
    ][index % 5],
  }))

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5">
      <Alert color="blue" title="Live ledger scope">
        Collections, VAT, pending payments, and plan counts on this tab are read
        from KURA&apos;s payment records. Streams, cohorts, and vehicle economics
        remain planning models on their own tabs.
      </Alert>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-[var(--bd)] bg-[var(--sf)] p-4">
          <h3 className="text-sm font-bold text-[var(--tx)]">Collections by day</h3>
          {chartRows.length ? (
            <AdminAreaChart
              data={chartRows}
              series={[
                {
                  dataKey: 'revenue',
                  name: 'Revenue (₦)',
                  color: ADMIN_CHART_COLORS.teal,
                },
              ]}
              height={240}
            />
          ) : (
            <p className="py-20 text-center text-sm text-[var(--mu)]">
              No successful payments in this range.
            </p>
          )}
        </section>
        <section className="rounded-xl border border-[var(--bd)] bg-[var(--sf)] p-4">
          <h3 className="text-sm font-bold text-[var(--tx)]">Payment channels</h3>
          {donutRows.length ? (
            <AdminDonutChart data={donutRows} height={240} />
          ) : (
            <p className="py-20 text-center text-sm text-[var(--mu)]">
              No channel totals in this range.
            </p>
          )}
        </section>
      </div>

      <DynamicTableSection<RevenueBreakdown>
        variant="embedded"
        headers={BREAKDOWN_HEADERS}
        data={sourceRows}
        getRowKey={(row) =>
          row.channel ? `channel-${row.channel}` : `purpose-${row.purpose}`
        }
        showRowAction={false}
        toolbar={{ title: 'Collection breakdown', showFilter: false }}
        renderItems={(row) => [
          <span key="name" className="font-semibold text-[var(--tx)]">
            {row.channel || row.purpose || 'Other'}
          </span>,
          <span key="count">{row.transactions}</span>,
          <span key="amount">{formatNaira(row.amount_kobo, { fromKobo: true })}</span>,
        ]}
      />
    </div>
  )
}
