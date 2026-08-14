import type { Event, MeetupEvent } from '../api'
import { eventKey } from '../eventTracking'
import { SunsetRow } from './EventsTable'
import { MeetupRow } from './MeetupTable'

export type CombinedEntry =
  | { source: 'sunset'; event: Event }
  | { source: 'wolfgang'; event: MeetupEvent }
  | { source: 'meetup'; event: MeetupEvent }

const SOURCE_LABELS: Record<CombinedEntry['source'], string> = {
  sunset: 'Sunset',
  wolfgang: 'Wolfgang',
  meetup: 'Meetup',
}

function entryTime(entry: CombinedEntry): number {
  return entry.source === 'sunset'
    ? new Date(entry.event.date).getTime()
    : new Date(entry.event.dateTime).getTime()
}

export function CombinedTable({ entries, newIds, urgentUnpaidIds, onAck }: { entries: CombinedEntry[]; newIds: ReadonlySet<string>; urgentUnpaidIds: ReadonlySet<string>; onAck: (entry: CombinedEntry) => void }) {
  const sorted = [...entries].sort((a, b) => entryTime(a) - entryTime(b))
  return (
    <div className="events-table">
      {sorted.map((entry) => (
        <div key={`${entry.source}-${entry.event.id}`} className="table-row-group">
          {entry.source === 'sunset' ? (
            <SunsetRow event={entry.event} label={SOURCE_LABELS.sunset} isNew={newIds.has(eventKey('sunset', entry.event.id))} urgentUnpaid={urgentUnpaidIds.has(entry.event.id)} onAck={() => onAck(entry)} />
          ) : (
            <MeetupRow event={entry.event} label={SOURCE_LABELS[entry.source]} isNew={newIds.has(eventKey('meetup', entry.event.id))} onAck={() => onAck(entry)} />
          )}
        </div>
      ))}
    </div>
  )
}
