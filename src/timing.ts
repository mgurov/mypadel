export function hasStarted(start: string, now: Date = new Date()): boolean {
  return new Date(start).getTime() <= now.getTime()
}

export function hasEnded(end: string, now: Date = new Date()): boolean {
  return new Date(end).getTime() <= now.getTime()
}

export function isLive(start: string, end: string, now: Date = new Date()): boolean {
  return hasStarted(start, now) && !hasEnded(end, now)
}
