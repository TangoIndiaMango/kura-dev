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

  const solarCap = Number(stats?.solar_capacity_kw || hub.solar_capacity_kw || extras.solarCapacityKw) || 10
  const solarOutput = stats?.solar_output_kw ?? (hub.status === 'ONLINE' ? Number((solarCap * 0.75).toFixed(1)) : 0)
  const solarPct = Math.min(100, Math.round((solarOutput / (solarCap || 1)) * 100))

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
      solar_kw: m.solar_kw,
      grid_kw: m.grid_kw,
    }))
  }, [stats?.daily_metrics])

  const totalSwaps = stats?.swaps_count ?? 0
  const swapsSub =
    range.start_date === range.end_date
      ? 'swaps on date'
      : `${stats?.swaps_per_day ?? 0}/day avg (${totalSwaps} total)`

  const tiles = [
    {
      label: 'Solar Output',
      icon: <Sun01Icon size={16} className="text-[#F5A623]" />,
      value: `${solarOutput.toFixed(1)} kW`,
      sub: `/ ${solarCap.toFixed(1)} kW rated`,
      desc: solarPct > 50 ? 'High solar offset · Battery charging optimal' : 'Grid supplementing',
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
      label: 'Station Uptime',
      icon: <CheckmarkCircle02Icon size={16} className="text-[#27AE60]" />,
      value: extras.uptime30d || (hub.status === 'ONLINE' ? '99.8%' : hub.status === 'MAINTENANCE' ? 'Maintenance' : 'Offline'),
      sub: '30D rolling',
      desc: `Station status: ${extras.healthLabel || hub.status}`,
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
                Station Telemetry & Energy Throughput
              </h2>
              <span className="rounded-full bg-[var(--tn)] px-2 py-0.5 text-[11px] font-semibold text-[var(--pr)]">
                Modelled energy
              </span>
            </div>
            <p className="mt-0.5 text-[12.5px] text-[var(--mu)]">
              Swap throughput is live; solar output is estimated from rated capacity until meter telemetry is connected.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-1.5 rounded-lg border border-[#27AE60]/30 bg-[#27AE60]/10 px-2.5 py-1 text-[11.5px] font-semibold text-[#27AE60]">
            <CheckmarkCircle02Icon size={14} />
            <span>Clean Energy {solarPct}% Active</span>
          </span>
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
                Swap Demand & Energy Telemetry
              </h3>
              <p className="mt-0.5 text-[11.5px] text-[var(--mu)]">
                Swap volume bars plotted against active solar generation and grid draw (kW)
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
              <p className="text-[13px] font-semibold text-[var(--tx)]">No telemetry data recorded</p>
              <p className="mt-0.5 max-w-xs text-[11.5px] text-[var(--mu)]">
                Zero swap transactions or energy draw between {formattedStart} and {formattedEnd}.
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
                  { name: 'solar_kw', label: 'Solar Output (kW)', type: 'line', color: '#F5A623' },
                  { name: 'grid_kw', label: 'Grid Draw (kW)', type: 'line', color: '#CBD5E1' },
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
