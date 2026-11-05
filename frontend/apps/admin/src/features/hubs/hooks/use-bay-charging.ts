/** Bay work: receive arrived packs into bays and record charge readings. */
import { usePostData } from '@shared/hooks/api'
import { useCapabilities } from '../../auth/useCapabilities'
import { useBatteries } from '../../batteries/hooks/use-batteries'
import { BATTERIES_ENDPOINTS } from '../../batteries/constants'
import type { BatteryDetailApi, BatteryListApi } from '../../batteries/types'
import { HUBS_ENDPOINTS } from '../constants'

/** At or above this charge a pack is released for swaps on its own (matches the API). */
export const READY_CHARGE_PCT = 95

export type ReceivePayload = {
  batteryId: string
  hub_id?: string
  slot_no?: number
  charge_pct: number
  note?: string
}

export type ChargePayload = {
  batteryId: string
  charge_pct: number
  release?: boolean
  note?: string
}

export type ChargeReading = { battery_id: string; charge_pct: number; release?: boolean }

export type ChargeReadingsResult = {
  saved: number
  failed: number
  results: Array<{ battery_id: string; ok: boolean; status?: string; error?: string }>
}

/** Everything that shows a pack's place or charge refreshes after bay work. */
function refreshKeys(hubId: string | null | undefined, batteryId?: string) {
  return [
    BATTERIES_ENDPOINTS.list,
    BATTERIES_ENDPOINTS.stats,
    ...(batteryId ? [BATTERIES_ENDPOINTS.battery(batteryId), BATTERIES_ENDPOINTS.events(batteryId)] : []),
    ...(hubId
      ? [HUBS_ENDPOINTS.slots(hubId), HUBS_ENDPOINTS.hub(hubId), `${HUBS_ENDPOINTS.hub(hubId)}stats/`]
      : []),
    HUBS_ENDPOINTS.list,
    HUBS_ENDPOINTS.stats,
  ]
}

/** Hub staff (the people at the bay) may receive packs and record charge. */
export function useCanDoBayWork() {
  const { can } = useCapabilities()
  return can('swaps:complete')
}

export function useReceiveBattery(hubId: string | null | undefined, batteryId?: string | null) {
  return usePostData<ReceivePayload, BatteryDetailApi>(
    (v) => BATTERIES_ENDPOINTS.receive(v.batteryId),
    refreshKeys(hubId, batteryId ?? undefined),
    { body: ({ batteryId: _id, ...rest }) => rest, silentError: true },
  )
}

export function useRecordCharge(hubId: string | null | undefined, batteryId?: string) {
  return usePostData<ChargePayload, BatteryDetailApi>(
    (v) => BATTERIES_ENDPOINTS.charge(v.batteryId),
    refreshKeys(hubId, batteryId),
    { body: ({ batteryId: _id, ...rest }) => rest, silentError: true },
  )
}

export function useChargeReadings(hubId: string) {
  return usePostData<{ readings: ChargeReading[]; note?: string }, ChargeReadingsResult>(
    HUBS_ENDPOINTS.chargeReadings(hubId),
    refreshKeys(hubId),
    { silentError: true },
  )
}

/**
 * Packs at the hub that aren't in a bay yet: new, transferred in, or back
 * from the workshop. Faulted ones stay out until they're repaired.
 */
export function usePacksWaitingAtHub(hubId: string | null | undefined, enabled = true) {
  const transit = useBatteries(
    { current_hub: hubId ?? undefined, custodian: 'TRANSIT', page_size: 100 },
    { enabled: enabled && Boolean(hubId) },
  )
  const workshop = useBatteries(
    { current_hub: hubId ?? undefined, custodian: 'WORKSHOP', page_size: 100 },
    { enabled: enabled && Boolean(hubId) },
  )
  const waiting: BatteryListApi[] = [...transit.batteries, ...workshop.batteries].filter(
    (b) => b.status !== 'FAULTED' && b.status !== 'RETIRED' && b.status !== 'LOST',
  )
  return {
    waiting,
    isPending: transit.isPending || workshop.isPending,
    isError: transit.isError || workshop.isError,
  }
}
