import { BatteryHealthCockpit } from './BatteryHealthCockpit'
import { BatteryCellAnalyticsCard } from './BatteryCellAnalyticsCard'
import { mapBatteryHealthAnalytics } from './batteryHealthMap'
import type { BatteryDetailApi, BatteryListApi } from './types'

/** Cell / SOH cockpit — BMS metrics when telemetry provides cells, modelled estimates otherwise. */
export function BatteryCellTelemetryPanel({
  battery,
  telemetryRaw,
}: {
  battery: BatteryListApi | BatteryDetailApi
  telemetryRaw?: Record<string, unknown> | null
}) {
  const analytics = mapBatteryHealthAnalytics(battery, { telemetryRaw })
  return (
    <div className="flex flex-col gap-6">
      <BatteryHealthCockpit battery={battery} telemetryRaw={telemetryRaw} />
      <BatteryCellAnalyticsCard analytics={analytics} />
    </div>
  )
}
