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
import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query'
import { eloDeltaForPlayer, fetchEventMatchTable, fetchProfile, pastRegistrations } from '../api'
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

function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`
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

  const past = pastRegistrations(profile?.registrations ?? [])

  const matchTableQueries = useQueries({
    queries: past.map((registration) => ({
      queryKey: ['eventMatchTable', registration.eventId],
      queryFn: () => fetchEventMatchTable(registration.eventId),
      enabled: open && user != null,
    })),
  })

  if (!user) return null

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
              {past.map((registration, i) => {
                const matchTable = matchTableQueries[i]?.data
                const delta = matchTable ? eloDeltaForPlayer(matchTable, user.id) : null
                return (
                  <li key={registration.id} className="table-row elo-history-row" data-testid="elo-history-row">
                    <div className="column">
                      {formatDate(registration.event.endDate)}
                      <div className="elo-history-title">{registration.event.title}</div>
                    </div>
                    <div className="column text-align-right no-grow margin-left-16">
                      {delta != null && (
                        <span
                          data-testid="elo-history-delta"
                          className={
                            delta > 0 ? 'elo-delta-positive' : delta < 0 ? 'elo-delta-negative' : 'elo-delta-zero'
                          }
                        >
                          {formatDelta(delta)}
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
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
