import { useMemo } from 'react'
import { isRiderFacing } from '@shared/utils/paymentDisplay'
import { useAuth } from '../../auth/AuthProvider'
import { useMySubscriptions } from '../../plans/hooks/use-operator-plans'
import { planLabelForVehicle } from '../../plans/hooks/plan-live-map'
import { useOperatorPayments } from '../../wallet/hooks/use-operator-wallet'
import { useMyVehicles } from '../../swap/hooks/use-swap-live'
import { mapLiveVehiclesToHome } from '../../swap/swapLiveMap'
import { paymentToHistory } from '../../history/historyLiveMap'

export function useHomeLiveData() {
  const { isAuthenticated } = useAuth()
  const livePayments = useOperatorPayments({
    enabled: isAuthenticated,
    page_size: 8,
  })
  const liveVehicles = useMyVehicles({
    enabled: isAuthenticated,
    pageSize: 100,
  })
  const subs = useMySubscriptions({ enabled: isAuthenticated })

  const vehicles = useMemo(() => {
    if (!isAuthenticated || liveVehicles.vehicles.length === 0) return []
    return mapLiveVehiclesToHome(liveVehicles.vehicles).map((v) => ({
      ...v,
      plan: planLabelForVehicle(subs.subscriptions, v.id),
    }))
  }, [isAuthenticated, liveVehicles.vehicles, subs.subscriptions])

  const activityItems =
    isAuthenticated && livePayments.payments.length > 0
      ? livePayments.payments.filter(isRiderFacing).map((p) => {
          const row = paymentToHistory(p)
          return {
            id: row.id,
            title: row.title,
            meta: row.meta,
            amountLabel: row.amountLabel,
            tone:
              row.tone === 'credit'
                ? ('credit' as const)
                : row.tone === 'neutral'
                  ? ('neutral' as const)
                  : ('debit' as const),
            receiptId: row.receiptId,
          }
        })
      : []

  return {
    isAuthenticated,
    vehicles,
    activityItems,
    vehiclesLoading: isAuthenticated && liveVehicles.isLoading,
    activityLoading: isAuthenticated && livePayments.isLoading,
  }
}
