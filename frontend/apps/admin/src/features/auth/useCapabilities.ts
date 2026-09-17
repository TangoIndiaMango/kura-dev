import { useAuth } from '../../features/auth/AuthProvider'

/** Capability check from `/auth/me` — same codes as backend HasCapability. */
export function useCapabilities() {
  const { me } = useAuth()
  const caps = me?.capabilities ?? []
  const set = new Set(caps)

  function can(code: string): boolean {
    if (!code) return false
    if (me?.user?.role === 'SUPER_ADMIN') return true
    return set.has(code)
  }

  function canAny(...codes: string[]): boolean {
    return codes.some((c) => can(c))
  }

  return { caps, can, canAny, me }
}
