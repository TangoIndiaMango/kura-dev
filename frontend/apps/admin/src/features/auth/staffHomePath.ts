import type { AdminMePayload } from '@lib/api/auth'

/** Post-login / index home — ops command centre only for network managers. */
export function staffHomePath(
  me: AdminMePayload | null | undefined,
  nextPath?: string | null,
): string {
  if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')) {
    return nextPath
  }
  const role = me?.user?.role
  if (role === 'SUPER_ADMIN') return '/'
  const caps = new Set(me?.capabilities ?? [])
  if (caps.has('hubs:manage')) return '/'
  return '/hubs'
}
