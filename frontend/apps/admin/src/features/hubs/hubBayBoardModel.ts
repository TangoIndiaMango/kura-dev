import type { HubSlotApi } from './types'
import { isStale, readingAge, sourceLabel } from './bay/bayFormat'

export type BayBoardKind = 'ready' | 'charging' | 'empty' | 'reserved' | 'fault'

export type BayBoardCard = {
  bay: number
  kind: BayBoardKind
  typeTag: string
  chargePct: number | null
  statusLabel: string
  /** Second line: when the charge was last read, or who it's held for. */
  sohLabel: string
  /** Bay sensor reading; empty until hubs report bay telemetry. */
  tempLabel: string
  serial: string
  /** Pack model, for the drawer (the card tag stays short). */
  typeName: string | null
  reserved?: { name: string; code: string; holdLeft: string }
  batteryId?: string | null
  /** The pack's own status (AVAILABLE, RESERVED, CHARGING, …). */
  batteryStatus: string | null
  observedAt: string | null
  chargeSource: string | null
  /** A charging pack whose last reading is old — worth a fresh look. */
  stale: boolean
}

/**
 * The live bay board from `/hubs/{id}/slots/`. The bay's state and the pack's
 * own status come from the same row, so a reserved pack shows as reserved
 * and a charging pack shows when it was last read.
 */
export function buildBayBoardCardsFromSlots(slots: HubSlotApi[]): BayBoardCard[] {
  return [...slots]
    .sort((a, b) => a.slot_no - b.slot_no)
    .map((slot) => {
      const base = {
        bay: slot.slot_no,
        chargePct: slot.battery_charge_pct,
        serial: slot.battery_serial ?? '—',
        typeTag: 'PACK',
        typeName: slot.battery_type,
        tempLabel: '',
        batteryId: slot.battery_id,
        batteryStatus: slot.battery_status,
        observedAt: slot.charge_observed_at,
        chargeSource: slot.charge_source,
        stale: false,
      }
      const read = `${readingAge(slot.charge_observed_at)}${
        slot.charge_source ? ` · ${sourceLabel(slot.charge_source)}` : ''
      }`

      if (slot.state === 'EMPTY' || !slot.battery_id) {
        return {
          ...base,
          kind: 'empty' as const,
          typeTag: 'EMPTY',
          chargePct: null,
          statusLabel: 'DOCK OPEN',
          sohLabel: 'Ready to receive a pack',
          serial: 'No pack',
          batteryId: null,
        }
      }
      if (slot.state === 'FAULT') {
        return { ...base, kind: 'fault' as const, statusLabel: 'SERVICE BAY', sohLabel: 'Needs inspection' }
      }
      if (slot.battery_status === 'RESERVED') {
        const code = slot.reservation_code ?? ''
        return {
          ...base,
          kind: 'reserved' as const,
          statusLabel: 'RESERVED',
          sohLabel: code ? `Booking ${code}` : 'No active booking',
          reserved: { name: '', code, holdLeft: '' },
        }
      }
      if (slot.state === 'CHARGING' || slot.battery_status === 'CHARGING') {
        return {
          ...base,
          kind: 'charging' as const,
          statusLabel: 'CHARGING',
          sohLabel: read,
          stale: isStale(slot.charge_observed_at),
        }
      }
      return {
        ...base,
        kind: 'ready' as const,
        statusLabel: (slot.battery_charge_pct ?? 0) >= 100 ? 'FULL · READY' : 'READY FOR SWAP',
        sohLabel: read,
      }
    })
}
