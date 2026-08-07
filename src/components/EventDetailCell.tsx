import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import { api, EVENT_DETAILS_URL, type Event, type EventDetail } from '../api'
import { downloadEventIcs } from '../ics'

export function EventDetailCell({ event, userId }: { event: Event; userId: string | undefined }) {
  const [jsonOpen, setJsonOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const { id: eventId } = event

  const { data: detail, isFetching } = useQuery<EventDetail>({
    queryKey: ['eventDetail', eventId],
    queryFn: async () => {
      const { data } = await api.get<EventDetail>(`${EVENT_DETAILS_URL}?id=${eventId}`)
      return data
    },
  })

  const isParticipating = detail?.participants?.some(p => p.userId === userId) ?? false
  const waitlistPosition = detail?.currentUserWaitlistPosition
  const isWaiting = !isParticipating && waitlistPosition != null && waitlistPosition > 0
  const payment = detail?.currentUserPayment
  const isPaid = payment?.status === 'PAID'
  const isPaymentPending = payment != null && !isPaid

  const closeMenu = () => setMenuAnchor(null)

  return (
    <>
      <div className={`column margin-left-16 no-grow ${isPaymentPending ? 'width-auto' : 'width-28'} participation-cell`}>
        {detail ? (
          isParticipating
            ? (
              <span className="participating-yes">
                &#10003;
                {isPaid && <span className="payment-indicator">$</span>}
                {isPaymentPending && (
                  <span
                    className="payment-indicator payment-indicator-pending"
                    title={`Payment status: ${payment?.status ?? 'unknown'}`}
                  >
                    {payment?.status ?? '?'}
                  </span>
                )}
              </span>
            )
            : isWaiting
              ? <span className="participating-waitlist"><span className="waitlist-icon">&#9203;</span>{waitlistPosition}</span>
              : <span className="participating-no">&mdash;</span>
        ) : (
          <CircularProgress size={16} />
        )}
        {detail && isFetching && <CircularProgress size={12} className="refetch-spinner" />}
      </div>
      <div className="column no-grow">
        <Button
          variant="outlined"
          size="small"
          aria-haspopup="true"
          aria-expanded={Boolean(menuAnchor)}
          onClick={(e) => setMenuAnchor(e.currentTarget)}
        >
          Actions
        </Button>
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={closeMenu}
        >
          <MenuItem onClick={() => { downloadEventIcs(event); closeMenu() }}>
            Add to Calendar
          </MenuItem>
          <MenuItem
            component="a"
            href={`https://sunsetpadel.at/events/${eventId}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeMenu}
          >
            Open Event
          </MenuItem>
          {detail && (
            <MenuItem onClick={() => { setJsonOpen(true); closeMenu() }}>
              Show JSON
            </MenuItem>
          )}
        </Menu>
      </div>
      <Dialog open={jsonOpen} onClose={() => setJsonOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Event Details</DialogTitle>
        <DialogContent>
          <pre className="dialog-json">{detail ? JSON.stringify(detail, null, 2) : ''}</pre>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJsonOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
