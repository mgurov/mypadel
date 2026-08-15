import Button from '@mui/material/Button'
import type { MeetupEvent } from '../api'
import { eventKey } from '../eventTracking'
import { isMyRsvp, formatAttendance } from '../meetup'
import { hasEnded, isLive } from '../timing'
import { MeetupDetailCell } from './MeetupDetailCell'

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-UK', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MeetupRow({ event, label, isNew, onAck }: { event: MeetupEvent; label?: string; isNew?: boolean; onAck: () => void }) {
  const ended = hasEnded(event.endTime)
  const live = isLive(event.dateTime, event.endTime)
  const attending = isMyRsvp(event)

  const rowClass = [
    'table-row',
    live && attending ? 'table-row-live' : '',
    ended ? 'table-row-ended' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={rowClass}>
      <div className="column margin-right-16">
        {label && <span className={`source-label source-label-${label.toLowerCase()}`}>{label}</span>}
        {isNew && <span className="new-label">new</span>}
        {formatDate(event.dateTime)}
        {isNew && (
          <Button data-testid="ack-button" size="small" sx={{ ml: 1 }} onClick={onAck}>
            ack
          </Button>
        )}
      </div>
      <div className="column no-grow width-28">
        {isMyRsvp(event) ? (
          <span className="participating-yes">&#10003;</span>
        ) : (
          <span className="participating-no">&mdash;</span>
        )}
      </div>
      <div className="column">{event.title}</div>
      <div className="column text-align-right margin-right-16 no-grow">{formatAttendance(event)}</div>
      <MeetupDetailCell event={event} />
    </div>
  )
}

export function MeetupTable({ events, newIds, onAck }: { events: MeetupEvent[]; newIds: ReadonlySet<string>; onAck: (event: MeetupEvent) => void }) {
  return (
    <div className="events-table">
      {events.map((event) => (
        <div key={event.id} className="table-row-group">
          <MeetupRow event={event} isNew={newIds.has(eventKey('meetup', event.id))} onAck={() => onAck(event)} />
        </div>
      ))}
    </div>
  )
}
