const DB_NAME = 'mypadel'
const DB_VERSION = 2
const STORE_NAME = 'known-events'

export type EventSource = 'sunset' | 'meetup'

export interface KnownEventRecord {
  ackedAt: number
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
      const request = transaction.objectStore(STORE_NAME).getAllKeys()
      request.onsuccess = () => resolve(request.result.map(String))
      request.onerror = () => reject(request.error)
    })
  } catch {
    return []
  }
}

export async function addKnownKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) return
  const db = await getDb()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    keys.forEach((key) => store.put({ ackedAt: Date.now() } satisfies KnownEventRecord, key))
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
