import { useState, type ReactNode } from 'react'
import { Badge, Button } from '@mantine/core'
import { BatteryCharging01Icon, Download04Icon } from 'hugeicons-react'
import type { BayBoardCard } from '../hubBayBoardModel'
import type { HubSlotApi } from '../types'
import { useCanDoBayWork, usePacksWaitingAtHub } from '../hooks/use-bay-charging'
import { BayChargeModal, type BayPack } from './BayChargeModal'
import { BayChargeWalkModal } from './BayChargeWalkModal'
import { BayReceiveModal } from './BayReceiveModal'

const btnStyles = {
  root: { borderColor: 'var(--bd)', color: 'var(--tx)', backgroundColor: 'var(--sf)', fontWeight: 600 },
}

/**
 * Bay work on the live board: toolbar buttons (receive packs, update
 * charging), per-bay actions for the drawer, and the modals they open.
 * Shown only to hub staff (swaps:complete).
 */
export function useBayActions({
  hubId,
  hubName,
  slots,
}: {
  hubId: string
  hubName: string
  slots: HubSlotApi[]
}) {
  const allowed = useCanDoBayWork()
  const { waiting } = usePacksWaitingAtHub(hubId, allowed)
  const [chargePack, setChargePack] = useState<BayPack | null>(null)
  const [walk, setWalk] = useState(false)
  const [receive, setReceive] = useState<{ bay: number | null } | null>(null)

  const charging = slots.filter((s) => s.battery_status === 'CHARGING').length

  const toolbar: ReactNode = allowed ? (
    <>
      <Button
        variant="default"
        styles={btnStyles}
        leftSection={<Download04Icon size={15} />}
        rightSection={waiting.length ? <Badge size="sm" circle color="orange">{waiting.length}</Badge> : null}
        onClick={() => setReceive({ bay: null })}
      >
        Receive packs
      </Button>
      <Button
        variant="default"
        styles={btnStyles}
        leftSection={<BatteryCharging01Icon size={15} />}
        rightSection={charging ? <Badge size="sm" circle color="yellow">{charging}</Badge> : null}
        onClick={() => setWalk(true)}
      >
        Update charging
      </Button>
    </>
  ) : null

  /** Actions inside a bay's drawer. */
  const cardActions = (card: BayBoardCard, close: () => void): ReactNode => {
    if (!allowed) return null
    if (card.kind === 'empty') {
      return (
        <Button
          fullWidth
          color="brand"
          leftSection={<Download04Icon size={16} />}
          disabled={!waiting.length}
          onClick={() => {
            close()
            setReceive({ bay: card.bay })
          }}
        >
          {waiting.length ? 'Receive a pack here' : 'No packs waiting to receive'}
        </Button>
      )
    }
    if (!card.batteryId || card.kind === 'fault') return null
    return (
      <Button
        fullWidth
        color="brand"
        leftSection={<BatteryCharging01Icon size={16} />}
        onClick={() => {
          close()
          setChargePack({
            id: card.batteryId!,
            serial: card.serial,
            hubId,
            bay: card.bay,
            status: card.batteryStatus,
            chargePct: card.chargePct,
            observedAt: card.observedAt,
            source: card.chargeSource,
            reservationCode: card.reserved?.code ?? null,
          })
        }}
      >
        Record charge
      </Button>
    )
  }

  const modals: ReactNode = allowed ? (
    <>
      <BayChargeModal opened={Boolean(chargePack)} onClose={() => setChargePack(null)} pack={chargePack} />
      <BayChargeWalkModal opened={walk} onClose={() => setWalk(false)} hubId={hubId} hubName={hubName} slots={slots} />
      <BayReceiveModal
        opened={Boolean(receive)}
        onClose={() => setReceive(null)}
        hubId={hubId}
        presetBay={receive?.bay ?? null}
      />
    </>
  ) : null

  return { toolbar, cardActions, modals, waiting }
}
