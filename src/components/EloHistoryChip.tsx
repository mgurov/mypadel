import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchProfile, pastRegistrations } from '../api'
import { useAuth } from '../authContext'
import { useSunsetUser } from '../userContext'

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-UK', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getInitials(firstName: string | undefined, lastName: string | undefined): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
}

export function EloHistoryChip() {
  const { user } = useSunsetUser()
  const { authKey } = useAuth()
  const [open, setOpen] = useState(false)

  const {
    data: profile,
    error,
    isFetching,
  } = useQuery({
    queryKey: ['profile', authKey],
    queryFn: fetchProfile,
    enabled: open && user != null,
    placeholderData: keepPreviousData,
  })

  if (!user) return null

  const past = pastRegistrations(profile?.registrations ?? [])

  return (
    <>
      <Chip
        data-testid="user-elo-chip"
        avatar={<Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>{getInitials(user.firstName, user.lastName)}</Avatar>}
        label={`${user.elo}`}
        size="small"
        sx={{ ml: 1 }}
        onClick={() => setOpen(true)}
      />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>ELO history</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" data-testid="elo-history-error">
              {`Failed to fetch profile: ${error.message}`}
            </Alert>
          )}
          {!error && isFetching && !profile && (
            <div className="elo-history-loading" data-testid="elo-history-loading">
              <CircularProgress size={24} />
            </div>
          )}
          {!error && profile && (
            <Typography variant="body2" color="text.secondary">
              Current ELO: <strong>{profile.elo}</strong> · {past.length} past events
            </Typography>
          )}
          {!error && profile && past.length === 0 && (
            <Typography sx={{ mt: 1 }} data-testid="elo-history-empty">
              No finished events yet
            </Typography>
          )}
          {!error && past.length > 0 && (
            <ul className="elo-history-list" data-testid="elo-history-list">
              {past.map((registration) => (
                <li key={registration.id} className="table-row elo-history-row" data-testid="elo-history-row">
                  <div className="column">{formatDate(registration.event.endDate)}</div>
                  <div className="column text-align-right no-grow margin-left-16">{registration.event.title}</div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
