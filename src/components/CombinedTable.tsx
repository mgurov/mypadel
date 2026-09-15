import type { Event, MeetupEvent } from '../api'
import { groupByDate } from '../dateGrouping'
import { eventKey, type ForcedAttendance } from '../eventTracking'
import { DateGroupHeader } from './DateGroupHeader'
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

function entryDate(entry: CombinedEntry): string {
  return entry.source === 'sunset' ? entry.event.date : entry.event.dateTime
}

export function CombinedTable({ entries, newIds, onAck, selectedKey, onSelect, forcedAttendance, onForcedAttendance, unavailableDates, onToggleUnavailable }: { entries: CombinedEntry[]; newIds: ReadonlySet<string>; onAck: (entry: CombinedEntry) => void; selectedKey?: string; onSelect?: (key: string) => void; forcedAttendance?: ReadonlyMap<string, ForcedAttendance>; onForcedAttendance?: (key: string, value: ForcedAttendance | undefined) => void; unavailableDates: ReadonlySet<string>; onToggleUnavailable: (dateKey: string) => void }) {
  const sorted = [...entries].sort((a, b) => entryTime(a) - entryTime(b))
  const groups = groupByDate(sorted, entryDate)
  return (
    <div className="events-table">
      {groups.map((group) => (
        <div key={group.key}>
          <DateGroupHeader header={group.header} dateKey={group.key} unavailable={unavailableDates.has(group.key)} onToggleUnavailable={onToggleUnavailable} />
          {group.items.map((entry) => (
            <div key={`${entry.source}-${entry.event.id}`} className="table-row-group">
              {entry.source === 'sunset' ? (
                <SunsetRow event={entry.event} label={SOURCE_LABELS.sunset} isNew={newIds.has(eventKey('sunset', entry.event.id))} onAck={() => onAck(entry)} selectedKey={selectedKey} onSelect={onSelect} unavailable={unavailableDates.has(group.key)} />
              ) : (
                <MeetupRow event={entry.event} label={SOURCE_LABELS[entry.source]} isNew={newIds.has(eventKey('meetup', entry.event.id))} onAck={() => onAck(entry)} selectedKey={selectedKey} onSelect={onSelect} forcedAttendance={forcedAttendance} onForcedAttendance={onForcedAttendance} unavailable={unavailableDates.has(group.key)} />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
