/**
 * Offline hold store using IndexedDB via `idb`.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

const DB_NAME = 'kura-operator-pwa'
const DB_VERSION = 1

export type OfflineHoldRecord = {
  id: string
  code: string
  hubId?: string
  hubName: string
  vehicleLabel: string
  expiresAt: number
  paymentMode: string
  /** Server-signed QR when cached from live booking */
  qr?: string
  cachedAt: number
}

interface KuraOperatorPwaDb extends DBSchema {
  holds: {
    key: string
    value: OfflineHoldRecord
    indexes: { expiresAt: number }
  }
}

let dbPromise: Promise<IDBPDatabase<KuraOperatorPwaDb>> | null = null

function getDb() {
  if (typeof indexedDB === 'undefined') return null
  if (!dbPromise) {
    dbPromise = openDB<KuraOperatorPwaDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('holds')) {
          const store = db.createObjectStore('holds', { keyPath: 'id' })
          store.createIndex('expiresAt', 'expiresAt')
        }
      },
    })
  }
  return dbPromise
}

export async function cacheHoldForOffline(
  hold: Omit<OfflineHoldRecord, 'cachedAt'>,
): Promise<void> {
  const db = await getDb()
  if (!db) return
  await db.put('holds', { ...hold, cachedAt: Date.now() })
}

export async function clearOfflineHold(holdId?: string): Promise<void> {
  const db = await getDb()
  if (!db) return
  if (holdId) await db.delete('holds', holdId)
  else await db.clear('holds')
}

export async function readOfflineHold(): Promise<OfflineHoldRecord | null> {
  const db = await getDb()
  if (!db) return null

  const all = await db.getAll('holds')
  const now = Date.now()
  const live = all
    .filter((h) => h.expiresAt > now)
    .sort((a, b) => b.cachedAt - a.cachedAt)[0]

  const expiredIds = all.filter((h) => h.expiresAt <= now).map((h) => h.id)
  if (expiredIds.length) {
    const tx = db.transaction('holds', 'readwrite')
    await Promise.all([...expiredIds.map((id) => tx.store.delete(id)), tx.done])
  }

  return live ?? null
}
