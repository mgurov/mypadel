const DB_NAME = 'mypadel'
const DB_VERSION = 3

export const KNOWN_EVENTS_STORE = 'known-events'
export const UNAVAILABLE_DATES_STORE = 'unavailable-dates'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(KNOWN_EVENTS_STORE)) {
        db.createObjectStore(KNOWN_EVENTS_STORE)
      } else {
        request.transaction?.objectStore(KNOWN_EVENTS_STORE).delete('event-ids')
      }
      if (!db.objectStoreNames.contains(UNAVAILABLE_DATES_STORE)) {
        db.createObjectStore(UNAVAILABLE_DATES_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

let dbPromise: Promise<IDBDatabase> | null = null

export function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDb()
  }
  return dbPromise
}