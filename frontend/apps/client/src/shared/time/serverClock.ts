/** Offset = serverMs − clientMs; positive when device clock is behind. */
let offsetMs = 0

export function noteServerTime(serverMs: number, clientMs = Date.now()): void {
  if (!Number.isFinite(serverMs)) return
  offsetMs = serverMs - clientMs
}

/** Wall clock aligned to API Date headers when available. */
export function nowMs(): number {
  return Date.now() + offsetMs
}

export function serverClockOffsetMs(): number {
  return offsetMs
}

/** "Good morning/afternoon/evening" by the hub clock (Lagos), not the device TZ. */
export function greetingNow(): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: 'Africa/Lagos',
    }).format(new Date(nowMs())),
  )
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
