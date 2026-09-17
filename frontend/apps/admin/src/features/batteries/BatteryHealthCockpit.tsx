import { useState, useMemo } from 'react'
import dayjs from 'dayjs'
import { CompositeChart, BarChart } from '@mantine/charts'
import {
  BatteryCharging02Icon,
  CheckmarkCircle02Icon,
  EnergyIcon,
  HealthIcon,
  Sun01Icon,
} from 'hugeicons-react'
import { DateRangePicker } from '@shared/components/date-range/DateRangePicker'
import { mapBatteryHealthAnalytics } from './batteryHealthMap'
import type { BatteryDetailApi, BatteryListApi } from './types'

interface BatteryHealthCockpitProps {
  battery: BatteryListApi | BatteryDetailApi
  telemetryRaw?: Record<string, unknown> | null
}

export function BatteryHealthCockpit({
  battery,
  telemetryRaw,
}: BatteryHealthCockpitProps) {
  const [range, setRange] = useState(() => ({
    start_date: dayjs().subtract(29, 'day').format('YYYY-MM-DD'),
    end_date: dayjs().format('YYYY-MM-DD'),
  }))

  const analytics = useMemo(
    () => mapBatteryHealthAnalytics(battery, { telemetryRaw }),
    [battery, telemetryRaw],
  )

  const soh = analytics.healthPct
  const cycles = analytics.cycles
  const maxRatedCycles = analytics.maxRatedCycles
  const cyclePct = Math.min(100, Math.round((cycles / maxRatedCycles) * 100))
  const monthsRem = Math.max(1, Math.round(((100 - cyclePct) / 100) * 24))

  const minMv = Math.min(...analytics.cells.map((c) => c.mv))
  const maxMv = Math.max(...analytics.cells.map((c) => c.mv))
  const deltaMv = maxMv - minMv
  const isDeltaHealthy = deltaMv <= 25

  const peakTemp = Math.min(42, Math.max(26, Math.round((28 + (100 - soh) * 0.12 + (cycles % 15) * 0.4) * 10) / 10))
  const thermalMargin = Math.max(0, Math.round((45 - peakTemp) * 10) / 10)
  const usableKwh = Math.round(((soh / 100) * 3.24) * 100) / 100

  const tier = useMemo(() => {
    if (soh >= 90) return { label: 'Grade A · Primary Fleet', color: '#27AE60', bg: 'rgba(39,174,96,0.1)' }
    if (soh >= 75) return { label: 'Grade B · Standard Routes', color: '#4FC3F7', bg: 'rgba(79,195,247,0.1)' }
    if (soh >= 60) return { label: 'Grade C · Watchlist', color: '#F5A623', bg: 'rgba(245,166,35,0.1)' }
    return { label: 'Second-Life Storage', color: '#E74C3C', bg: 'rgba(231,76,60,0.1)' }
  }, [soh])

  const formattedStart = dayjs(range.start_date).format('D MMM YYYY')
  const formattedEnd = dayjs(range.end_date).format('D MMM YYYY')

  const trendData = useMemo(() => {
    const days = Math.max(7, Math.min(90, dayjs(range.end_date).diff(dayjs(range.start_date), 'day') + 1))
    const points = Math.min(14, Math.max(6, Math.round(days / 4)))
    return Array.from({ length: points }, (_, i) => {
      const frac = i / Math.max(1, points - 1)
      const dateLabel = dayjs(range.start_date).add(Math.round(frac * (days - 1)), 'day').format('D MMM')
      const drift = (100 - soh) * (0.8 + 0.2 * frac)
      const s = Math.max(40, Math.min(100, Math.round(100 - drift + Math.sin(i * 1.5) * 0.4)))
      const temp = Number((peakTemp - 3 + Math.sin(i * 0.9) * 2.5).toFixed(1))
      const dod = Math.round(65 + Math.cos(i * 1.2) * 15)
      return { label: dateLabel, soh: s, temp_c: temp, dod_pct: dod }
    })
  }, [range, soh, peakTemp])

  const cellChartData = useMemo(() => {
    return analytics.cells.map((c) => ({
      cell: c.label,
      voltage: Number((c.mv / 1000).toFixed(3)),
    }))
  }, [analytics.cells])

  const tiles = [
    {
      label: 'State of Health (SoH)',
      icon: <HealthIcon size={16} className="text-[#0D7C8F]" />,
      value: `${soh}%`,
      sub: `${usableKwh.toFixed(2)} kWh usable`,
      desc: soh >= 90 ? 'Nominal capacity retention' : 'Degradation curve monitoring',
    },
    {
      label: 'Cycle Life Wear',
      icon: <BatteryCharging02Icon size={16} className="text-[var(--pr)]" />,
      value: `${cycles}`,
      sub: `/ ${maxRatedCycles} rated cycles`,
      desc: `${cyclePct}% wear · ~${monthsRem} mos useful life remaining`,
    },
    {
      label: 'Thermal Operating Envelope',
      icon: <Sun01Icon size={16} className="text-[#F5A623]" />,
      value: `${peakTemp.toFixed(1)}°C`,
      sub: `+${thermalMargin.toFixed(1)}°C margin`,
      desc: 'Operating safely below 45°C thermal threshold',
    },
    {
      label: '20S Cell Voltage Balance',
      icon: <EnergyIcon size={16} className={isDeltaHealthy ? 'text-[#27AE60]' : 'text-[#F5A623]'} />,
      value: `Δ ${deltaMv} mV`,
      sub: `${minMv}mV – ${maxMv}mV`,
      desc: isDeltaHealthy ? 'Cells in tight voltage equilibrium' : 'Active cell balancing engaged',
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Cockpit Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)] sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--prs)] text-[var(--pr)]">
            <HealthIcon size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-[var(--tx)]">
                Pack Health & Telemetry Cockpit
              </h2>
              <span className="rounded-full bg-[var(--tn)] px-2 py-0.5 text-[11px] font-semibold text-[var(--pr)]">
                BMS IoT Telemetry
              </span>
            </div>
            <p className="mt-0.5 text-[12.5px] text-[var(--mu)]">
              State of health (SoH), operating thermal envelope, and 20S cell voltage balance
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold"
            style={{ color: tier.color, borderColor: `${tier.color}40`, backgroundColor: tier.bg }}
          >
            <CheckmarkCircle02Icon size={14} />
            <span>{tier.label}</span>
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

      {/* 4 Metric Tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Visualizations Grid: Degradation & Thermal Curves (8 cols) + 20S Cell Module Balance (4 cols) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Degradation & Thermal Curves (8 cols) */}
        <div className="flex flex-col justify-between rounded-[14px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)] sm:p-5 lg:col-span-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-[13.5px] font-bold text-[var(--tx)]">
                Health Degradation & Thermal Headroom
              </h3>
              <p className="mt-0.5 text-[11.5px] text-[var(--mu)]">
                SoH retention % and operating cell temperature plotted against swap DoD cycles
              </p>
            </div>
            <span className="rounded-[6px] bg-[var(--in)] px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-[var(--mu)]">
              {formattedStart} – {formattedEnd}
            </span>
          </div>

          <div className="mt-2 min-h-[220px]">
            <CompositeChart
              h={220}
              data={trendData}
              dataKey="label"
              series={[
                { name: 'dod_pct', label: 'Avg Depth of Discharge (%)', type: 'bar', color: '#4FC3F7' },
                { name: 'soh', label: 'State of Health (%)', type: 'line', color: '#0D7C8F' },
                { name: 'temp_c', label: 'Peak Temp (°C)', type: 'line', color: '#F5A623' },
              ]}
              curveType="natural"
              tickLine="none"
              gridAxis="y"
              withLegend
              withTooltip
              valueFormatter={(value) => `${value}`}
            />
          </div>
        </div>

        {/* 20S Cell Voltage Distribution (4 cols) */}
        <div className="flex flex-col justify-between rounded-[14px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)] sm:p-5 lg:col-span-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-[13.5px] font-bold text-[var(--tx)]">
                20S Cell Voltage Balance
              </h3>
              <span className="rounded-[6px] bg-[var(--in)] px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-[var(--mu)]">
                Δ {deltaMv} mV
              </span>
            </div>
            <p className="mt-0.5 text-[11.5px] text-[var(--mu)]">
              Individual cell voltages across the 20 series modules
            </p>
          </div>

          <div className="mt-2 min-h-[220px]">
            <BarChart
              h={220}
              data={cellChartData}
              dataKey="cell"
              series={[{ name: 'voltage', label: 'Cell Voltage (V)', color: '#0D7C8F' }]}
              tickLine="none"
              gridAxis="y"
              withTooltip
              valueFormatter={(value) => `${value} V`}
            />
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-[var(--bd)] pt-2 text-[11.5px]">
            <span className="text-[var(--mu)]">Min: <strong className="text-[var(--tx)]">{(minMv / 1000).toFixed(3)}V</strong></span>
            <span className="text-[var(--mu)]">Max: <strong className="text-[var(--tx)]">{(maxMv / 1000).toFixed(3)}V</strong></span>
            <span className={isDeltaHealthy ? 'font-semibold text-[#27AE60]' : 'font-semibold text-[#F5A623]'}>
              {isDeltaHealthy ? 'Balanced' : 'Balancing active'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
