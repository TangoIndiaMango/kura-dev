import React, { useEffect, useState } from 'react'
import {
  applyPwaUpdate,
  isPwaInstalled,
  notificationPermission,
  onPwaInstallAvailable,
  onPwaUpdateAvailable,
  promptPwaInstall,
  requestOperatorNotifications,
  type BeforeInstallPromptEvent,
} from '../../shared/pwa/registerOperatorPwa'
import { useOperatorSession } from '../../shared/session'

const DISMISS_INSTALL_KEY = 'kura_pwa_install_dismissed'
const DISMISS_NOTIF_KEY = 'kura_pwa_notif_dismissed'
const NOTIF_HINT_KEY = 'kura_pwa_notif_hint_ready'
/** Banner snooze only — update stays in the notification inbox. */
const SNOOZE_UPDATE_KEY = 'kura_pwa_update_banner_snoozed'

function daysSince(ts: number) {
  return (Date.now() - ts) / (1000 * 60 * 60 * 24)
}

function hoursSince(ts: number) {
  return (Date.now() - ts) / (1000 * 60 * 60)
}

/**
 * PWA chrome: install, update banner, contextual OS notification permission.
 * “Later” on update snoozes the banner and parks the update in Notifications.
 */
export function OperatorPwaChrome({ holdJustBooked }: { holdJustBooked?: boolean }) {
  const { queueAppUpdateNotification } = useOperatorSession()
  const [canInstall, setCanInstall] = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  const [updateReg, setUpdateReg] = useState<ServiceWorkerRegistration | null>(null)
  const [bannerSnoozed, setBannerSnoozed] = useState(() => {
    const ts = Number(sessionStorage.getItem(SNOOZE_UPDATE_KEY) || 0)
    return Boolean(ts && hoursSince(ts) < 8)
  })
  const [showNotif, setShowNotif] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (isPwaInstalled()) return

    const dismissed = Number(localStorage.getItem(DISMISS_INSTALL_KEY) || 0)
    if (dismissed && daysSince(dismissed) < 7) return

    return onPwaInstallAvailable((_e: BeforeInstallPromptEvent) => {
      setCanInstall(true)
      window.setTimeout(() => setShowInstall(true), 1800)
    })
  }, [])

  useEffect(() => {
    return onPwaUpdateAvailable((reg) => {
      setUpdateReg(reg)
      // Always mirror into inbox so the bell stays recoverable after Later / navigation.
      queueAppUpdateNotification()
    })
  }, [queueAppUpdateNotification])

  useEffect(() => {
    if (!holdJustBooked) return
    localStorage.setItem(NOTIF_HINT_KEY, '1')
  }, [holdJustBooked])

  useEffect(() => {
    const ready = localStorage.getItem(NOTIF_HINT_KEY) === '1'
    if (!ready) return
    const perm = notificationPermission()
    if (perm !== 'default') return
    const dismissed = Number(localStorage.getItem(DISMISS_NOTIF_KEY) || 0)
    if (dismissed && daysSince(dismissed) < 14) return
    window.setTimeout(() => setShowNotif(true), 900)
  }, [holdJustBooked])

  if (updateReg && !bannerSnoozed) {
    return (
      <Banner
        title="Update available"
        body="A newer version of KURA is ready."
        primaryLabel="Update"
        secondaryLabel="Later"
        onPrimary={async () => {
          setBusy(true)
          await applyPwaUpdate(updateReg)
        }}
        onSecondary={() => {
          sessionStorage.setItem(SNOOZE_UPDATE_KEY, String(Date.now()))
          setBannerSnoozed(true)
          queueAppUpdateNotification()
        }}
        busy={busy}
      />
    )
  }

  if (showNotif) {
    return (
      <Banner
        title="Hold reminders"
        body="Get a ping before your bay hold expires."
        primaryLabel="Allow"
        secondaryLabel="Not now"
        onPrimary={async () => {
          setBusy(true)
          await requestOperatorNotifications()
          localStorage.removeItem(NOTIF_HINT_KEY)
          setShowNotif(false)
          setBusy(false)
        }}
        onSecondary={() => {
          localStorage.setItem(DISMISS_NOTIF_KEY, String(Date.now()))
          localStorage.removeItem(NOTIF_HINT_KEY)
          setShowNotif(false)
        }}
        busy={busy}
      />
    )
  }

  if (showInstall && canInstall && !isPwaInstalled()) {
    return (
      <Banner
        title="Install KURA"
        body="Add to your home screen for a faster launch at the hub."
        primaryLabel="Install"
        secondaryLabel="Not now"
        onPrimary={async () => {
          setBusy(true)
          const outcome = await promptPwaInstall()
          setBusy(false)
          if (outcome !== 'accepted') {
            localStorage.setItem(DISMISS_INSTALL_KEY, String(Date.now()))
          }
          setShowInstall(false)
          setCanInstall(false)
        }}
        onSecondary={() => {
          localStorage.setItem(DISMISS_INSTALL_KEY, String(Date.now()))
          setShowInstall(false)
        }}
        busy={busy}
      />
    )
  }

  return null
}

function Banner({
  title,
  body,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  busy,
}: {
  title: string
  body: string
  primaryLabel: string
  secondaryLabel: string
  onPrimary: () => void | Promise<void>
  onSecondary: () => void
  busy?: boolean
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] p-4 shadow-[0_18px_48px_-18px_rgba(0,0,0,0.55)]">
        <p className="text-[14px] font-bold text-[var(--kura-text)]">{title}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--kura-muted)]">{body}</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onPrimary()}
            className="flex-1 rounded-xl bg-[var(--kura-teal)] py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
          >
            {busy ? 'Working…' : primaryLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onSecondary}
            className="rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[var(--kura-muted)]"
          >
            {secondaryLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
