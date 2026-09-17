import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminModuleLayout, useAdminModuleControls } from '@shared/components'
import { useCataloguePlans } from '@features/mobility'
import { planApiToRecord } from './planLiveMap'
import { PricingPlansTable } from './PricingPlansTable'
import { PLAN_STATUS_OPTIONS } from './pricingPanelMeta'

export function PlansListPanel() {
  const navigate = useNavigate()
  const {
    plans: livePlansApi,
    isPending: plansPending,
    isError: plansError,
  } = useCataloguePlans({ page: 1, page_size: 100, is_active: 'all' })
  const plans = useMemo(
    () => livePlansApi.map(planApiToRecord),
    [livePlansApi],
  )

  const controls = useAdminModuleControls({
    scope: 'pricing_plans',
    statusOptions: PLAN_STATUS_OPTIONS,
    filterTitle: 'Filter plans',
    extraFilterFields: [
      {
        type: 'select',
        key: 'vehicleType',
        label: 'Vehicle type',
        placeholder: 'Any type',
        options: [
          { value: 'Motorcycle', label: 'Motorcycle' },
          { value: 'Tricycle', label: 'Tricycle' },
          { value: 'Boat', label: 'Boat' },
        ],
      },
    ],
  })

  const filteredPlans = useMemo(() => {
    const q = controls.search.toLowerCase()
    return plans.filter(
      (p) =>
        controls.matchesStatus(p.status) &&
        controls.matchesFilter('vehicleType', p.vehicleType) &&
        (p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.vehicleType.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)),
    )
  }, [plans, controls.search, controls.filterValues])

  const { pageRows, pagination } = controls.paginate(filteredPlans)

  const activePlans = plans.filter((p) => p.status === 'ACTIVE').length
  const totalSubs = plans.reduce((s, p) => s + p.subscribers, 0)
  const autoRenewOn = plans.filter(
    (p) => p.autoRenew && p.status === 'ACTIVE',
  ).length

  return (
    <>
      <AdminModuleLayout
        title="Plans"
        subtitle="Catalogue plans by vehicle type. Subscriptions attach per vehicle."
        dateRangeSlot={controls.dateRangeSlot}
        kpis={[
          {
            title: 'Plans',
            value: String(plans.length),
            sub: `${activePlans} active`,
            tone: 'default',
          },
          {
            title: 'Active subscribers',
            value: totalSubs.toLocaleString(),
            sub: 'Across catalogue',
            tone: 'success',
          },
          {
            title: 'Auto-renew default',
            value: String(autoRenewOn),
            sub: 'Active plans with On',
            tone: 'default',
          },
          {
            title: 'Pending sign-off',
            value: String(plans.filter((p) => p.status === 'PENDING').length),
            sub: 'Dual control',
            tone: 'warning',
          },
        ]}
      >
        <PricingPlansTable
          pending={plansPending}
          error={plansError}
          rows={pageRows}
          pagination={pagination}
          searchQuery={controls.searchQuery}
          onSearchChange={controls.setSearchQuery}
          onFilter={controls.openFilter}
          onOpenPlan={(id) => navigate(`/pricing/plans/${id}`)}
          onAdd={() => navigate('/pricing/plans/new')}
        />
      </AdminModuleLayout>
      {controls.filterModal}
    </>
  )
}
