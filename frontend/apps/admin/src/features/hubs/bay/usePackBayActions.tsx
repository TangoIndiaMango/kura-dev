import { useState, type ReactNode } from 'react'
import type { AdminDetailAction } from '@shared/components'
import type { BatteryDetailApi } from '../../batteries/types'
import { useCanDoBayWork } from '../hooks/use-bay-charging'
import { BayChargeModal } from './BayChargeModal'
import { BayReceiveModal } from './BayReceiveModal'

const RECEIVABLE = new Set(['AVAILABLE', 'CHARGING', 'RETURNED', 'UNAVAILABLE'])
const CHARGEABLE = new Set(['AVAILABLE', 'CHARGING', 'RESERVED', 'RETURNED'])

/**
 * Bay work from a pack's own page: receive it into a bay when it's waiting at
 * a hub, record its charge when it's in a bay. Hub staff see these even
 * without battery-management rights.
 */
export function usePackBayActions(battery: BatteryDetailApi | null | undefined) {
  const allowed = useCanDoBayWork()
  const [receiving, setReceiving] = useState(false)
  const [charging, setCharging] = useState(false)

  const actions: AdminDetailAction[] = []
  if (allowed && battery) {
    const inBay = battery.custodian_type === 'HUB_SLOT'
    if (!inBay && battery.current_hub_id && RECEIVABLE.has(battery.status)) {
      actions.push({ id: 'receive', label: 'Receive into bay', onClick: () => setReceiving(true) })
    }
    if (inBay && CHARGEABLE.has(battery.status)) {
      actions.push({ id: 'charge', label: 'Record charge', onClick: () => setCharging(true) })
    }
  }

  const modals: ReactNode =
    allowed && battery ? (
      <>
        {battery.current_hub_id ? (
          <BayReceiveModal
            opened={receiving}
            onClose={() => setReceiving(false)}
            hubId={battery.current_hub_id}
            presetBatteryId={battery.id}
          />
        ) : null}
        <BayChargeModal
          opened={charging}
          onClose={() => setCharging(false)}
          pack={{
            id: battery.id,
            serial: battery.serial,
            hubId: battery.current_hub_id,
            status: battery.status,
            chargePct: battery.charge_pct,
            observedAt: battery.charge_observed_at ?? null,
            source: battery.charge_source ?? null,
          }}
        />
      </>
    ) : null

  return { actions, modals }
}
