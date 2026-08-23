import { useQuery, useQueries, keepPreviousData } from '@tanstack/react-query'
import './App.css'
import Alert from '@mui/material/Alert';
import { api, EVENTS_URL, MEETUP_URL, buildMeetupBody, ensureCookieAuth, fetchEventDetail, type Event, type MeetupEvent, type MeetupGraphqlResponse } from './api'
import { CredentialsButton } from './components/CredentialsButton'
import { FetchButton } from './components/FetchButton'
import { EventTables, type TabId } from './components/EventTables'
import { EloHistoryChip } from './components/EloHistoryChip'
import { useSunsetUser } from './userContext'
import { useAuth } from './authContext'

function App() {
  const { user, setUser } = useSunsetUser()
  const { authKey, credEmail, credPassword, authError, setAuthError, saveCredentials, hasCredentials } = useAuth()

  const { data: events, error, isFetching } = useQuery<Event[]>({
    queryKey: ['events', authKey, credEmail],
    queryFn: async () => {
      setAuthError(null)
      try {
        if (hasCredentials) {
          const loggedUser = await ensureCookieAuth(credEmail, credPassword)
          if (loggedUser) setUser(loggedUser)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setAuthError(msg)
        throw new Error(`Cookie auth failed: ${msg}`)
      }
      const { data } = await api.get<Event[]>(EVENTS_URL)
      return data
    },
    enabled: false,
    placeholderData: keepPreviousData,
  })

  const {
    data: meetupEvents,
    error: meetupError,
    isFetching: meetupIsFetching,
  } = useQuery<MeetupEvent[]>({
    queryKey: ['meetupEvents', authKey],
    queryFn: async () => {
      const { data } = await api.post<MeetupGraphqlResponse>(MEETUP_URL, buildMeetupBody())
      return data.data.groupByUrlname.events.edges.map((edge) => edge.node)
    },
    enabled: false,
    placeholderData: keepPreviousData,
  })

  const sunsetDetailQueries = useQueries({
    queries: (events ?? []).map((event) => ({
      queryKey: ['eventDetail', event.id],
      queryFn: () => fetchEventDetail(event.id),
    })),
  })

  const attendingSunsetIds = new Set<string>()
  for (const query of sunsetDetailQueries) {
    const detail = query.data
    if (detail === undefined) continue
    const attends =
      detail.participants.some((p) => p.userId === user?.id) ||
      (detail.currentUserWaitlistPosition != null && detail.currentUserWaitlistPosition > 0)
    if (attends) attendingSunsetIds.add(detail.id)
  }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const filteredEvents = events?.filter(
    (e) =>
      !e.title.startsWith('Ladies Night') &&
      new Date(e.date) >= startOfToday &&
      (e.status !== "ARCHIVED" || attendingSunsetIds.has(e.id))
  )

  const hasFetched = filteredEvents !== undefined || meetupEvents !== undefined

  const tabHasData: Record<TabId, boolean> = {
    combined: filteredEvents !== undefined && meetupEvents !== undefined,
    sunset: filteredEvents !== undefined,
    wolfgang: meetupEvents !== undefined,
    meetup: meetupEvents !== undefined,
  }

  const tabFetching: Record<TabId, boolean> = {
    combined: isFetching || meetupIsFetching,
    sunset: isFetching,
    wolfgang: meetupIsFetching,
    meetup: meetupIsFetching,
  }

  return (
    <>
      <section id="center">
        <div className="button-row">
          <CredentialsButton authKey={authKey} email={credEmail} password={credPassword} onSave={saveCredentials} />
          <FetchButton />
          <EloHistoryChip />
        </div>

        {authError && (
          <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
            {`Cookie auth failed: ${authError}`}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
            {`Failed to fetch events: ${error.message}`}
          </Alert>
        )}

        {meetupError && (
          <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
            {`Failed to fetch meetup events: ${meetupError.message}`}
          </Alert>
        )}

        {hasFetched && (
          <EventTables
            user={user}
            sunsetEvents={filteredEvents}
            meetupEvents={meetupEvents}
            attendingSunsetIds={attendingSunsetIds}
            tabHasData={tabHasData}
            tabFetching={tabFetching}
          />
        )}
      </section>
    </>
  )
}

export default App
