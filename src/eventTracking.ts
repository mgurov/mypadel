import { RSVP_STATE_NOT_OPEN_YET } from './meetup'
import { getDb, KNOWN_EVENTS_STORE } from './db'

export type EventSource = 'sunset' | 'meetup'

export type ForcedAttendance = 'yes' | 'no'

export interface KnownEventRecord {
  ackedAt?: number
  cancellationAckedAt?: number
  rsvpState?: string
  forcedAttendance?: ForcedAttendance
}

export interface FetchedKey {
  key: string
  rsvpState?: string
}

export function eventKey(source: EventSource, id: string): string {
  return `${source}:${id}`
}

export async function loadKnownKeys(): Promise<string[]> {
  try {
    const db = await getDb()
    return await new Promise<string[]>((resolve, reject) => {
      const transaction = db.transaction(KNOWN_EVENTS_STORE, 'readonly')
      const store = transaction.objectStore(KNOWN_EVENTS_STORE)
      const request = store.openCursor()
      const keys: string[] = []
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          const record = cursor.value as KnownEventRecord | undefined
          if (record?.ackedAt != null && typeof cursor.key === 'string') keys.push(cursor.key)
          cursor.continue()
        } else {
          resolve(keys)
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch {
    return []
  }
}

function getRecord(store: IDBObjectStore, key: string): Promise<KnownEventRecord | undefined> {
  return new Promise((resolve, reject) => {
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result as KnownEventRecord | undefined)
    request.onerror = () => reject(request.error)
  })
}

export async function loadForcedAttendance(): Promise<Map<string, ForcedAttendance>> {
  try {
    const db = await getDb()
    const result = await new Promise<Map<string, ForcedAttendance>>((resolve, reject) => {
      const transaction = db.transaction(KNOWN_EVENTS_STORE, 'readonly')
      const store = transaction.objectStore(KNOWN_EVENTS_STORE)
      const request = store.openCursor()
      const found = new Map<string, ForcedAttendance>()
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          const record = cursor.value as KnownEventRecord | undefined
          if (record?.forcedAttendance && typeof cursor.key === 'string') {
            found.set(cursor.key, record.forcedAttendance)
          }
          cursor.continue()
        } else {
          resolve(found)
        }
      }
      request.onerror = () => reject(request.error)
    })
    return result
  } catch {
    return new Map()
  }
}

export async function setForcedAttendance(key: string, value: ForcedAttendance | undefined): Promise<void> {
  const db = await getDb()
  const transaction = db.transaction(KNOWN_EVENTS_STORE, 'readwrite')
  const store = transaction.objectStore(KNOWN_EVENTS_STORE)
  const existing = (await getRecord(store, key)) ?? {}
  const record: KnownEventRecord = {
    ackedAt: existing.ackedAt,
    cancellationAckedAt: existing.cancellationAckedAt,
    rsvpState: existing.rsvpState,
    forcedAttendance: value,
  }
  if (record.forcedAttendance === undefined) delete record.forcedAttendance
  store.put(record, key)
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function addKnownKeys(records: FetchedKey[]): Promise<void> {
  if (records.length === 0) return
  const db = await getDb()
  const transaction = db.transaction(KNOWN_EVENTS_STORE, 'readwrite')
  const store = transaction.objectStore(KNOWN_EVENTS_STORE)
  for (const { key, rsvpState } of records) {
    const existing = await getRecord(store, key)
    store.put(
      {
        ackedAt: Date.now(),
        cancellationAckedAt: existing?.cancellationAckedAt,
        rsvpState: rsvpState ?? existing?.rsvpState,
        forcedAttendance: existing?.forcedAttendance,
      } satisfies KnownEventRecord,
      key,
    )
  }
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function isCancellationAcked(key: string): Promise<boolean> {
  try {
    const db = await getDb()
    const transaction = db.transaction(KNOWN_EVENTS_STORE, 'readonly')
    const record = await getRecord(transaction.objectStore(KNOWN_EVENTS_STORE), key)
    return record?.cancellationAckedAt != null
  } catch {
    return false
  }
}

export async function ackCancellation(key: string): Promise<void> {
  const db = await getDb()
  const transaction = db.transaction(KNOWN_EVENTS_STORE, 'readwrite')
  const store = transaction.objectStore(KNOWN_EVENTS_STORE)
  const existing = await getRecord(store, key)
  store.put(
    {
      ackedAt: existing?.ackedAt,
      cancellationAckedAt: Date.now(),
      rsvpState: existing?.rsvpState,
      forcedAttendance: existing?.forcedAttendance,
    } satisfies KnownEventRecord,
    key,
  )
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function trackFetchedKeys(fetchedKeys: FetchedKey[]): Promise<string[]> {
  const known = await loadKnownKeys()
  if (known.length === 0) {
    await addKnownKeys(fetchedKeys)
    return []
  }
  const knownSet = new Set(known)
  const db = await getDb()
  const transaction = db.transaction(KNOWN_EVENTS_STORE, 'readonly')
  const store = transaction.objectStore(KNOWN_EVENTS_STORE)
  const found: string[] = []
  for (const { key, rsvpState } of fetchedKeys) {
    if (!knownSet.has(key)) {
      found.push(key)
      continue
    }
    if (rsvpState === undefined) continue
    const record = await getRecord(store, key)
    if (record?.rsvpState === RSVP_STATE_NOT_OPEN_YET && rsvpState !== RSVP_STATE_NOT_OPEN_YET) {
      found.push(key)
    }
  }
  return found
}