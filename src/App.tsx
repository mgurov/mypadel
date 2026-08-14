import { useEffect, useState } from 'react'
import { useQuery, useQueries, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import './App.css'
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import { api, EVENTS_URL, MEETUP_URL, buildMeetupBody, ensureCookieAuth, fetchEventDetail, type Event, type MeetupEvent, type MeetupGraphqlResponse, type User } from './api'
import { CredentialsButton, type Credentials } from './components/CredentialsButton'
import { isHostedByWolfgang, isMyRsvp, isVisibleMeetup } from './meetup'
import { type CombinedEntry } from './components/CombinedTable'
import { EventTables, type TabId } from './components/EventTables'
import { addKnownKeys, eventKey, trackFetchedKeys } from './eventTracking'
import { useSunsetUser } from './userContext'

function App() {
  const [authKey, setAuthKey] = useState(() => localStorage.getItem('myko-auth-key') ?? '')
  const [credEmail, setCredEmail] = useState(() => localStorage.getItem('myko-cred-email') ?? '')
  const [credPassword, setCredPassword] = useState(() => localStorage.getItem('myko-cred-password') ?? '')
  const [authError, setAuthError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('sunset')
  const [newIds, setNewIds] = useState<ReadonlySet<string>>(() => new Set())
  const [showOnlyNew, setShowOnlyNew] = useState<ReadonlySet<TabId>>(() => new Set())
  const [showOnlyAttending, setShowOnlyAttending] = useState(false)

  const queryClient = useQueryClient()
  const { user, setUser } = useSunsetUser()

  const handleFetch = async () => {
    void refetchMeetup().catch(() => {})
    await refetch().catch(() => {})
    void queryClient.refetchQueries({ queryKey: ['eventDetail'] })
  }

  const saveCredentials = (creds: Credentials) => {
    localStorage.setItem('myko-auth-key', creds.authKey)
    localStorage.setItem('myko-cred-email', creds.email)
    localStorage.setItem('myko-cred-password', creds.password)
    setAuthKey(creds.authKey)
    setCredEmail(creds.email)
    setCredPassword(creds.password)
  }

  const hasCredentials = credEmail !== '' && credPassword !== ''
  const credentialsComplete = authKey !== '' && credEmail !== '' && credPassword !== ''

  const { data: events, error, refetch, isFetching } = useQuery<Event[]>({
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
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return data.filter(e => !e.title.startsWith('Ladies Night') && new Date(e.date) >= startOfToday && e.status != "ARCHIVED")
    },
    enabled: false,
    placeholderData: keepPreviousData,
  })

  const {
    data: meetupEvents,
    error: meetupError,
    refetch: refetchMeetup,
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

  useEffect(() => {
    if (events === undefined || meetupEvents === undefined) return
    const fetchedKeys = [
      ...events.map((event) => eventKey('sunset', event.id)),
      ...meetupEvents.filter(isVisibleMeetup).map((event) => eventKey('meetup', event.id)),
    ]
    if (fetchedKeys.length === 0) return
    void trackFetchedKeys(fetchedKeys).then((found) => {
      if (found.length === 0) return
      setNewIds((prev) => {
        const next = new Set(prev)
        found.forEach((key) => next.add(key))
        return next
      })
    })
  }, [events, meetupEvents])

  const getInitials = (u: User) => `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() //TODO: extract the avatar into a component;
  const fetching = isFetching || meetupIsFetching

  const visibleMeetup = (meetupEvents ?? []).filter(isVisibleMeetup)
  const wolfgangEvents = visibleMeetup.filter(isHostedByWolfgang)
  const otherMeetupEvents = visibleMeetup.filter((event) => !isHostedByWolfgang(event))

  const attendingSunsetIds = new Set<string>()
  for (const query of sunsetDetailQueries) {
    const detail = query.data
    if (detail === undefined) continue
    const attends =
      detail.participants.some((p) => p.userId === user?.id) ||
      (detail.currentUserWaitlistPosition != null && detail.currentUserWaitlistPosition > 0)
    if (attends) attendingSunsetIds.add(detail.id)
  }

  const sunsetList = showOnlyAttending ? (events ?? []).filter((event) => attendingSunsetIds.has(event.id)) : (events ?? [])
  const wolfgangList = showOnlyAttending ? wolfgangEvents.filter(isMyRsvp) : wolfgangEvents
  const meetupList = showOnlyAttending ? otherMeetupEvents.filter(isMyRsvp) : otherMeetupEvents

  const tabCounts: Record<TabId, number> = {
    combined: sunsetList.length + wolfgangList.length + meetupList.length,
    sunset: sunsetList.length,
    wolfgang: wolfgangList.length,
    meetup: meetupList.length,
  }

  const combinedEntries: CombinedEntry[] = [
    ...sunsetList.map((event) => ({ source: 'sunset' as const, event })),
    ...wolfgangList.map((event) => ({ source: 'wolfgang' as const, event })),
    ...meetupList.map((event) => ({ source: 'meetup' as const, event })),
  ]

  const newSunset = sunsetList.filter((event) => newIds.has(eventKey('sunset', event.id)))
  const newWolfgang = wolfgangList.filter((event) => newIds.has(eventKey('meetup', event.id)))
  const newOtherMeetup = meetupList.filter((event) => newIds.has(eventKey('meetup', event.id)))

  const joinedSunset = (events ?? []).filter((event) => attendingSunsetIds.has(event.id))
  const joinedWolfgang = wolfgangEvents.filter(isMyRsvp)
  const joinedMeetup = otherMeetupEvents.filter(isMyRsvp)

  const joinedCounts: Record<TabId, number> = {
    combined: joinedSunset.length + joinedWolfgang.length + joinedMeetup.length,
    sunset: joinedSunset.length,
    wolfgang: joinedWolfgang.length,
    meetup: joinedMeetup.length,
  }

  const newEntries: Record<TabId, CombinedEntry[]> = {
    combined: [
      ...newSunset.map((event) => ({ source: 'sunset' as const, event })),
      ...newWolfgang.map((event) => ({ source: 'wolfgang' as const, event })),
      ...newOtherMeetup.map((event) => ({ source: 'meetup' as const, event })),
    ],
    sunset: newSunset.map((event) => ({ source: 'sunset' as const, event })),
    wolfgang: newWolfgang.map((event) => ({ source: 'wolfgang' as const, event })),
    meetup: newOtherMeetup.map((event) => ({ source: 'meetup' as const, event })),
  }

  const tabNewCounts: Record<TabId, number> = {
    combined: newSunset.length + newWolfgang.length + newOtherMeetup.length,
    sunset: newSunset.length,
    wolfgang: newWolfgang.length,
    meetup: newOtherMeetup.length,
  }

  const ackKeys = (keys: string[]) => {
    if (keys.length === 0) return
    setNewIds((prev) => {
      if (!keys.some((key) => prev.has(key))) return prev
      const next = new Set(prev)
      keys.forEach((key) => next.delete(key))
      return next
    })
    void addKnownKeys(keys)
  }

  const toggleOnlyNew = (id: TabId) => {
    setShowOnlyNew((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const hasFetched = events !== undefined || meetupEvents !== undefined

  const tabHasData: Record<TabId, boolean> = {
    combined: events !== undefined && meetupEvents !== undefined,
    sunset: events !== undefined,
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
          <Button data-testid="fetch-events-button" variant={credentialsComplete ? 'contained' : 'outlined'} onClick={handleFetch} disabled={fetching}>
            {fetching ? 'Loading...' : 'Fetch'}
          </Button>
          {user && (
            <Chip
              data-testid="user-elo-chip"
              avatar={<Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>{getInitials(user)}</Avatar>}
              label={`${user.elo}`}
              size="small"
              sx={{ ml: 1 }}
            />
          )}
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
            activeTab={activeTab}
            onTabChange={setActiveTab}
            user={user}
            tabCounts={tabCounts}
            tabNewCounts={tabNewCounts}
            tabHasData={tabHasData}
            tabFetching={tabFetching}
            joinedCounts={joinedCounts}
            showOnlyAttending={showOnlyAttending}
            onToggleAttending={() => setShowOnlyAttending((v) => !v)}
            showOnlyNew={showOnlyNew}
            onToggleOnlyNew={toggleOnlyNew}
            newIds={newIds}
            combinedEntries={combinedEntries}
            newEntries={newEntries}
            sunsetEvents={sunsetList}
            newSunsetEvents={newSunset}
            wolfgangEvents={wolfgangList}
            newWolfgangEvents={newWolfgang}
            meetupEvents={meetupList}
            newMeetupEvents={newOtherMeetup}
            onAckKeys={ackKeys}
          />
        )}
      </section>
    </>
  )
}

export default App
