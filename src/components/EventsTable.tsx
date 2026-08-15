import { useEffect, useState } from 'react'
import Button from '@mui/material/Button'
import Popover from '@mui/material/Popover'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import type { Event, EventDetail } from '../api'
import { fetchEventDetail } from '../api'
import { cancellationDeadline, isCancellationUrgent } from '../cancellation'
import { ackCancellation, eventKey, isCancellationAcked } from '../eventTracking'
import { hasEnded, isLive } from '../timing'
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

function useCancellationAck(key: string) {
  const [acked, setAcked] = useState(false)
  useEffect(() => {
    let cancelled = false
    void isCancellationAcked(key).then((value) => {
      if (!cancelled) setAcked(value)
    })
    return () => { cancelled = true }
  }, [key])
  const ack = () => {
    void ackCancellation(key).then(() => setAcked(true))
  }
  return { acked, ack }
}

export function SunsetRow({ event, label, isNew, onAck }: { event: Event; label?: string; isNew?: boolean; onAck: () => void }) {
  const { user } = useSunsetUser()
  const key = eventKey('sunset', event.id)
  const { acked: cancellationAcked, ack: ackCancellationNow } = useCancellationAck(key)
  const [cancelAnchor, setCancelAnchor] = useState<HTMLElement | null>(null)
  const { data: detail } = useQuery<EventDetail>({
    queryKey: ['eventDetail', event.id],
    queryFn: () => fetchEventDetail(event.id),
  })
  const participates = detail?.participants.some((p) => p.userId === user?.id) ?? false
  const waitlisted = detail?.currentUserWaitlistPosition != null && detail.currentUserWaitlistPosition > 0
  const attends = participates || waitlisted
  const ended = hasEnded(event.endDate)
  const live = isLive(event.date, event.endDate)
  const urgentCancellation = attends && isCancellationUrgent(event)
  const showCancelLabel = urgentCancellation && !cancellationAcked
  const urgentUnpaid =
    attends &&
    dayjs(event.date).startOf('day').diff(dayjs().startOf('day'), 'day') <= 1 &&
    detail?.currentUserPayment?.status !== 'PAID'

  const rowClass = [
    'table-row',
    urgentUnpaid ? 'table-row-highlight' : '',
    live && attends ? 'table-row-live' : '',
    ended ? 'table-row-ended' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={rowClass}>
      <div className="column margin-right-16">
        {label && <span className={`source-label source-label-${label.toLowerCase()}`}>{label}</span>}
        {isNew && <span className="new-label">new</span>}
        {urgentUnpaid && <span className="unpaid-label">unpaid</span>}
        {showCancelLabel && (
          <span
            className="cancel-label"
            data-testid="cancel-label"
            role="button"
            tabIndex={0}
            aria-expanded={Boolean(cancelAnchor)}
            onClick={(e) => setCancelAnchor(e.currentTarget)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setCancelAnchor(e.currentTarget)
              }
            }}
          >
            cancel 24h
          </span>
        )}
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
      <Popover
        open={Boolean(cancelAnchor)}
        anchorEl={cancelAnchor}
        onClose={() => setCancelAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <div className="cancel-popover">
          <span className="cancel-deadline" data-testid="cancel-deadline">
            free cancel until {formatDate(new Date(cancellationDeadline(event)).toISOString())}
          </span>
          <Button size="small" data-testid="cancel-ack-button" onClick={() => { ackCancellationNow(); setCancelAnchor(null) }}>
            ack
          </Button>
        </div>
      </Popover>
    </div>
  )
}

export function EventsTable({ events, newIds, onAck }: { events: Event[]; newIds: ReadonlySet<string>; onAck: (event: Event) => void }) {
  return (
    <div className="events-table">
      {events.map((event) => (
        <div key={event.id} className="table-row-group">
          <SunsetRow event={event} isNew={newIds.has(eventKey('sunset', event.id))} onAck={() => onAck(event)} />
        </div>
      ))}
    </div>
  )
}
