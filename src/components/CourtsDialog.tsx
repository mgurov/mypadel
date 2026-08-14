import { useMemo, useRef, useState } from 'react'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Popover from '@mui/material/Popover'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ToggleButton from '@mui/material/ToggleButton'
import Typography from '@mui/material/Typography'
import type { Participant } from '../api'
import { CourtPlayer } from './CourtPlayer'

const COURT_SIZES = [4, 5] as const

type EventFormatType = 'ladder' | 'king' | 'unknown'

function eventFormatType(description: string | undefined): EventFormatType {
  const d = description?.toLowerCase() ?? ''
  if (d.includes('climb the ladder format')) return 'ladder'
  if (d.includes('king of the court')) return 'king'
  return 'unknown'
}

export function CourtsDialog({ open, participants, waitlistCount, userId, description, onClose }: { open: boolean; participants: Participant[]; waitlistCount: number | undefined; userId: string | undefined; description: string | undefined; onClose: () => void }) {
  const format = eventFormatType(description)
  const [courtSize, setCourtSize] = useState<number>(() => (format === 'king' ? 5 : 4))
  const [showFormatInfo, setShowFormatInfo] = useState(false)
  const formatAnchor = useRef<HTMLDivElement>(null)

  const sorted = useMemo(
    () => [...participants].sort((a, b) => (b.user?.elo ?? 0) - (a.user?.elo ?? 0)),
    [participants],
  )

  const courts = useMemo(() => {
    const groups: Participant[][] = []
    for (let i = 0; i < sorted.length; i += courtSize) {
      groups.push(sorted.slice(i, i + courtSize))
    }
    return groups
  }, [sorted, courtSize])

  const myCourtIndex = userId != null ? courts.findIndex((court) => court.some((p) => p.userId === userId)) : -1

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <div className="court-dialog-title-row">
          <span>Courts</span>
          <div className="court-dialog-title-chips">
            {waitlistCount != null && (
              <Chip label={`Waitlist: ${waitlistCount}`} size="small" color="warning" data-testid="waitlist-count" />
            )}
            <Chip
              label={format}
              size="small"
              ref={formatAnchor}
              data-testid="event-format-indicator"
              onClick={() => setShowFormatInfo((v) => !v)}
            />
          </div>
          <Popover
            open={showFormatInfo}
            anchorEl={formatAnchor.current}
            onClose={() => setShowFormatInfo(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <Typography sx={{ p: 2, maxWidth: 320, whiteSpace: 'pre-wrap' }} data-testid="event-format-description">
              {description?.trim() || 'No description'}
            </Typography>
          </Popover>
        </div>
      </DialogTitle>
      <DialogContent>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={courtSize}
          onChange={(_e, value) => { if (value != null) setCourtSize(value) }}
          aria-label="Players per court"
        >
          {COURT_SIZES.map((size) => (
            <ToggleButton key={size} value={size} data-testid={`court-size-${size}`}>
              {size} per court
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <div className="courts-grid">
          {courts.map((court, i) => (
            <div key={i} className={`court-card${i === myCourtIndex ? ' court-card-mine' : ''}`} data-testid={`court-${i + 1}`}>
              <div className="court-title">Court {i + 1}{i === myCourtIndex && <span className="court-mine-label"> mine</span>}</div>
              <ul className="court-players">
                {court.map((p) => (
                  <CourtPlayer key={p.id} participant={p} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
