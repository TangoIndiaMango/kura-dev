import { useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { useMySubscriptions } from '../../plans/hooks/use-operator-plans'
import { planLabelForVehicle } from '../../plans/hooks/plan-live-map'
import { useMyVehicles } from '../../swap/hooks/use-swap-live'

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  PENDING: 'Pending',
  SUSPENDED: 'Suspended',
  RETIRED: 'Retired',
}

export function useAccountVehicles() {
  const { isAuthenticated } = useAuth()
  const [page, setPage] = useState(1)
  const live = useMyVehicles({
    enabled: isAuthenticated,
    page,
    pageSize: 25,
  })
  const subs = useMySubscriptions({ enabled: isAuthenticated })

  const displayVehicles = useMemo(() => {
    if (!isAuthenticated || live.vehicles.length === 0) return []
    return live.vehicles.map((v) => ({
      id: v.id,
      name: `${v.make} ${v.model_name}`,
      status: STATUS_LABEL[v.status] ?? v.status,
      rows: [
        { label: 'Registration', value: v.registration_plate },
        {
          label: 'Battery type',
          value: v.battery_type_name || v.vehicle_type || '—',
        },
        {
          label: 'Plan',
          value: planLabelForVehicle(subs.subscriptions, v.id),
        },
        {
          label: 'Pack',
          value: v.current_battery_serial || 'No pack mounted',
        },
      ],
    }))
  }, [isAuthenticated, live.vehicles, subs.subscriptions])

  return {
    displayVehicles,
    loading:
      isAuthenticated && (live.isLoading || (subs.isLoading && !subs.data)),
    isFetching: live.isFetching,
    page: live.currentPage,
    setPage,
    totalPages: live.totalPages,
    count: live.count,
    refetch: live.refetch,
  }
}
