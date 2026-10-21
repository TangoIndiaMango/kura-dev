import { useState, useMemo } from 'react'
import dayjs from 'dayjs'
import { CompositeChart, DonutChart } from '@mantine/charts'
import { Skeleton } from '@mantine/core'
import {
  ArrowDataTransferHorizontalIcon,
  BatteryCharging02Icon,
  CheckmarkCircle02Icon,
  EnergyIcon,
  Sun01Icon,
} from 'hugeicons-react'
import { DateRangePicker } from '@shared/components/date-range/DateRangePicker'
import { useHubDetailStats } from '../hooks/use-hubs'
import type { HubDetailApi, HubSlotApi } from '../types'
import type { HubStationExtras } from '../hubDetailHelpers'

interface HubEnergyThroughputCockpitProps {
  hub: HubDetailApi
  slots?: HubSlotApi[]
  extras: HubStationExtras
}

export function HubEnergyThroughputCockpit({
  hub,
  slots: _slots,
  extras,
}: HubEnergyThroughputCockpitProps) {
  const [range, setRange] = useState(() => ({
    start_date: dayjs().subtract(13, 'day').format('YYYY-MM-DD'),
    end_date: dayjs().format('YYYY-MM-DD'),
  }))

  const { data: stats, isLoading: statsLoading } = useHubDetailStats(hub.id, range)

  const solarCap = Number(stats?.solar_capacity_kw || hub.solar_capacity_kw || extras.solarCapacityKw) || 0
  // Live output needs inverter telemetry; never estimate it from capacity.
  const solarOutput = stats?.solar_output_kw ?? null

  const ready = stats?.ready_count ?? hub.ready_count
  const charging = stats?.charging_count ?? hub.charging_count
  const empty = stats?.empty_count ?? hub.empty_count
  const fault = stats?.fault_count ?? hub.fault_count
  const totalSlots = stats?.total_slots || hub.slot_count || ready + charging + empty + fault || 24
  const occupiedPct = Math.min(100, Math.round(((ready + charging) / (totalSlots || 1)) * 100))

  const bayDistribution = [
    { name: 'Ready', value: ready, color: '#0D7C8F' },
    { name: 'Charging', value: charging, color: '#4FC3F7' },
    { name: 'Empty', value: empty, color: '#CBD5E1' },
    ...(fault > 0 ? [{ name: 'Fault', value: fault, color: '#F5A623' }] : []),
  ]

  const formattedStart = dayjs(range.start_date).format('D MMM YYYY')
  const formattedEnd = dayjs(range.end_date).format('D MMM YYYY')

  const chartData = useMemo(() => {
    if (!stats?.daily_metrics || stats.daily_metrics.length === 0) return []
    return stats.daily_metrics.map((m) => ({
      label: m.label,
      swaps: m.swaps,
      energy_kwh: m.energy_kwh,
    }))
  }, [stats?.daily_metrics])

  const totalSwaps = stats?.swaps_count ?? 0
  const swapsSub =
    range.start_date === range.end_date
      ? 'swaps on date'
      : `${stats?.swaps_per_day ?? 0}/day avg (${totalSwaps} total)`

  const tiles = [
    {
      label: 'Solar',
      icon: <Sun01Icon size={16} className="text-[#F5A623]" />,
      value: solarOutput != null ? `${solarOutput.toFixed(1)} kW` : solarCap ? `${solarCap.toFixed(1)} kW` : '—',
      sub: solarOutput != null ? `/ ${solarCap.toFixed(1)} kW rated` : solarCap ? 'rated capacity' : 'not configured',
      desc: 'Live output appears once the hub inverter reports',
    },
    {
      label: 'Swap Fulfillment',
      icon: <ArrowDataTransferHorizontalIcon size={16} className="text-[var(--pr)]" />,
      value: `${totalSwaps}`,
      sub: swapsSub,
      desc: stats?.energy_kwh_total ? `${stats.energy_kwh_total.toFixed(1)} kWh delivered` : totalSwaps === 0 ? 'No swaps in period' : 'Energy telemetry synced',
    },
    {
      label: 'Bay Capacity',
      icon: <BatteryCharging02Icon size={16} className="text-[#0D7C8F]" />,
      value: `${ready + charging} / ${totalSlots}`,
      sub: `(${occupiedPct}% occupied)`,
      desc: `${ready} ready packs · ${charging} charging`,
    },
    {
      label: 'Energy Delivered',
      icon: <EnergyIcon size={16} className="text-[#27AE60]" />,
      value: `${(stats?.energy_kwh_total ?? 0).toFixed(1)} kWh`,
      sub: range.start_date === range.end_date ? 'on date' : 'in selected period',
      desc:
        totalSwaps > 0
          ? `${totalSwaps} completed swaps · station throughput`
          : 'No completed swaps in period',
    },
    {
      label: 'Station status',
      icon: <CheckmarkCircle02Icon size={16} className="text-[#27AE60]" />,
      value: extras.healthLabel,
      sub: extras.lastSyncAt ? `synced ${dayjs(extras.lastSyncAt).format('D MMM, HH:mm')}` : 'never synced',
      desc: 'Uptime history needs hub heartbeats',
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Cockpit Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)] sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--prs)] text-[var(--pr)]">
            <EnergyIcon size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-[var(--tx)]">
                Swaps and energy delivered
              </h2>
            </div>
            <p className="mt-0.5 text-[12.5px] text-[var(--mu)]">
              From completed swaps at this hub. Solar output and grid draw appear once the hub meter reports.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative z-30">
            <DateRangePicker
              date={range}
              onChange={(val) => {
                if (val?.start_date && val?.end_date) {
                  setRange({ start_date: val.start_date, end_date: val.end_date })
                }
              }}
              maxDate={new Date()}
              className="scale-95 origin-right"
            />
          </div>
        </div>
      </div>

      {/* 5 Metric Tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
            <div className="flex items-center justify-between text-[var(--mu)]">
              <span className="text-[11.5px] font-semibold uppercase tracking-wider">{t.label}</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--in)]">{t.icon}</div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-[22px] font-extrabold tracking-tight text-[var(--tx)]">{t.value}</span>
              <span className="text-[12px] font-medium text-[var(--mu)]">{t.sub}</span>
            </div>
            <p className="mt-1 text-[11.5px] text-[var(--mu)]">{t.desc}</p>
          </div>
        ))}
      </div>

      {/* Visualizations Grid: Daily Energy & Swaps + Bay Distribution */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Swap Cadence & Energy (8 cols) */}
        <div className="flex flex-col justify-between rounded-[14px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)] sm:p-5 lg:col-span-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-[13.5px] font-bold text-[var(--tx)]">
                Daily swaps and energy
              </h3>
              <p className="mt-0.5 text-[11.5px] text-[var(--mu)]">
                Completed swaps per day, with energy handed to riders (kWh)
              </p>
            </div>
            <span className="rounded-[6px] bg-[var(--in)] px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-[var(--mu)]">
              {formattedStart} – {formattedEnd}
            </span>
          </div>

          {statsLoading ? (
            <div className="mt-2 flex min-h-[220px] items-center justify-center">
              <Skeleton height={220} width="100%" radius="md" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="mt-2 flex min-h-[220px] flex-col items-center justify-center rounded-[10px] border border-dashed border-[var(--bd)] bg-[var(--in)]/40 p-6 text-center">
              <EnergyIcon size={28} className="mb-1.5 text-[var(--mu)]" />
              <p className="text-[13px] font-semibold text-[var(--tx)]">No swaps in this period</p>
              <p className="mt-0.5 max-w-xs text-[11.5px] text-[var(--mu)]">
                Nothing was swapped at this hub between {formattedStart} and {formattedEnd}.
              </p>
            </div>
          ) : (
            <div className="mt-2 min-h-[220px]">
              <CompositeChart
                h={220}
                data={chartData}
                dataKey="label"
                series={[
                  { name: 'swaps', label: 'Swaps fulfilled', type: 'bar', color: '#0D7C8F' },
                  { name: 'energy_kwh', label: 'Energy delivered (kWh)', type: 'line', color: '#F5A623' },
                ]}
                curveType="natural"
                tickLine="none"
                gridAxis="y"
                withLegend
                withTooltip
                valueFormatter={(value) => `${value}`}
              />
            </div>
          )}
        </div>

        {/* Bay Allocation Donut (4 cols) */}
        <div className="flex flex-col justify-between rounded-[14px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)] sm:p-5 lg:col-span-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-[13.5px] font-bold text-[var(--tx)]">
                Live Bay Allocation
              </h3>
              <span className="rounded-[6px] bg-[var(--in)] px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-[var(--mu)]">
                {totalSlots} SLOTS
              </span>
            </div>
            <p className="mt-0.5 text-[11.5px] text-[var(--mu)]">
              Current docking state across all station bays
            </p>
          </div>

          <div className="my-2 flex flex-1 flex-col items-center justify-center">
            <div className="relative">
              <DonutChart
                data={bayDistribution}
                size={135}
                thickness={15}
                paddingAngle={3}
                withTooltip
              />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[18px] font-extrabold leading-none text-[var(--tx)]">
                  {ready}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--mu)]">
                  Ready
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-[var(--bd)] pt-2.5">
            {bayDistribution.map((b) => (
              <div key={b.name} className="flex items-center gap-1.5 text-[11px]">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
                <span className="text-[var(--mu)]">{b.name}:</span>
                <span className="font-bold text-[var(--tx)]">{b.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
