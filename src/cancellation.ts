import type { Event } from './api'

export const FREE_CANCELLATION_HOURS = 24
const HOUR_MS = 60 * 60 * 1000

export function cancellationDeadline(event: Pick<Event, 'freeCancellationUntil' | 'date'>): number {
  if (event.freeCancellationUntil) return new Date(event.freeCancellationUntil).getTime()
  return new Date(event.date).getTime() - FREE_CANCELLATION_HOURS * HOUR_MS
}

export function isCancellationUrgent(event: Pick<Event, 'freeCancellationUntil' | 'date'>, now: Date = new Date()): boolean {
  return cancellationDeadline(event) - now.getTime() < FREE_CANCELLATION_HOURS * HOUR_MS
}
