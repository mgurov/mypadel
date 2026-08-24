import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { fetchProfile, pastRegistrations } from '../api'
import { useAuth } from '../authContext'
import { useSunsetUser } from '../userContext'
import { EloHistoryRow } from './EloHistoryRow'

export function EloHistoryPage() {
  const navigate = useNavigate()
  const { user } = useSunsetUser()
  const { authKey } = useAuth()

  const {
    data: profile,
    error,
    isFetching,
  } = useQuery({
    queryKey: ['profile', authKey],
    queryFn: fetchProfile,
    enabled: user != null,
    placeholderData: keepPreviousData,
  })

  if (!user) return null

  const past = pastRegistrations(profile?.registrations ?? [])

  return (
    <div data-testid="elo-history-page">
      <div className="elo-history-header">
        <Button onClick={() => navigate('/')}>Back</Button>
        <Typography variant="subtitle1">ELO history</Typography>
      </div>
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
            <EloHistoryRow key={registration.id} registration={registration} userId={user.id} />
          ))}
        </ul>
      )}
    </div>
  )
}
