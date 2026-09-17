import { AdminModuleLayout } from '@shared/components'
import { HoldLimitsPanel } from './HoldLimitsPanel'

export function PricingSettingsPanel() {
  return (
    <AdminModuleLayout
      title="Pricing settings"
      subtitle="Bay hold limits and related tariff policy."
    >
      <HoldLimitsPanel />
    </AdminModuleLayout>
  )
}
