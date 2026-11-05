/** Wording for bay work: where a pack is, how fresh its last reading is. */

export const LOCATION_LABEL: Record<string, string> = {
  HUB_SLOT: 'In a bay',
  TRANSIT: 'Waiting at hub',
  VEHICLE: 'On a vehicle',
  WORKSHOP: 'Workshop',
  NONE: 'Not assigned',
}

export const LOCATION_OPTIONS = Object.entries(LOCATION_LABEL).map(([value, label]) => ({
  value,
  label,
}))

/** "just now", "12 min ago", "3 h ago", "2 days ago". */
export function readingAge(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'no reading yet'
  const ms = now - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 60_000) return 'just now'
  const min = Math.round(ms / 60_000)
  if (min < 60) return `${min} min ago`
  const h = Math.round(min / 60)
  if (h < 48) return `${h} h ago`
  return `${Math.round(h / 24)} days ago`
}

/** A charging reading older than this is worth a fresh look. */
export const STALE_READING_HOURS = 6

export function isStale(iso: string | null | undefined, now = Date.now()): boolean {
  if (!iso) return true
  return now - new Date(iso).getTime() > STALE_READING_HOURS * 3_600_000
}

export function sourceLabel(source: string | null | undefined): string {
  if (source === 'BMS') return 'from charger'
  if (source === 'MANUAL') return 'entered by staff'
  return ''
}
