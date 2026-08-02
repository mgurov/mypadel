import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import { api, EVENT_DETAILS_URL, type EventDetail } from '../api'

export function EventDetailCell({ eventId, userId }: { eventId: string; userId: string | undefined }) {
  const [jsonOpen, setJsonOpen] = useState(false)

  const { data: detail } = useQuery<EventDetail>({
    queryKey: ['eventDetail', eventId],
    queryFn: async () => {
      const { data } = await api.get<EventDetail>(`${EVENT_DETAILS_URL}?id=${eventId}`)
      return data
    },
  })

  const isParticipating = detail?.participants?.some(p => p.userId === userId) ?? false

  return (
    <>
      <div className="column">
        {detail ? (
          isParticipating
            ? <span className="participating-yes">&#10003;{detail.currentUserPayment != null && <span className="payment-indicator"> $</span>}</span>
            : <span className="participating-no">&mdash;</span>
        ) : (
          <span className="loading-text">loading...</span>
        )}
      </div>
      <div className="column">
        {detail && (
          <Button variant="outlined" size="small" onClick={() => setJsonOpen(true)}>
            Show JSON
          </Button>
        )}
        <div>
          <a href={`https://sunsetpadel.at/events/${eventId}`} target="_blank" rel="noopener noreferrer">Open Event</a>
        </div>
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
