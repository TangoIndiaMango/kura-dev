import { useMemo } from 'react'
import {
  AdminAreaChart,
  DynamicTableSection,
  TableStatusBadge,
  ADMIN_CHART_COLORS,
  type DateRangeOutput,
  type TableHeader,
} from '@shared/components'
import {
  MOCK_REVENUE_MONTHLY,
  MOCK_REVENUE_STREAMS,
  type RevenueStreamRow,
} from '@shared/mock/adminMockData'
import { useRevenueAnalyticsSettings } from './RevenueSettingsTab'
import {
  formatCompactNaira,
  formatPct,
  monthsForRange,
  scaleStreams,
  splitShareableRevenue,
  streamSharePct,
  sumStreams,
} from './revenueMath'

const STREAM_HEADERS: TableHeader[] = [
  { key: 'layer', label: 'LAYER' },
  { key: 'metric', label: 'METRIC' },
  { key: 'amount', label: 'AMOUNT' },
  { key: 'share', label: 'SHARE OF TOTAL' },
  { key: 'shareable', label: 'PARTNER SHARE' },
]

export function RevenueStreamsTab({ range }: { range: DateRangeOutput }) {
  const { settings } = useRevenueAnalyticsSettings()
  const streams = useMemo(() => scaleStreams(MOCK_REVENUE_STREAMS, range), [range])
  const months = useMemo(
    () =>
      monthsForRange(MOCK_REVENUE_MONTHLY, range).map((point) => ({
        label: point.label,
        energy: point.energy,
        finance: point.finance,
        licensing: point.licensing,
      })),
    [range],
  )
  const total = sumStreams(streams)
  const shareable = sumStreams(streams, true)
  const split = splitShareableRevenue(shareable, settings)

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
        <h3 className="text-[13px] font-bold text-[var(--tx)]">
          Revenue layers by month
        </h3>
        <p className="mb-3 text-[11px] text-[var(--mu)]">
          Planning model · ₦ millions · Energy, Finance, and Data layers
        </p>
        <AdminAreaChart
          data={months}
          series={[
            { dataKey: 'energy', name: 'Energy', color: ADMIN_CHART_COLORS.teal },
            { dataKey: 'finance', name: 'Finance', color: ADMIN_CHART_COLORS.navy },
            {
              dataKey: 'licensing',
              name: 'Data licensing',
              color: ADMIN_CHART_COLORS.amber,
            },
          ]}
          height={240}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-3.5 py-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
            Shareable revenue
          </p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--tx)]">
            {formatCompactNaira(shareable)}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--mu)]">
            {formatPct(streamSharePct(shareable, total))} of modelled revenue
          </p>
        </div>
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-3.5 py-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
            Latila share · {settings.latilaSharePct}%
          </p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--tx)]">
            {formatCompactNaira(split.latila)}
          </p>
        </div>
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-3.5 py-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
            Emicraft share · {settings.emicraftSharePct}%
          </p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--tx)]">
            {formatCompactNaira(split.emicraft)}
          </p>
        </div>
      </div>

      <DynamicTableSection<RevenueStreamRow>
        variant="embedded"
        headers={STREAM_HEADERS}
        data={streams}
        getRowKey={(row) => row.id}
        showRowAction={false}
        toolbar={{ title: 'Revenue streams', showFilter: false }}
        renderItems={(row) => [
          <span key="layer" className="text-xs font-bold text-[var(--tx)]">
            {row.layer}
          </span>,
          <span key="metric" className="text-xs text-[var(--mu)]">
            {row.metric}
          </span>,
          <span key="amt" className="text-xs font-bold tabular-nums text-[var(--tx)]">
            {formatCompactNaira(row.amountNaira)}
          </span>,
          <span key="share" className="font-mono text-xs text-[var(--mu)]">
            {formatPct(streamSharePct(row.amountNaira, total))}
          </span>,
          <TableStatusBadge
            key="sh"
            label={row.shareable ? 'Shareable' : 'Retained'}
            tone={row.shareable ? 'success' : 'default'}
          />,
        ]}
      />
    </div>
  )
}
