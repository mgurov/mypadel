import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import type { Event } from './api'

dayjs.extend(utc)

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function icsUtcDateTime(iso: string): string {
  return dayjs(iso).utc().format('YYYYMMDDTHHmmss[Z]')
}

function icsUtcTimestamp(): string {
  return dayjs().utc().format('YYYYMMDDTHHmmss[Z]')
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
  const start = dayjs(event.date)
  const end = event.endDate ? dayjs(event.endDate) : null
  const hasEnd = end !== null && end.valueOf() > start.valueOf()
  const details = [event.description, event.price ? `Price: ${event.price}` : '']
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
    `DTSTART:${icsUtcDateTime(event.date)}`,
    ...(hasEnd ? [`DTEND:${icsUtcDateTime(event.endDate!)}`] : []),
    `SUMMARY:${escapeText('M: Padel ' + event.title)}`,
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

export function downloadEventIcs(event: Event): void {
  const blob = new Blob([buildEventIcs(event)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = eventIcsFilename(event)
  a.click()
  URL.revokeObjectURL(url)
}
