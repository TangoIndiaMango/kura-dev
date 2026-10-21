import type { BatteryRecord } from '@shared/mock/adminMockData'

export type BayBoardKind = 'ready' | 'charging' | 'empty' | 'reserved' | 'fault'

export type BayBoardCard = {
  bay: number
  kind: BayBoardKind
  typeTag: string
  chargePct: number | null
  statusLabel: string
  sohLabel: string
  /** Bay sensor reading; empty until hubs report bay telemetry. */
  tempLabel: string
  serial: string
  reserved?: { name: string; code: string; holdLeft: string }
  batteryId?: string | null
  battery: BatteryRecord | null
}

/** Live bay board from `/hubs/{id}/slots/` (no mock battery fleet). */
export function buildBayBoardCardsFromSlots(
  slots: Array<{
    slot_no: number
    state: string
    battery_id: string | null
    battery_serial: string | null
    battery_charge_pct: number | null
  }>,
): BayBoardCard[] {
  return [...slots]
    .sort((a, b) => a.slot_no - b.slot_no)
    .map((slot) => {
      const bay = slot.slot_no
      const charge = slot.battery_charge_pct
      const serial = slot.battery_serial ?? '—'

      if (slot.state === 'EMPTY' || !slot.battery_id) {
        return {
          bay,
          kind: 'empty' as const,
          typeTag: 'EMPTY',
          chargePct: null,
          statusLabel: 'DOCK OPEN',
          sohLabel: '',
          tempLabel: '',
          serial: 'No pack',
          batteryId: null,
          battery: null,
        }
      }

      if (slot.state === 'FAULT') {
        return {
          bay,
          kind: 'fault' as const,
          typeTag: 'FAULT',
          chargePct: charge,
          statusLabel: 'SERVICE BAY',
          sohLabel: 'Needs inspection',
          tempLabel: '',
          serial,
          batteryId: slot.battery_id,
          battery: null,
        }
      }

      if (slot.state === 'CHARGING') {
        return {
          bay,
          kind: 'charging' as const,
          typeTag: 'PACK',
          chargePct: charge,
          statusLabel: 'CHARGING',
          sohLabel: 'In bay',
          tempLabel: '',
          serial,
          batteryId: slot.battery_id,
          battery: null,
        }
      }

      return {
        bay,
        kind: 'ready' as const,
        typeTag: 'PACK',
        chargePct: charge,
        statusLabel:
          charge != null && charge >= 100 ? 'FULL · READY' : 'READY FOR SWAP',
        sohLabel: 'In bay',
        tempLabel: '',
        serial,
        batteryId: slot.battery_id,
        battery: null,
      }
    })
}
