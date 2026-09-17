import { useLocation, useParams } from 'react-router-dom'
import { PricingPanel } from '@features/pricing/PricingPanel'
import { PricingDetailPanel } from '@features/pricing/PricingDetailPanel'
import { PlanDetailPanel } from '@features/pricing/PlanDetailPanel'
import { PriceFormPanel } from '@features/pricing/PriceFormPanel'
import { PlanFormPanel } from '@features/pricing/PlanFormPanel'
import { PlansListPanel } from '@features/pricing/PlansListPanel'
import { PricingSettingsPanel } from '@features/pricing/PricingSettingsPanel'

export default function PricingPage() {
  const { id } = useParams<{ id?: string }>()
  const { pathname } = useLocation()

  if (pathname === '/pricing/settings' || pathname.startsWith('/pricing/settings/')) {
    return <PricingSettingsPanel />
  }
  if (pathname === '/pricing/plans') return <PlansListPanel />
  if (pathname.includes('/pricing/plans/new')) return <PlanFormPanel />
  if (pathname.endsWith('/edit') && pathname.includes('/pricing/plans/')) {
    return <PlanFormPanel planId={id} />
  }
  if (pathname.includes('/pricing/plans/')) return <PlanDetailPanel />
  if (pathname.endsWith('/pricing/new') || id === 'new') return <PriceFormPanel />
  if (pathname.endsWith('/edit') && id) return <PriceFormPanel priceId={id} />
  if (id) return <PricingDetailPanel />
  return <PricingPanel />
}
