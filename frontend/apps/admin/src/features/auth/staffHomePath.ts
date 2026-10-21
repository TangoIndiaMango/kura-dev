import type { AdminMePayload } from '@lib/api/auth'
import { canSeeModule, SECTIONS } from '../layout/navConfig'
import { pathForModule } from '../layout/modulePaths'

/** Post-login / index home: the first sidebar module this role can open. */
export function staffHomePath(
  me: AdminMePayload | null | undefined,
  nextPath?: string | null,
): string {
  if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')) {
    return nextPath
  }
  const caps = new Set(me?.capabilities ?? [])
  const can = (code: string) => me?.user?.role === 'SUPER_ADMIN' || caps.has(code)
  // Utility pages are a last resort — a chairman should land on My Cooperative.
  const UTILITY = new Set(['notifications', 'approvals', 'audit', 'profile'])
  const visible = SECTIONS.flatMap((s) => s.items).filter((i) => canSeeModule(i.id, can))
  const home = visible.find((i) => !UTILITY.has(i.id)) ?? visible[0]
  return home ? pathForModule(home.id) : '/profile'
}
