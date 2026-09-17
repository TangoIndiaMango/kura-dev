/** Minimal hub fields needed for F3 bookability. */
export interface HubAvailabilityInput {
  id: string
  status: 'ready' | 'low' | 'offline'
  ready: number
  batteries?: Array<{
    label: string
    ready: number | null
  }>
}

/**
 * F3 bookable hubs: online, ready_count > 0, and (when known) stocks
 * the vehicle battery type with at least one ready pack.
 */
export function isHubBookable(
  hub: HubAvailabilityInput,
  batteryType?: string | null,
): boolean {
  if (hub.status === 'offline') return false
  if (hub.ready <= 0) return false
  if (!batteryType) return true
  const rows = hub.batteries
  if (!rows?.length) return true
  const match = rows.find(
    (b) => b.label.toLowerCase() === batteryType.trim().toLowerCase(),
  )
  if (!match) return false
  return (match.ready ?? 0) > 0
}

export function partitionSwapHubs<T extends HubAvailabilityInput>(
  hubs: T[],
  batteryType?: string | null,
) {
  const bookable: T[] = []
  const unavailable: T[] = []
  for (const hub of hubs) {
    if (isHubBookable(hub, batteryType)) bookable.push(hub)
    else unavailable.push(hub)
  }
  return { bookable, unavailable }
}
