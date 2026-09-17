import type { BatteryRecord, ReservationRecord } from '@shared/mock/adminMockData'

export type BayBoardKind = 'ready' | 'charging' | 'empty' | 'reserved' | 'fault'

export type BayBoardCard = {
  bay: number
  kind: BayBoardKind
  typeTag: string
  chargePct: number | null
  statusLabel: string
  sohLabel: string
  tempLabel: string
  serial: string
  reserved?: { name: string; code: string; holdLeft: string }
  batteryId?: string | null
  battery: BatteryRecord | null
}

function typeTag(type: string | undefined): string {
  if (!type) return 'EMPTY'
  if (/72/i.test(type)) return 'AS-72V'
  if (/60/i.test(type)) return 'MX-60V'
  if (/48/i.test(type)) return 'SP-48V'
  return type.slice(0, 8).toUpperCase()
}

function tempForBay(bay: number): string {
  const t = 28.4 + (bay % 7) * 0.7 + (bay % 3) * 0.3
  return `${t.toFixed(1)}°C`
}

function etaToFull(chargePct: number): string {
  const mins = Math.max(4, Math.ceil((100 - chargePct) / 2.2))
  return `${mins}M TO 100%`
}

/** Build one card per physical bay for today's live board. */
export function buildBayBoardCards(
  batteries: BatteryRecord[],
  slots: number,
  reservations: ReservationRecord[] = [],
): BayBoardCard[] {
  const activeHold = reservations.find((r) => r.status === 'ACTIVE')
  const occupied = batteries.slice(0, slots)
  const cards: BayBoardCard[] = []

  for (let i = 0; i < slots; i++) {
    const bay = i + 1
    const battery = occupied[i] ?? null

    // One reserved bay when a live hold exists (prefer a charging dock)
    const isReserved =
      Boolean(activeHold) &&
      battery &&
      (battery.status === 'CHARGING' || battery.status === 'AVAILABLE') &&
      bay === Math.min(slots, 7)

    if (!battery) {
      cards.push({
        bay,
        kind: 'empty',
        typeTag: 'EMPTY',
        chargePct: null,
        statusLabel: 'DOCK OPEN',
        sohLabel: 'Lock Latched',
        tempLabel: tempForBay(bay),
        serial: 'Awaiting Return',
        battery: null,
      })
      continue
    }

    if (isReserved && activeHold) {
      cards.push({
        bay,
        kind: 'reserved',
        typeTag: 'RESERVED',
        chargePct: battery.chargePct,
        statusLabel: `${activeHold.expiresIn.replace(/ min/i, 'M')} HOLD LEFT`,
        sohLabel: activeHold.operatorName.slice(0, 14) + (activeHold.operatorName.length > 14 ? '…' : ''),
        tempLabel: 'PIN',
        serial: battery.serial,
        reserved: {
          name: activeHold.operatorName,
          code: `#${activeHold.code.replace(/\D/g, '').slice(-4) || '6621'}`,
          holdLeft: activeHold.expiresIn,
        },
        battery,
      })
      continue
    }

    if (battery.status === 'MAINTENANCE') {
      cards.push({
        bay,
        kind: 'fault',
        typeTag: typeTag(battery.type),
        chargePct: battery.chargePct,
        statusLabel: 'SERVICE BAY',
        sohLabel: `SoH ${battery.healthPct.toFixed(1)}%`,
        tempLabel: tempForBay(bay),
        serial: battery.serial,
        battery,
      })
      continue
    }

    if (battery.status === 'CHARGING' || battery.chargePct < 85) {
      cards.push({
        bay,
        kind: 'charging',
        typeTag: typeTag(battery.type),
        chargePct: battery.chargePct,
        statusLabel: etaToFull(battery.chargePct),
        sohLabel: `SoH ${battery.healthPct.toFixed(1)}%`,
        tempLabel: tempForBay(bay),
        serial: battery.serial,
        battery,
      })
      continue
    }

    cards.push({
      bay,
      kind: 'ready',
      typeTag: typeTag(battery.type),
      chargePct: battery.chargePct,
      statusLabel: battery.chargePct >= 100 ? 'FULL · READY' : 'READY FOR SWAP',
      sohLabel: `SoH ${battery.healthPct.toFixed(1)}%`,
      tempLabel: tempForBay(bay),
      serial: battery.serial,
      battery,
    })
  }

  return cards
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
      const serial = slot.battery_serial ?? 'Awaiting Return'

      if (slot.state === 'EMPTY' || !slot.battery_id) {
        return {
          bay,
          kind: 'empty' as const,
          typeTag: 'EMPTY',
          chargePct: null,
          statusLabel: 'DOCK OPEN',
          sohLabel: 'Lock Latched',
          tempLabel: tempForBay(bay),
          serial: 'Awaiting Return',
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
          tempLabel: tempForBay(bay),
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
          statusLabel: charge != null ? etaToFull(charge) : 'CHARGING',
          sohLabel: 'In bay',
          tempLabel: tempForBay(bay),
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
        tempLabel: tempForBay(bay),
        serial,
        batteryId: slot.battery_id,
        battery: null,
      }
    })
}
