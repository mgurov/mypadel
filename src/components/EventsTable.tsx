import Button from '@mui/material/Button'
import { useQuery } from '@tanstack/react-query'
import type { Event, EventDetail } from '../api'
import { fetchEventDetail } from '../api'
import { isCancellationUrgent } from '../cancellation'
import { eventKey } from '../eventTracking'
import { useSunsetUser } from '../userContext'
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

export function SunsetRow({ event, label, isNew, urgentUnpaid, onAck }: { event: Event; label?: string; isNew?: boolean; urgentUnpaid?: boolean; onAck: () => void }) {
  const { user } = useSunsetUser()
  const { data: detail } = useQuery<EventDetail>({
    queryKey: ['eventDetail', event.id],
    queryFn: () => fetchEventDetail(event.id),
  })
  const participates = detail?.participants.some((p) => p.userId === user?.id) ?? false
  const waitlisted = detail?.currentUserWaitlistPosition != null && detail.currentUserWaitlistPosition > 0
  const urgentCancellation = (participates || waitlisted) && isCancellationUrgent(event)

  return (
    <div className={`table-row${urgentUnpaid ? ' table-row-highlight' : ''}`}>
      <div className="column margin-right-16">
        {label && <span className={`source-label source-label-${label.toLowerCase()}`}>{label}</span>}
        {isNew && <span className="new-label">new</span>}
        {urgentUnpaid && <span className="unpaid-label">unpaid</span>}
        {urgentCancellation && <span className="cancel-label">cancel 24h</span>}
        {formatDate(event.date)}
        {isNew && (
          <Button data-testid="ack-button" size="small" sx={{ ml: 1 }} onClick={onAck}>
            ack
          </Button>
        )}
      </div>
      <EventDetailCell event={event} />
      <div className="column text-align-right">{event.title}</div>
      <div className="column text-align-right no-grow width-56">
        <ParticipationCell participants={event._count?.participants} maxParticipants={event.maxParticipants} />
      </div>
    </div>
  )
}

export function EventsTable({ events, newIds, urgentUnpaidIds, onAck }: { events: Event[]; newIds: ReadonlySet<string>; urgentUnpaidIds: ReadonlySet<string>; onAck: (event: Event) => void }) {
  return (
    <div className="events-table">
      {events.map((event) => (
        <div key={event.id} className="table-row-group">
          <SunsetRow event={event} isNew={newIds.has(eventKey('sunset', event.id))} urgentUnpaid={urgentUnpaidIds.has(event.id)} onAck={() => onAck(event)} />
        </div>
      ))}
    </div>
  )
}
