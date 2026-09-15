import { getDb, UNAVAILABLE_DATES_STORE } from './db'

export interface UnavailableDateRecord {
  markedAt: number
}

export async function loadUnavailableDates(): Promise<Set<string>> {
  try {
    const db = await getDb()
    return await new Promise<Set<string>>((resolve, reject) => {
      const transaction = db.transaction(UNAVAILABLE_DATES_STORE, 'readonly')
      const store = transaction.objectStore(UNAVAILABLE_DATES_STORE)
      const request = store.openCursor()
      const dates = new Set<string>()
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          if (typeof cursor.key === 'string') dates.add(cursor.key)
          cursor.continue()
        } else {
          resolve(dates)
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch {
    return new Set()
  }
}

export async function setUnavailableDate(dateKey: string, unavailable: boolean): Promise<void> {
  const db = await getDb()
  const transaction = db.transaction(UNAVAILABLE_DATES_STORE, 'readwrite')
  const store = transaction.objectStore(UNAVAILABLE_DATES_STORE)
  if (unavailable) {
    store.put({ markedAt: Date.now() } satisfies UnavailableDateRecord, dateKey)
  } else {
    store.delete(dateKey)
  }
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}