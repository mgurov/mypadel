import { useMemo, useState } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ToggleButton from '@mui/material/ToggleButton'
import type { Participant } from '../api'

const COURT_SIZES = [4, 5] as const

function participantName(p: Participant): string {
  const full = p.user?.name?.trim()
  if (full) return full
  return [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim()
}

export function CourtsDialog({ open, participants, userId, onClose }: { open: boolean; participants: Participant[]; userId: string | undefined; onClose: () => void }) {
  const [courtSize, setCourtSize] = useState<number>(4)

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
      <DialogTitle>Courts</DialogTitle>
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
                  <li key={p.id} className="court-player">
                    <span className="court-player-name">{participantName(p)}</span>
                    <span className="court-player-elo">{p.user?.elo}</span>
                  </li>
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
