import {
  cacheHoldForOffline as idbCacheHold,
  clearOfflineHold as idbClearHold,
  readOfflineHold as idbReadHold,
  type OfflineHoldRecord,
} from './holdIdb'

export type { OfflineHoldRecord }

export type PwaUpdateListener = (registration: ServiceWorkerRegistration) => void
export type PwaInstallListener = (event: BeforeInstallPromptEvent) => void

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

let deferredInstall: BeforeInstallPromptEvent | null = null
let pendingUpdateRegistration: ServiceWorkerRegistration | null = null
const installListeners = new Set<PwaInstallListener>()
const updateListeners = new Set<PwaUpdateListener>()

function notifyUpdate(reg: ServiceWorkerRegistration) {
  pendingUpdateRegistration = reg
  updateListeners.forEach((l) => l(reg))
}

export function getPendingPwaUpdate() {
  return pendingUpdateRegistration
}

export function clearPendingPwaUpdate() {
  pendingUpdateRegistration = null
}

export function getDeferredInstallPrompt() {
  return deferredInstall
}

export function clearDeferredInstallPrompt() {
  deferredInstall = null
}

export function onPwaInstallAvailable(listener: PwaInstallListener) {
  installListeners.add(listener)
  if (deferredInstall) listener(deferredInstall)
  return () => {
    installListeners.delete(listener)
  }
}

export function onPwaUpdateAvailable(listener: PwaUpdateListener) {
  updateListeners.add(listener)
  if (pendingUpdateRegistration) listener(pendingUpdateRegistration)
  return () => {
    updateListeners.delete(listener)
  }
}

export function isPwaInstalled() {
  if (typeof window === 'undefined') return false
  const mq = window.matchMedia('(display-mode: standalone)')
  return mq.matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** Registers SW, wires install + update events. Safe to call once from main. */
export function registerOperatorPwa() {
  if (typeof window === 'undefined') return

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredInstall = e as BeforeInstallPromptEvent
    installListeners.forEach((l) => l(deferredInstall!))
  })

  window.addEventListener('appinstalled', () => {
    deferredInstall = null
    localStorage.setItem('kura_pwa_installed_at', String(Date.now()))
  })

  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        if (reg.waiting) {
          notifyUpdate(reg)
        }
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing
          if (!worker) return
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              notifyUpdate(reg)
            }
          })
        })

        // Periodic update check (smooth, not spammy)
        window.setInterval(() => {
          void reg.update()
        }, 60 * 60 * 1000)
      })
      .catch(() => {
        /* HTTPS / private mode */
      })
  })
}

export async function applyPwaUpdate(registration?: ServiceWorkerRegistration | null) {
  const target = registration ?? pendingUpdateRegistration
  const waiting = target?.waiting
  if (!waiting) {
    window.location.reload()
    return
  }
  waiting.postMessage({ type: 'SKIP_WAITING' })
  await new Promise<void>((resolve) => {
    const onController = () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onController)
      resolve()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onController)
    window.setTimeout(resolve, 1500)
  })
  clearPendingPwaUpdate()
  window.location.reload()
}

export async function promptPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredInstall) return 'unavailable'
  await deferredInstall.prompt()
  const { outcome } = await deferredInstall.userChoice
  deferredInstall = null
  return outcome
}

export async function requestOperatorNotifications(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export async function cacheHoldForOffline(
  hold: Omit<OfflineHoldRecord, 'cachedAt'>,
): Promise<void> {
  // Migrate away from any legacy localStorage hold
  try {
    localStorage.removeItem('kura_offline_hold')
  } catch {
    /* ignore */
  }
  await idbCacheHold(hold)
}

export async function clearOfflineHold(holdId?: string): Promise<void> {
  try {
    localStorage.removeItem('kura_offline_hold')
  } catch {
    /* ignore */
  }
  await idbClearHold(holdId)
}

export async function readOfflineHold(): Promise<OfflineHoldRecord | null> {
  return idbReadHold()
}
