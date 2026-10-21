import {
  HealthIcon,
  CheckmarkCircle02Icon,
} from 'hugeicons-react'
import { AdminBarChart, ADMIN_CHART_COLORS } from '@shared/components/charts'
import type { BatteryHealthAnalytics } from './batteryHealthMap'

function gradeForSoh(soh: number) {
  if (soh < 60) {
    return {
      grade: 'Second-life storage',
      color: '#E74C3C',
      desc: 'Below mobility threshold. Prefer hub buffer / storage duty.',
    }
  }
  if (soh < 75) {
    return {
      grade: 'Grade C · watchlist',
      color: '#F5A623',
      desc: 'Cell wear rising. Prefer lighter urban routes.',
    }
  }
  if (soh < 90) {
    return {
      grade: 'Grade B · standard',
      color: '#4FC3F7',
      desc: 'Standard capacity for daily commercial routes.',
    }
  }
  return {
    grade: 'Grade A · primary',
    color: '#27AE60',
    desc: 'Unrestricted deployment across motorcycle, keke, and boat.',
  }
}

/** Pack health + 20S cell balance — real BMS cells when telemetry provides them, else modelled. */
export function BatteryCellAnalyticsCard({
  analytics,
}: {
  analytics: BatteryHealthAnalytics
}) {
  const soh = analytics.healthPct
  const cycles = analytics.cycles
  const maxRatedCycles = analytics.maxRatedCycles
  const cyclePct = Math.min(100, Math.round((cycles / maxRatedCycles) * 100))
  const { grade, color: gradeColor, desc: gradeDesc } = gradeForSoh(soh)

  const minMv = Math.min(...analytics.cells.map((c) => c.mv))
  const maxMv = Math.max(...analytics.cells.map((c) => c.mv))
  const deltaMv = maxMv - minMv
  const isDeltaHealthy = deltaMv <= 25
  const monthsRem = Math.max(
    1,
    Math.round(((100 - cyclePct) / 100) * 24),
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--bd)] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--pr)]/10 text-[var(--pr)]">
              <HealthIcon size={18} />
            </div>
            <div>
              <h3 className="text-[13.5px] font-bold text-[var(--tx)]">
                Pack health tier
              </h3>
              <p className="text-[11.5px] text-[var(--mu)]">
                {analytics.cellsSource === 'telemetry'
                  ? 'From live SOH, cycles, and BMS cell balance'
                  : 'Live SOH and cycles · cell balance modelled (no BMS feed yet)'}
              </p>
            </div>
          </div>
          <span
            className="rounded px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: `${gradeColor}20`, color: gradeColor }}
          >
            {grade}
          </span>
        </div>

        <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-0.5 rounded-lg border border-[var(--bd)]/60 bg-[var(--bg)] p-2.5">
            <span className="text-[11px] text-[var(--mu)]">State of health</span>
            <span className="text-[15px] font-extrabold text-[var(--tx)]">
              {soh}%{' '}
              <span className="text-[11px] font-normal text-[var(--mu)]">
                / 100%
              </span>
            </span>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--mu)]">
              {gradeDesc}
            </p>
          </div>

          <div className="flex flex-col gap-1 rounded-lg border border-[var(--bd)]/60 bg-[var(--bg)] p-2.5">
            <div className="flex items-center justify-between text-[11px] text-[var(--mu)]">
              <span>Lifetime cycles</span>
              <span className="font-semibold text-[var(--tx)]">
                {cycles} / {maxRatedCycles}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--tn)]">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${cyclePct}%`, backgroundColor: gradeColor }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[var(--mu)]">
              <span>{cyclePct}% cycle wear</span>
              <span className="font-medium text-[#27AE60]">
                ~{monthsRem} mos rem.
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-0.5 rounded-lg border border-[var(--bd)]/60 bg-[var(--bg)] p-2.5">
            <div className="flex items-center justify-between text-[11px] text-[var(--mu)]">
              <span>Cell variance (max ΔV)</span>
              <span
                className={`text-[10.5px] font-bold uppercase ${
                  isDeltaHealthy ? 'text-[#27AE60]' : 'text-[#F5A623]'
                }`}
              >
                {isDeltaHealthy ? 'Balanced' : 'Drifting'}
              </span>
            </div>
            <span className="text-[15px] font-extrabold text-[var(--tx)]">
              {deltaMv}{' '}
              <span className="text-[11px] font-normal text-[var(--mu)]">mV</span>
            </span>
            <div className="flex items-center gap-1 text-[11px] text-[var(--mu)]">
              <CheckmarkCircle02Icon size={12} className="text-[#27AE60]" />
              <span>
                Internal res:{' '}
                <strong className="text-[var(--tx)]">
                  {analytics.internalResistanceMohm} mΩ
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-[13.5px] font-bold text-[var(--tx)]">
              Cell module voltage ({analytics.cells.length}S)
            </h3>
            <p className="text-[11.5px] text-[var(--mu)]">
              Millivolt balance across series modules
            </p>
          </div>
        </div>
        <AdminBarChart
          data={analytics.cells}
          series={[
            {
              dataKey: 'mv',
              name: 'Voltage (mV)',
              color: ADMIN_CHART_COLORS.teal,
            },
          ]}
          height={190}
        />
      </div>
    </div>
  )
}
