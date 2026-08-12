import Button from '@mui/material/Button'
import type { Event } from '../api'
import { eventKey } from '../eventTracking'
import { EventDetailCell } from './EventDetailCell'
import { ParticipationCell } from './ParticipationCell'

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-UK', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function SunsetRow({ event, userId, label, isNew, urgentUnpaid, onAck }: { event: Event; userId: string | undefined; label?: string; isNew?: boolean; urgentUnpaid?: boolean; onAck: () => void }) {
  return (
    <div className={`table-row${urgentUnpaid ? ' table-row-highlight' : ''}`}>
      <div className="column margin-right-16">
        {label && <span className={`source-label source-label-${label.toLowerCase()}`}>{label}</span>}
        {isNew && <span className="new-label">new</span>}
        {urgentUnpaid && <span className="unpaid-label">unpaid</span>}
        {formatDate(event.date)}
        {isNew && (
          <Button data-testid="ack-button" size="small" sx={{ ml: 1 }} onClick={onAck}>
            ack
          </Button>
        )}
      </div>
      <EventDetailCell event={event} userId={userId} />
      <div className="column text-align-right">{event.title}</div>
      <div className="column text-align-right no-grow width-56">
        <ParticipationCell participants={event._count?.participants} maxParticipants={event.maxParticipants} />
      </div>
    </div>
  )
}

export function EventsTable({ events, userId, newIds, urgentUnpaidIds, onAck }: { events: Event[]; userId: string | undefined; newIds: ReadonlySet<string>; urgentUnpaidIds: ReadonlySet<string>; onAck: (event: Event) => void }) {
  return (
    <div className="events-table">
      {events.map((event) => (
        <div key={event.id} className="table-row-group">
          <SunsetRow event={event} userId={userId} isNew={newIds.has(eventKey('sunset', event.id))} urgentUnpaid={urgentUnpaidIds.has(event.id)} onAck={() => onAck(event)} />
        </div>
      ))}
    </div>
  )
}
