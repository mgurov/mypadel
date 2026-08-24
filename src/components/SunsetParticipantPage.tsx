import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ensureCookieAuth, fetchEventsList, pastRegistrations, type Event, type ProfileRegistration } from '../api'
import { useAuth } from '../authContext'
import { useSunsetUser } from '../userContext'
import { EloHistoryRow } from './EloHistoryRow'

export function SunsetParticipantPage() {
  const navigate = useNavigate()
  const { uid } = useParams()
  const { authKey, credEmail, credPassword, hasCredentials } = useAuth()
  const { setUser } = useSunsetUser()

  const {
    data: events,
    error,
    isFetching,
  } = useQuery<Event[]>({
    queryKey: ['events', authKey, credEmail],
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
      return fetchEventsList()
    },
    placeholderData: keepPreviousData,
  })

  const userId = uid ?? ''
  const registrations: ProfileRegistration[] = (events ?? []).map((event) => ({
    id: event.id,
    createdAt: event.createdAt,
    eventId: event.id,
    userId,
    event: { id: event.id, title: event.title, date: event.date, endDate: event.endDate },
  }))
  const past = pastRegistrations(registrations)

  return (
    <div data-testid="sunset-participant-page">
      <div className="elo-history-header">
        <Button onClick={() => navigate('/')}>Back</Button>
        <Typography variant="subtitle1">Participant</Typography>
      </div>
      <Typography variant="body2" color="text.secondary" data-testid="sunset-participant-uid">
        {userId}
      </Typography>
      {error && (
        <Alert severity="error" data-testid="sunset-participant-error">
          {`Failed to fetch events: ${error.message}`}
        </Alert>
      )}
      {!error && isFetching && !events && (
        <div className="elo-history-loading" data-testid="sunset-participant-loading">
          <CircularProgress size={24} />
        </div>
      )}
      {!error && events && (
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
