import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import type { Event, MeetupEvent } from './api'

dayjs.extend(utc)

interface IcsParams {
  id: string
  title: string
  date: string
  endDate?: string | null
  location?: string
  description?: string
  url: string
}

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

function buildIcs(params: IcsParams): string {
  const start = dayjs(params.date)
  const end = params.endDate ? dayjs(params.endDate) : null
  const hasEnd = end !== null && end.valueOf() > start.valueOf()

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//mypadel//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${params.id}@mypadel`,
    `DTSTAMP:${icsUtcTimestamp()}`,
    `DTSTART:${icsUtcDateTime(params.date)}`,
    ...(hasEnd ? [`DTEND:${icsUtcDateTime(params.endDate!)}`] : []),
    `SUMMARY:${escapeText(params.title)}`,
    ...(params.location ? [`LOCATION:${escapeText(params.location)}`] : []),
    ...(params.description ? [`DESCRIPTION:${escapeText(params.description)}`] : []),
    `URL:${params.url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return lines.map(foldLine).join('\r\n')
}

export function buildEventIcs(event: Event): string {
  const details = [event.description, event.price ? `Price: ${event.price}` : '']
    .filter(Boolean)
    .join('\n')

  return buildIcs({
    id: event.id,
    title: 'M: Padel ' + event.title,
    date: event.date,
    endDate: event.endDate,
    location: event.location,
    description: details,
    url: `https://sunsetpadel.at/events/${event.id}`,
  })
}

export function buildMeetupEventIcs(event: MeetupEvent): string {
  return buildIcs({
    id: event.id,
    title: 'M: Padel ' + event.title,
    date: event.dateTime,
    location: event.venue?.name,
    url: event.eventUrl,
  })
}

function icsFilename(title: string): string {
  const safe = title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
  return `${safe || 'event'}.ics`
}

export function eventIcsFilename(event: Event): string {
  return icsFilename(event.title)
}

export function meetupEventIcsFilename(event: MeetupEvent): string {
  return icsFilename(event.title)
}

function downloadIcs(ics: string, filename: string): void {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadEventIcs(event: Event): void {
  downloadIcs(buildEventIcs(event), eventIcsFilename(event))
}

export function downloadMeetupEventIcs(event: MeetupEvent): void {
  downloadIcs(buildMeetupEventIcs(event), meetupEventIcsFilename(event))
}
