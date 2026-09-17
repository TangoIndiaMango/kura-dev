import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import {
  DEFAULT_OPERATOR_SETTINGS,
  type OperatorAccountSettings,
  type OperatorNotification,
} from './operatorTypes'

const PREFS_KEY = 'kura_operator_prefs'
const ENTERED_KEY = 'kura_operator_entered'

type StoredPrefs = {
  settings: OperatorAccountSettings
  email: string | null
  emailVerified: boolean
}

function readEntered(): boolean {
  try {
    return localStorage.getItem(ENTERED_KEY) === '1'
  } catch {
    return false
  }
}

export function markEnteredApp() {
  localStorage.setItem(ENTERED_KEY, '1')
}

export function clearEnteredApp() {
  localStorage.removeItem(ENTERED_KEY)
}

export function hasEnteredApp() {
  return readEntered()
}

export const prefsAtom = atomWithStorage<StoredPrefs>(PREFS_KEY, {
  settings: DEFAULT_OPERATOR_SETTINGS,
  email: null,
  emailVerified: false,
})

/** Ephemeral PWA “apply update” row not server notifications. */
export const pwaUpdateNotificationAtom = atom<OperatorNotification | null>(null)

export function createPwaUpdateNotification(): OperatorNotification {
  return {
    id: 'pwa-apply-update',
    title: 'Update ready',
    body: 'Tap to apply the latest KURA app update.',
    time: 'Now',
    unread: true,
    action: 'apply-update',
  }
}
