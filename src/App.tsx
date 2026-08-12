import { useEffect, useState } from 'react'
import { useQuery, useQueries, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import './App.css'
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import { api, EVENTS_URL, MEETUP_URL, buildMeetupBody, ensureCookieAuth, fetchEventDetail, type Event, type MeetupEvent, type MeetupGraphqlResponse, type User } from './api'
import { CredentialsButton, type Credentials } from './components/CredentialsButton'
import { EventsTable } from './components/EventsTable'
import { MeetupTable } from './components/MeetupTable'
import { isHostedByWolfgang, isMyRsvp, isVisibleMeetup } from './meetup'
import { CombinedTable, type CombinedEntry } from './components/CombinedTable'
import { AckAllButton } from './components/AckAllButton'
import { OnlyNewToggle } from './components/OnlyNewToggle'
import { OnlyAttendingToggle } from './components/OnlyAttendingToggle'
import { addKnownKeys, eventKey, trackFetchedKeys } from './eventTracking'

type TabId = 'combined' | 'sunset' | 'wolfgang' | 'meetup'

const TAB_IDS: TabId[] = ['combined', 'sunset', 'wolfgang', 'meetup']

function App() {
  const [authKey, setAuthKey] = useState(() => localStorage.getItem('myko-auth-key') ?? '')
  const [credEmail, setCredEmail] = useState(() => localStorage.getItem('myko-cred-email') ?? '')
  const [credPassword, setCredPassword] = useState(() => localStorage.getItem('myko-cred-password') ?? '')
  const [authError, setAuthError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('sunset')
  const [newIds, setNewIds] = useState<ReadonlySet<string>>(() => new Set())
  const [showOnlyNew, setShowOnlyNew] = useState<ReadonlySet<TabId>>(() => new Set())
  const [showOnlyAttending, setShowOnlyAttending] = useState(false)

  const queryClient = useQueryClient()

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

  const getInitials = (u: User) => `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase()
  const fetching = isFetching || meetupIsFetching

  const visibleMeetup = (meetupEvents ?? []).filter(isVisibleMeetup)
  const wolfgangEvents = visibleMeetup.filter(isHostedByWolfgang)
  const otherMeetupEvents = visibleMeetup.filter((event) => !isHostedByWolfgang(event))

  const now = Date.now()
  const DAY_MS = 24 * 60 * 60 * 1000
  const attendingSunsetIds = new Set<string>()
  const urgentUnpaidSunsetIds = new Set<string>()
  for (const query of sunsetDetailQueries) {
    const detail = query.data
    if (detail === undefined) continue
    const attends =
      detail.participants.some((p) => p.userId === user?.id) ||
      (detail.currentUserWaitlistPosition != null && detail.currentUserWaitlistPosition > 0)
    if (attends) attendingSunsetIds.add(detail.id)
    if (
      attends &&
      new Date(detail.date).getTime() - now < DAY_MS &&
      detail.currentUserPayment?.status !== 'PAID'
    ) {
      urgentUnpaidSunsetIds.add(detail.id)
    }
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

  const entryKey = (entry: CombinedEntry): string =>
    eventKey(entry.source === 'sunset' ? 'sunset' : 'meetup', entry.event.id)

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

  const ackEntry = (entry: CombinedEntry) => ackKeys([entryKey(entry)])
  const ackSunsetEvent = (event: Event) => ackKeys([eventKey('sunset', event.id)])
  const ackMeetupEvent = (event: MeetupEvent) => ackKeys([eventKey('meetup', event.id)])

  const toggleOnlyNew = (id: TabId) => {
    setShowOnlyNew((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filterActive = (id: TabId) => showOnlyNew.has(id) && tabNewCounts[id] > 0

  const tabLabel: Record<TabId, string> = {
    combined: 'Combined',
    sunset: 'Sunset',
    wolfgang: 'Wolfgang',
    meetup: 'Meetup',
  }

  const tabColor: Record<TabId, string> = {
    combined: '#6b6375',
    sunset: '#aa3bff',
    wolfgang: '#2e7d32',
    meetup: '#1976d2',
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
          <Tabs
            value={activeTab}
            onChange={(_e, value: TabId) => setActiveTab(value)}
            variant="fullWidth"
            sx={{
              width: '100%',
              maxWidth: 900,
              '& .MuiTabs-indicator': { display: 'none' },
            }}
          >
            {TAB_IDS.map((id) => (
              <Tab
                key={id}
                value={id}
                data-testid={`tab-${id}`}
                sx={{
                  backgroundColor: tabColor[id],
                  color: '#fff',
                  opacity: activeTab === id ? 1 : 0.65,
                  '&:hover': { color: '#fff', opacity: 1 },
                  '&.Mui-selected': { color: '#fff', backgroundColor: tabColor[id] },
                }}
                label={
                  <span className="tab-label">
                    {`${tabLabel[id]}${tabHasData[id] ? ` (${tabCounts[id]})` : ''}`}
                    {tabNewCounts[id] > 0 && (
                      <span data-testid={`tab-new-${id}`} className="new-badge">{tabNewCounts[id]}</span>
                    )}
                    {tabFetching[id] && <CircularProgress size={12} sx={{ color: 'rgba(255, 255, 255, 0.9)' }} />}
                  </span>
                }
              />
            ))}
          </Tabs>
        )}

        {hasFetched && (
          <>
            <div className="tab-controls">
              {joinedCounts[activeTab] > 0 && (
                <OnlyAttendingToggle active={showOnlyAttending} disabled={user === null} onToggle={() => setShowOnlyAttending((v) => !v)} />
              )}
              {tabNewCounts[activeTab] > 0 && (
                <>
                  <OnlyNewToggle active={filterActive(activeTab)} onToggle={() => toggleOnlyNew(activeTab)} />
                  <AckAllButton count={tabNewCounts[activeTab]} onAckAll={() => ackKeys(newEntries[activeTab].map(entryKey))} />
                </>
              )}
            </div>

            {activeTab === 'combined' && combinedEntries.length > 0 && (
              <CombinedTable entries={filterActive('combined') ? newEntries.combined : combinedEntries} userId={user?.id} newIds={newIds} urgentUnpaidIds={urgentUnpaidSunsetIds} onAck={ackEntry} />
            )}

            {activeTab === 'sunset' && sunsetList.length > 0 && (
              <EventsTable events={filterActive('sunset') ? newSunset : sunsetList} userId={user?.id} newIds={newIds} urgentUnpaidIds={urgentUnpaidSunsetIds} onAck={ackSunsetEvent} />
            )}

            {activeTab === 'wolfgang' && wolfgangList.length > 0 && (
              <MeetupTable events={filterActive('wolfgang') ? newWolfgang : wolfgangList} newIds={newIds} onAck={ackMeetupEvent} />
            )}

            {activeTab === 'meetup' && meetupList.length > 0 && (
              <MeetupTable events={filterActive('meetup') ? newOtherMeetup : meetupList} newIds={newIds} onAck={ackMeetupEvent} />
            )}
          </>
        )}
      </section>
    </>
  )
}

export default App
