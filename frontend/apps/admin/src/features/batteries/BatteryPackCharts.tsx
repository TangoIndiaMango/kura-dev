import type { ReactNode } from 'react'
import { AdminLineChart } from '@shared/components'
import { SOH_CHART_COLOR } from './batteryDetailHelpers'

export function BatteryPackCharts({
  sohTrend,
  dateRangeSlot,
}: {
  sohTrend: { label: string; soh: number }[]
  dateRangeSlot?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4">
      {dateRangeSlot ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12.5px] text-[var(--mu)]">
            State of health trend respects the selected range
          </p>
          {dateRangeSlot}
        </div>
      ) : null}
      <div>
        <p className="mb-2 text-[12px] font-semibold text-[var(--mu)]">State of health</p>
        <AdminLineChart
          data={sohTrend}
          series={[{ dataKey: 'soh', name: 'SOH %', color: SOH_CHART_COLOR }]}
          height={220}
        />
      </div>
    </div>
  )
}
