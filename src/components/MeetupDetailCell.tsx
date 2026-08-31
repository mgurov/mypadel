import { useState } from 'react'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import type { MeetupEvent } from '../api'
import { downloadMeetupEventIcs } from '../ics'

export function MeetupDetailCell({ event, onSelect }: { event: MeetupEvent; onSelect?: () => void }) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [jsonOpen, setJsonOpen] = useState(false)

  const closeMenu = () => setMenuAnchor(null)

  return (
    <div className="column no-grow">
      <Button
        variant="outlined"
        size="small"
        aria-haspopup="true"
        aria-expanded={Boolean(menuAnchor)}
        data-testid="event-actions-button"
        onClick={(e) => { onSelect?.(); setMenuAnchor(e.currentTarget) }}
      >
        More...
      </Button>
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
      >
        <MenuItem onClick={() => { downloadMeetupEventIcs(event); closeMenu() }}>
          Add to Calendar
        </MenuItem>
        <MenuItem
          component="a"
          href={event.eventUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={closeMenu}
        >
          Open Event
        </MenuItem>
        <MenuItem onClick={() => { setJsonOpen(true); closeMenu() }}>
          Show JSON
        </MenuItem>
      </Menu>
      <Dialog open={jsonOpen} onClose={() => setJsonOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Event Details</DialogTitle>
        <DialogContent>
          <pre className="dialog-json">{JSON.stringify(event, null, 2)}</pre>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJsonOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
