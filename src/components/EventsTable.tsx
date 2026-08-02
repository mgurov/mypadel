import type { Event } from '../api'
import { EventDetailCell } from './EventDetailCell'
import { ParticipationCell } from './ParticipationCell'

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-UK', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function EventsTable({ events, userId }: { events: Event[]; userId: string | undefined }) {
  return (
    <div className="events-table">
      {events.map((event) => (
        <div key={event.id} className="table-row-group">
          <div className="table-row">
            <div className="column">{event.title}</div>
            <div className="column">{formatDate(event.date)}</div>
            <div className="column">
              <ParticipationCell participants={event._count?.participants} maxParticipants={event.maxParticipants} />
            </div>
            <EventDetailCell event={event} userId={userId} />
          </div>
        </div>
      ))}
    </div>
  )
}
