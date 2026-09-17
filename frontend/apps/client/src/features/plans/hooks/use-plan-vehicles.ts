import { useMemo } from 'react'
import type { OperatorVehicle } from '../../../shared/session'
import { useMyVehicles } from '../../swap/hooks/use-swap-live'
import { mapLiveVehicles } from '../../swap/swapLiveMap'
import {
  coveringSubscription,
  planLabelForVehicle,
} from './plan-live-map'
import type { SubscriptionApi } from './use-operator-plans'

export function usePlanVehicles(input: {
  live: boolean
  sessionVehicles: OperatorVehicle[]
  subscriptions: SubscriptionApi[]
}) {
  const liveVehiclesQuery = useMyVehicles({
    enabled: input.live,
    pageSize: 100,
  })
  const vehiclesLoading = Boolean(input.live && liveVehiclesQuery.isLoading)

  const vehicles = useMemo(() => {
    const sessionList = input.sessionVehicles
    if (input.live && liveVehiclesQuery.vehicles.length > 0) {
      return mapLiveVehicles(liveVehiclesQuery.vehicles).map((v) => {
        const local = sessionList.find((s) => s.id === v.id || s.reg === v.reg)
        const covering = coveringSubscription(input.subscriptions, v.id)
        return {
          id: v.id,
          name: v.name,
          short: v.short,
          reg: v.reg,
          battery: v.battery,
          plan: covering
            ? planLabelForVehicle(input.subscriptions, v.id)
            : local?.plan && local.plan !== 'Live' && local.plan !== 'None'
              ? local.plan
              : 'Pay-per-swap',
          socPercent: local?.socPercent ?? null,
          rangeKm: local?.rangeKm ?? null,
        } satisfies OperatorVehicle
      })
    }
    return sessionList
  }, [
    input.sessionVehicles,
    input.live,
    liveVehiclesQuery.vehicles,
    input.subscriptions,
  ])

  return { vehicles, liveApiVehicles: liveVehiclesQuery.vehicles, loading: vehiclesLoading }
}
