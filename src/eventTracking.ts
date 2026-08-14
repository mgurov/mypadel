const DB_NAME = 'mypadel'
const DB_VERSION = 2
const STORE_NAME = 'known-events'

export type EventSource = 'sunset' | 'meetup'

export interface KnownEventRecord {
  ackedAt?: number
  cancellationAckedAt?: number
}

export function eventKey(source: EventSource, id: string): string {
  return `${source}:${id}`
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      } else {
        request.transaction?.objectStore(STORE_NAME).delete('event-ids')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

let dbPromise: Promise<IDBDatabase> | null = null

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDb()
  }
  return dbPromise
}

export async function loadKnownKeys(): Promise<string[]> {
  try {
    const db = await getDb()
    return await new Promise<string[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.openCursor()
      const keys: string[] = []
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          const record = cursor.value as KnownEventRecord | undefined
          if (record?.ackedAt != null) keys.push(String(cursor.key))
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

export async function addKnownKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) return
  const db = await getDb()
  const transaction = db.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)
  for (const key of keys) {
    const existing = await getRecord(store, key)
    store.put({ ackedAt: Date.now(), cancellationAckedAt: existing?.cancellationAckedAt } satisfies KnownEventRecord, key)
  }
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function isCancellationAcked(key: string): Promise<boolean> {
  try {
    const db = await getDb()
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const record = await getRecord(transaction.objectStore(STORE_NAME), key)
    return record?.cancellationAckedAt != null
  } catch {
    return false
  }
}

export async function ackCancellation(key: string): Promise<void> {
  const db = await getDb()
  const transaction = db.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)
  const existing = await getRecord(store, key)
  store.put({ ackedAt: existing?.ackedAt, cancellationAckedAt: Date.now() } satisfies KnownEventRecord, key)
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function trackFetchedKeys(fetchedKeys: string[]): Promise<string[]> {
  const known = await loadKnownKeys()
  if (known.length === 0) {
    await addKnownKeys(fetchedKeys)
    return []
  }
  const knownSet = new Set(known)
  return fetchedKeys.filter((key) => !knownSet.has(key))
}