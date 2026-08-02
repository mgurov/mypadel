import type { Event } from './api'

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function icsDateTime(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(iso)
  if (!m) return ''
  return `${m[1]}${m[2]}${m[3]}T${m[4]}${m[5]}${m[6] ?? '00'}`
}

function icsUtcTimestamp(date = new Date()): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
}

function foldLine(line: string): string {
  if (line.length <= 75) return line
  let out = ''
  let rest = line
  while (rest.length > 75) {
    out += rest.slice(0, 74) + '\r\n '
    rest = rest.slice(74)
  }
  return out + rest
}

export function buildEventIcs(event: Event): string {
  const start = icsDateTime(event.date)
  const end = event.endDate ? icsDateTime(event.endDate) : ''
  //TODO: remove the disclaimer as not important.
  const details = [event.description, event.price ? `Price: ${event.price}` : '', event.disclaimer]
    .filter(Boolean)
    .join('\n')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//mypadel//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@mypadel`,
    `DTSTAMP:${icsUtcTimestamp()}`,
    `DTSTART:${start}`,
    ...(end && end > start ? [`DTEND:${end}`] : []),
    `SUMMARY:${escapeText(event.title)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    ...(details ? [`DESCRIPTION:${escapeText(details)}`] : []),
    `URL:https://sunsetpadel.at/events/${event.id}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return lines.map(foldLine).join('\r\n')
}

export function eventIcsFilename(event: Event): string {
  const safe = event.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
  return `${safe || 'event'}.ics`
}
