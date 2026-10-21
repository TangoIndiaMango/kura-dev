import {
  DynamicTableSection,
  LoadingState,
  type DateRangeOutput,
  type TableHeader,
} from '@shared/components'
import { formatNaira } from '@shared/utils/currency'
import { useRevenueAnalyticsSettings } from './RevenueSettingsTab'
import { formatCompactNaira, formatPct, splitShareableRevenue } from './revenueMath'
import { useRevenueStreams } from './useRevenueStreams'

const STREAM_HEADERS: TableHeader[] = [
  { key: 'layer', label: 'PURPOSE' },
  { key: 'tx', label: 'TXNS' },
  { key: 'amount', label: 'AMOUNT' },
  { key: 'share', label: 'SHARE OF GROSS' },
]

export function RevenueStreamsTab({ range }: { range: DateRangeOutput }) {
  const { settings } = useRevenueAnalyticsSettings()
  const { data, isPending, isError } = useRevenueStreams({
    start_date: range.start_date || undefined,
    end_date: range.end_date || undefined,
  })

  if (isPending) return <LoadingState variant="inline" cols={4} rows={6} />
  if (isError || !data) {
    return (
      <p className="p-4 text-[13px] text-[var(--mu)]">
        Could not load revenue streams (need analytics:revenue).
      </p>
    )
  }

  const grossKobo = data.gross_kobo
  const grossNaira = grossKobo / 100
  const streams = data.streams
  const split = splitShareableRevenue(grossNaira, settings)

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-3.5 py-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
            Gross (ledger)
          </p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--tx)]">
            {formatCompactNaira(grossNaira)}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--mu)]">
            {data.range.start_date} → {data.range.end_date}
          </p>
        </div>
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-3.5 py-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
            Latila · {settings.latilaSharePct}%
          </p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--tx)]">
            {formatCompactNaira(split.latila)}
          </p>
        </div>
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-3.5 py-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
            Emicraft · {settings.emicraftSharePct}%
          </p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--tx)]">
            {formatCompactNaira(split.emicraft)}
          </p>
        </div>
      </div>

      <DynamicTableSection<(typeof streams)[number]>
        variant="embedded"
        headers={STREAM_HEADERS}
        data={streams}
        getRowKey={(row) => row.code}
        showRowAction={false}
        toolbar={{ title: 'Purpose streams (live ledger)', showFilter: false }}
        renderItems={(row) => [
          <span key="layer" className="text-xs font-bold text-[var(--tx)]">
            {row.label}
          </span>,
          <span key="tx" className="font-mono text-xs text-[var(--mu)]">
            {row.transactions}
          </span>,
          <span key="amt" className="text-xs font-bold tabular-nums text-[var(--tx)]">
            {formatNaira(row.amount_kobo, { fromKobo: true })}
          </span>,
          <span key="share" className="font-mono text-xs text-[var(--mu)]">
            {formatPct(grossKobo > 0 ? (row.amount_kobo / grossKobo) * 100 : 0)}
          </span>,
        ]}
      />
    </div>
  )
}
