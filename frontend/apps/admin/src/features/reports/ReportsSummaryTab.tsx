import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Select, Skeleton } from '@mantine/core'
import dayjs from 'dayjs'
import {
  ADMIN_CHART_COLORS,
  AdminBarChart,
  AdminKpiCard,
  DateRangePicker,
  DynamicTableSection,
  type AdminKpiCardProps,
  type TableHeader,
} from '@shared/components'
import { useHubs } from '../hubs/hooks/use-hubs'
import { useCooperatives } from '../operators/hooks/use-cooperatives'
import { useCapabilities } from '../auth/useCapabilities'
import {
  useReportsSummary,
  useSummaryCooperatives,
  useSummaryHubs,
  type SummaryCoopRow,
  type SummaryFilters,
  type SummaryHubRow,
  type SummarySplit,
} from './api'
import { count, delta, naira, nairaShort, rangeLabel, shortNumber, words } from './format'

// The key figure comes second in every table so a phone shows it unscrolled.
const HUB_HEADERS: TableHeader[] = [
  { key: 'hub', label: 'HUB' },
  { key: 'money', label: 'REVENUE' },
  { key: 'swaps', label: 'SWAPS' },
  { key: 'expired', label: 'EXPIRED BOOKINGS' },
  { key: 'overrides', label: 'OVERRIDES' },
]

const COOP_HEADERS: TableHeader[] = [
  { key: 'group', label: 'CHAIRMAN GROUP' },
  { key: 'money', label: 'REVENUE FROM THEIR BIKES' },
  { key: 'perVehicle', label: 'PER VEHICLE / DAY' },
  { key: 'vehicles', label: 'VEHICLES' },
  { key: 'swaps', label: 'SWAPS' },
  { key: 'packs', label: 'PACKS OUT' },
]

const SPLIT_HEADERS: TableHeader[] = [
  { key: 'what', label: 'WHAT' },
  { key: 'amount', label: 'AMOUNT' },
  { key: 'change', label: 'VS BEFORE' },
  { key: 'payments', label: 'PAYMENTS' },
]

function defaultRange() {
  return {
    start_date: dayjs().subtract(29, 'day').format('YYYY-MM-DD'),
    end_date: dayjs().format('YYYY-MM-DD'),
  }
}

function SplitTable({ title, rows }: { title: string; rows: SummarySplit[] }) {
  return (
    <DynamicTableSection<SummarySplit>
      variant="embedded"
      headers={SPLIT_HEADERS}
      data={rows}
      getRowKey={(r) => r.key}
      showRowAction={false}
      emptyMessage="No revenue in these dates."
      toolbar={{ title, showFilter: false }}
      renderItems={(r) => {
        const d = delta(r.amount_kobo, r.previous_amount_kobo)
        return [
          <span key="what" className="font-semibold text-[var(--tx)]">
            {words(r.key)}
          </span>,
          <span key="amount">{naira(r.amount_kobo)}</span>,
          <span
            key="change"
            className={d.tone === 'success' ? 'text-[#1E7A45]' : d.tone === 'warning' ? 'text-[#B3261E]' : 'text-[var(--mu)]'}
          >
            {d.text}
          </span>,
          <span key="payments">{count(r.payments)}</span>,
        ]
      }}
    />
  )
}

/**
 * The whole business for the picked dates, read from nightly-style daily
 * totals (refreshed every few minutes), never from raw payments.
 */
export function ReportsSummaryTab() {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const seesAll = can('analytics:revenue')
  const canExportPayments = can('finance:read')
  const [range, setRange] = useState(defaultRange)
  const [hub, setHub] = useState<string | null>(null)
  const [coop, setCoop] = useState<string | null>(null)
  const [hubPage, setHubPage] = useState(1)
  const [coopPage, setCoopPage] = useState(1)
  const filters: SummaryFilters = { ...range, hub, cooperative: coop }

  const summary = useReportsSummary(filters)
  const hubs = useSummaryHubs(filters, hubPage)
  const coops = useSummaryCooperatives(filters, coopPage)
  const hubOptions = useHubs({ page_size: 100 }, { enabled: seesAll })
  const coopOptions = useCooperatives({ enabled: seesAll })

  const data = summary.data
  const t = data?.totals
  const p = data?.previous
  const before = data ? rangeLabel(data.previous_range) : ''
  // Eight cards: money, volume, reach, health. Ops counts (expired
  // bookings, overrides) live per hub in the hubs table below.
  const card = (
    title: string,
    value: ReactNode,
    now: number | null | undefined,
    was: number | null | undefined,
    note?: string,
    lowerIsBetter = false,
  ): AdminKpiCardProps => {
    const d = delta(now, was, '', lowerIsBetter)
    return { title, value, sub: [d.text, note].filter(Boolean).join(' · '), tone: d.tone }
  }
  const money = (kobo: number) => <span title={naira(kobo)}>{nairaShort(kobo)}</span>
  const u = data?.utilisation
  // Small test fleets give rates under 1; two decimals keep them from reading as 0.
  const rate = (n: number | null | undefined) => (n == null ? '—' : n.toFixed(n < 1 ? 2 : n < 10 ? 1 : 0))
  const kpis: AdminKpiCardProps[] =
    t && p
      ? [
          card('Revenue', money(t.revenue_kobo), t.revenue_kobo, p.revenue_kobo),
          card('Net after VAT', money(t.net_kobo), t.net_kobo, p.net_kobo),
          card('Money received', money(t.received_kobo), t.received_kobo, p.received_kobo,
            `${nairaShort(t.topup_kobo)} wallet top-ups`),
          card('Payments pending', money(t.pending_kobo), t.pending_kobo, p.pending_kobo,
            t.success_rate_pct == null ? undefined : `${t.success_rate_pct.toFixed(1)}% succeed`, true),
          card('Swaps', count(t.swaps), t.swaps, p.swaps),
          card('Riders who swapped', count(t.riders), t.riders, p.riders,
            `${count(t.new_riders)} new`),
          card('Vehicles that swapped', count(t.vehicles), t.vehicles, p.vehicles),
          {
            title: 'Swaps per pack per day',
            value: rate(u?.swaps_per_pack_day),
            sub: u ? `${rate(u.swaps_per_hub_day)} per hub · ${count(u.packs_in_service)} packs` : '',
          },
        ]
      : []

  const chart = (data?.daily ?? []).map((d) => ({
    label: dayjs(d.day).format('D MMM'),
    money: Math.round(d.revenue_kobo / 100),
    swaps: d.swaps,
  }))
  const credit = data?.credit
  const late = credit
    ? [
        { label: '1–7 days late', kobo: credit.late_1_7_kobo },
        { label: '8–30 days late', kobo: credit.late_8_30_kobo },
        { label: '31–90 days late', kobo: credit.late_31_90_kobo },
        { label: 'Over 90 days late', kobo: credit.late_90_plus_kobo },
      ]
    : []
  const lateMax = Math.max(1, ...late.map((l) => l.kobo))

  const exportPayments = (cooperative?: string | null) => {
    const q = new URLSearchParams({ start_date: range.start_date, end_date: range.end_date })
    if (cooperative) q.set('cooperative', cooperative)
    if (hub) q.set('hub', hub)
    navigate(`/reports/payments/build?${q}`)
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-5 shadow-[var(--sh)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[17px] font-bold text-[var(--tx)]">Overview</div>
            <div className="mt-0.5 text-[12.5px] text-[var(--mu)]">
              {data
                ? `Compared with ${before}.${data.as_of ? ` Totals as of ${dayjs(data.as_of).format('D MMM, HH:mm')}.` : ' Totals are still being built.'}`
                : ' '}
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
            {seesAll ? (
              <>
                <Select
                  aria-label="Hub"
                  placeholder="All hubs"
                  clearable
                  searchable
                  w={{ base: '100%', sm: 180 }}
                  data={hubOptions.hubs.map((h) => ({ value: h.id, label: h.name }))}
                  value={hub}
                  onChange={(v) => {
                    setHub(v)
                    setHubPage(1)
                    setCoopPage(1)
                  }}
                />
                <Select
                  aria-label="Chairman group"
                  placeholder="All chairmen"
                  clearable
                  searchable
                  w={{ base: '100%', sm: 200 }}
                  data={coopOptions.options}
                  value={coop}
                  onChange={(v) => {
                    setCoop(v)
                    setHubPage(1)
                    setCoopPage(1)
                  }}
                />
              </>
            ) : null}
            <DateRangePicker
              className="w-full sm:w-auto"
              fullWidth
              date={range}
              maxDate={new Date()}
              onChange={(v) => {
                if (!v.start_date || !v.end_date) return
                setRange(v)
                setHubPage(1)
                setCoopPage(1)
              }}
            />
          </div>
        </div>
        {summary.isError ? (
          <Alert color="red" title="Summary unavailable">
            The summary could not be loaded. Try a shorter range.
          </Alert>
        ) : summary.isPending ? (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} height={92} radius="md" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            {kpis.map((k) => (
              <AdminKpiCard key={k.title} {...k} />
            ))}
          </div>
        )}
      </section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <section className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
          <h3 className="mb-2 text-sm font-bold text-[var(--tx)]">Revenue per day</h3>
          <AdminBarChart
            data={chart}
            series={[{ dataKey: 'money', name: 'Revenue (₦)', color: ADMIN_CHART_COLORS.teal }]}
            valueFormatter={(v) => `₦${shortNumber(v)}`}
            yAxisWidth={66}
            height={230}
          />
        </section>
        <section className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
          <h3 className="mb-2 text-sm font-bold text-[var(--tx)]">Swaps per day</h3>
          <AdminBarChart
            data={chart}
            series={[{ dataKey: 'swaps', name: 'Swaps', color: ADMIN_CHART_COLORS.navy }]}
            valueFormatter={shortNumber}
            yAxisWidth={48}
            height={230}
          />
        </section>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <div className="min-w-0 overflow-hidden rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] shadow-[var(--sh)]">
          <SplitTable title="Revenue by what was paid for" rows={data?.purposes ?? []} />
        </div>
        <div className="min-w-0 overflow-hidden rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] shadow-[var(--sh)]">
          <SplitTable title="Revenue by how people paid" rows={data?.channels ?? []} />
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] shadow-[var(--sh)]">
        <DynamicTableSection<SummaryCoopRow>
          variant="embedded"
          headers={COOP_HEADERS}
          data={coops.data?.results ?? []}
          loading={coops.isPending}
          getRowKey={(r) => r.cooperative_id ?? 'none'}
          emptyMessage="No vehicles or activity in these dates."
          toolbar={{
            title: 'Chairmen and their vehicles',
            showFilter: false,
          }}
          showRowAction={canExportPayments}
          rowActionLabel="Export payments"
          onRowClick={canExportPayments ? (r) => exportPayments(r.cooperative_id) : undefined}
          pagination={{
            page: coopPage,
            totalPages: coops.data?.total_pages ?? 1,
            onPageChange: setCoopPage,
          }}
          renderItems={(r) => [
            <div key="group">
              <div className="font-semibold text-[var(--tx)]">{r.name}</div>
              {r.chairman ? <div className="text-[12px] text-[var(--mu)]">{r.chairman}</div> : null}
            </div>,
            <span key="money" className="font-semibold">
              {naira(r.revenue_kobo)}
            </span>,
            <span key="perVehicle">
              {r.vehicles > 0 && u?.days ? naira(Math.round(r.revenue_kobo / r.vehicles / u.days)) : '—'}
            </span>,
            <span key="vehicles">{count(r.vehicles)}</span>,
            <span key="swaps">{count(r.swaps)}</span>,
            <span key="packs">{count(r.packs_out)}</span>,
          ]}
        />
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 overflow-hidden rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] shadow-[var(--sh)]">
          <DynamicTableSection<SummaryHubRow>
            variant="embedded"
            headers={HUB_HEADERS}
            data={hubs.data?.results ?? []}
            loading={hubs.isPending}
            getRowKey={(r) => r.hub_id}
            showRowAction={false}
            emptyMessage="No hub activity in these dates."
            toolbar={{ title: 'Hubs, highest revenue first', showFilter: false }}
            pagination={{
              page: hubPage,
              totalPages: hubs.data?.total_pages ?? 1,
              onPageChange: setHubPage,
            }}
            renderItems={(r) => [
              <div key="hub">
                <div className="font-semibold text-[var(--tx)]">{r.name}</div>
                <div className="text-[12px] text-[var(--mu)]">{r.code}</div>
              </div>,
              <span key="money">{naira(r.revenue_kobo)}</span>,
              <span key="swaps">{count(r.swaps)}</span>,
              <span key="expired">{count(r.expired_reservations)}</span>,
              <span key="overrides">{count(r.overrides)}</span>,
            ]}
          />
        </div>
        <section className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
          <h3 className="text-sm font-bold text-[var(--tx)]">Credit right now</h3>
          <p className="mt-0.5 text-[12px] text-[var(--mu)]">Open loans today, whatever dates are picked.</p>
          {credit ? (
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex justify-between text-[13px]">
                <span>Owed on {count(credit.loans)} open loans</span>
                <b>{naira(credit.outstanding_kobo)}</b>
              </div>
              <div className="flex justify-between text-[13px]">
                <span>Loans past due</span>
                <b>{count(credit.past_due_loans)}</b>
              </div>
              {late.map((l) => (
                <div key={l.label} className="flex flex-col gap-1">
                  <div className="flex justify-between text-[12px]">
                    <span>{l.label}</span>
                    <span className="font-semibold">{naira(l.kobo)}</span>
                  </div>
                  <div className="h-2 rounded bg-[var(--tn)]">
                    <div
                      className="h-2 rounded bg-[#E07B39]"
                      style={{ width: `${(l.kobo / lateMax) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Skeleton mt="md" height={140} />
          )}
        </section>
      </div>
    </div>
  )
}
