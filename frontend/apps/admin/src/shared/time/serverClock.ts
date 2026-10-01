/** Offset = serverMs − clientMs; positive when device clock is behind. */
let offsetMs = 0

export function noteServerTime(serverMs: number, clientMs = Date.now()): void {
  if (!Number.isFinite(serverMs)) return
  offsetMs = serverMs - clientMs
}

/** Wall clock aligned to API `X-Kura-Server-Time` when available. */
export function nowMs(): number {
  return Date.now() + offsetMs
}

export function serverClockOffsetMs(): number {
  return offsetMs
}
