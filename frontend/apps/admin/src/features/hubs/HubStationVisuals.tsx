import type { ReactNode } from 'react'
import {
  AdminBarChart,
  AdminDonutChart,
  AdminLineChart,
  ADMIN_CHART_COLORS,
} from '@shared/components'

export function HubStationCharts({
  bayMix,
  inventoryByType,
  swapTrend,
  slots,
  dateRangeSlot,
}: {
  bayMix: { name: string; value: number; color: string }[]
  inventoryByType: { label: string; ready: number; charging: number; empty: number }[]
  swapTrend: { label: string; swaps: number; forecast: number }[]
  slots: number
  dateRangeSlot?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-5">
      {dateRangeSlot ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12.5px] text-[var(--mu)]">
            Throughput charts respect the selected range
          </p>
          {dateRangeSlot}
        </div>
      ) : null}

      {/* Pie + swaps share a row — same visual weight, neither needs full width */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-[12px] font-semibold text-[var(--mu)]">Current bay mix</p>
          <AdminDonutChart data={bayMix} height={220} centerValue={slots} />
        </div>
        <div>
          <p className="mb-2 text-[12px] font-semibold text-[var(--mu)]">
            Swaps vs forecast
          </p>
          <AdminLineChart
            data={swapTrend}
            series={[
              { dataKey: 'swaps', name: 'Actual', color: ADMIN_CHART_COLORS.teal },
              {
                dataKey: 'forecast',
                name: 'Forecast',
                color: ADMIN_CHART_COLORS.amber,
                strokeDasharray: '4 4',
              },
            ]}
            height={220}
            showLegend
          />
        </div>
      </div>

      {/* Inventory by type needs width when several SKUs — keep full bleed */}
      <div>
        <p className="mb-2 text-[12px] font-semibold text-[var(--mu)]">
          Inventory by battery type
        </p>
        <p className="mb-3 text-[12.5px] text-[var(--mu)]">
          Ready / charging / other stacked per SKU stocked at this station
        </p>
        <AdminBarChart
          data={inventoryByType}
          series={[
            { dataKey: 'ready', name: 'Ready', color: ADMIN_CHART_COLORS.green, stackId: 'inv' },
            {
              dataKey: 'charging',
              name: 'Charging',
              color: ADMIN_CHART_COLORS.sky,
              stackId: 'inv',
            },
            { dataKey: 'empty', name: 'Other', color: ADMIN_CHART_COLORS.muted, stackId: 'inv' },
          ]}
          height={inventoryByType.length > 3 ? 260 : 220}
          showLegend
        />
      </div>
    </div>
  )
}
