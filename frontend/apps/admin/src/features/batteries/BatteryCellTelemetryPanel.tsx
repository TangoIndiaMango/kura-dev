import { BatteryHealthCockpit } from './BatteryHealthCockpit'
import { BatteryCellAnalyticsCard } from './BatteryCellAnalyticsCard'
import { mapBatteryHealthAnalytics } from './batteryHealthMap'
import type { BatteryDetailApi, BatteryListApi } from './types'

/** Cell / SOH telemetry cockpit — live pack BMS metrics and 20S cell balance. */
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
