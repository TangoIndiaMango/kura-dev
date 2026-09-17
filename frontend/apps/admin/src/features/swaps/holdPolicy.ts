const STORAGE_KEY = 'kura_admin_hold_policy'

export type HoldPolicy = {
  defaultHoldMinutes: number
  maxExtendMinutes: number
}

export const DEFAULT_HOLD_POLICY: HoldPolicy = {
  defaultHoldMinutes: 15,
  maxExtendMinutes: 15,
}

export function readHoldPolicy(): HoldPolicy {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_HOLD_POLICY }
    const parsed = JSON.parse(raw) as Partial<HoldPolicy>
    return {
      defaultHoldMinutes: clamp(
        Number(parsed.defaultHoldMinutes) || DEFAULT_HOLD_POLICY.defaultHoldMinutes,
        5,
        60,
      ),
      maxExtendMinutes: clamp(
        Number(parsed.maxExtendMinutes) || DEFAULT_HOLD_POLICY.maxExtendMinutes,
        5,
        60,
      ),
    }
  } catch {
    return { ...DEFAULT_HOLD_POLICY }
  }
}

export function writeHoldPolicy(policy: HoldPolicy) {
  const next: HoldPolicy = {
    defaultHoldMinutes: clamp(policy.defaultHoldMinutes, 5, 60),
    maxExtendMinutes: clamp(policy.maxExtendMinutes, 5, 60),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(n)))
}

export function parseHoldMinutesLeft(expiresIn: string): number {
  const m = expiresIn.match(/(\d+)\s*min/i)
  if (m) return Number(m[1])
  return 0
}
