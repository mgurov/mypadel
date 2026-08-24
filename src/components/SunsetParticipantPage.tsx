import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { keepPreviousData, useQuery, useQueries } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ensureCookieAuth, fetchEventDetail, fetchProfile, pastRegistrations } from '../api'
import { useAuth } from '../authContext'
import { useSunsetUser } from '../userContext'
import { EloHistoryRow } from './EloHistoryRow'

export function SunsetParticipantPage() {
  const navigate = useNavigate()
  const { uid } = useParams()
  const { authKey, credEmail, credPassword, hasCredentials } = useAuth()
  const { setUser } = useSunsetUser()

  const {
    data: profile,
    error,
    isFetching,
  } = useQuery({
    queryKey: ['profile', authKey, credEmail],
    queryFn: async () => {
      try {
        if (hasCredentials) {
          const loggedUser = await ensureCookieAuth(credEmail, credPassword)
          if (loggedUser) setUser(loggedUser)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        throw new Error(`Cookie auth failed: ${msg}`)
      }
      return fetchProfile()
    },
    placeholderData: keepPreviousData,
  })

  const userId = uid ?? ''
  const past = profile ? pastRegistrations(profile.registrations) : []

  const detailQueries = useQueries({
    queries: past.map((registration) => ({
      queryKey: ['eventDetail', registration.eventId],
      queryFn: () => fetchEventDetail(registration.eventId),
    })),
  })

  let participantSummary: { name: string; elo: number } | null = null
  for (const query of detailQueries) {
    const match = query.data?.participants.find((p) => p.userId === userId)
    if (!match) continue
    const full = match.user?.name?.trim()
    const name = full || [match.user?.firstName, match.user?.lastName].filter(Boolean).join(' ').trim()
    participantSummary = { name, elo: match.user.elo }
    break
  }

  return (
    <div data-testid="sunset-participant-page">
      <div className="elo-history-header">
        <Button onClick={() => navigate('/')}>Back</Button>
        <Typography variant="subtitle1">Participant</Typography>
      </div>
      {participantSummary && (
        <Typography variant="subtitle1" data-testid="sunset-participant-summary">
          {participantSummary.name} &middot; ELO {participantSummary.elo}
        </Typography>
      )}
      <Typography variant="body2" color="text.secondary" data-testid="sunset-participant-uid">
        {userId}
      </Typography>
      {error && (
        <Alert severity="error" data-testid="sunset-participant-error">
          {`Failed to fetch profile: ${error.message}`}
        </Alert>
      )}
      {!error && isFetching && !profile && (
        <div className="elo-history-loading" data-testid="sunset-participant-loading">
          <CircularProgress size={24} />
        </div>
      )}
      {!error && profile && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {past.length} finished events
          </Typography>
          {past.length === 0 ? (
            <Typography sx={{ mt: 1 }} data-testid="sunset-participant-empty">
              No finished events yet
            </Typography>
          ) : (
            <ul className="elo-history-list" data-testid="sunset-participant-list">
              {past.map((registration) => (
                <EloHistoryRow key={registration.id} registration={registration} userId={userId} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
