import { useState } from 'react'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import type { MeetupEvent } from '../api'
import { downloadMeetupEventIcs } from '../ics'

export function MeetupDetailCell({ event, onSelect }: { event: MeetupEvent; onSelect?: () => void }) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)

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
      </Menu>
    </div>
  )
}
