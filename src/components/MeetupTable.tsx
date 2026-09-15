import Button from '@mui/material/Button'
import type { MeetupEvent } from '../api'
import { groupByDate } from '../dateGrouping'
import { eventKey } from '../eventTracking'
import { isMyRsvp, formatAttendance, formatRsvpState, RSVP_STATE_JOIN_OPEN, attendanceState } from '../meetup'
import { hasEnded, isLive } from '../timing'
import { MeetupDetailCell } from './MeetupDetailCell'

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-UK', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MeetupRow({ event, label, isNew, onAck, selectedKey, onSelect }: { event: MeetupEvent; label?: string; isNew?: boolean; onAck: () => void; selectedKey?: string; onSelect?: (key: string) => void }) {
  const ended = hasEnded(event.endTime)
  const live = isLive(event.dateTime, event.endTime)
  const attending = isMyRsvp(event)
  const attendance = attendanceState(event)
  const rsvpClosed = event.rsvpState !== undefined && event.rsvpState !== RSVP_STATE_JOIN_OPEN

  const myKey = eventKey('meetup', event.id)
  const isSelected = selectedKey === myKey

  const rowClass = [
    'table-row',
    live && attending ? 'table-row-live' : '',
    ended ? 'table-row-ended' : '',
    isSelected ? 'table-row-selected' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={rowClass}>
      <div className="column margin-right-16">
        {label && <span className={`source-label source-label-${label.toLowerCase()}`}>{label}</span>}
        {isNew && <span className="new-label">new</span>}
        {rsvpClosed && <span className="rsvp-state-label" data-testid="rsvp-state-label">{formatRsvpState(event.rsvpState)}</span>}
        {formatDate(event.dateTime)}
        {isNew && (
          <Button data-testid="ack-button" size="small" sx={{ ml: 1 }} onClick={onAck}>
            ack
          </Button>
        )}
      </div>
      <div className="column no-grow width-28">
        {attendance === 'yes' ? (
          <span className="participating-yes">&#10003;</span>
        ) : attendance === 'uncertain' ? (
          <span className="participating-question">?</span>
        ) : (
          <span className="participating-no">&mdash;</span>
        )}
      </div>
      <div className="column">{event.title}</div>
      <div className="column text-align-right margin-right-16 no-grow">{formatAttendance(event)}</div>
      <MeetupDetailCell event={event} onSelect={() => onSelect?.(myKey)} />
    </div>
  )
}

export function MeetupTable({ events, newIds, onAck, selectedKey, onSelect }: { events: MeetupEvent[]; newIds: ReadonlySet<string>; onAck: (event: MeetupEvent) => void; selectedKey?: string; onSelect?: (key: string) => void }) {
  const groups = groupByDate(events, (e) => e.dateTime)
  return (
    <div className="events-table">
      {groups.map((group) => (
        <div key={group.key}>
          <div className="date-group-header">{group.header}</div>
          {group.items.map((event) => (
            <div key={event.id} className="table-row-group">
              <MeetupRow event={event} isNew={newIds.has(eventKey('meetup', event.id))} onAck={() => onAck(event)} selectedKey={selectedKey} onSelect={onSelect} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
