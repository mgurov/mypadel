import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import axios from 'axios'
import './App.css'
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';


interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  createdAt: string;
  role: string;
  elo: number;
  achievements: string[];
  isPremium: boolean;
}

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  endDate: string;
  location: string;
  status: string;
  publishAt: string | null;
  reminderSentAt: string | null;
  maxParticipants: number;
  price: string;
  disclaimer: string;
  createdAt: string;
  competitionId: string | null;
  formatId: string | null;
  formatConfig: string | null;
  matchTableStatus: string;
  matchTableMode: string;
  matchTableGeneratedAt: string | null;
  matchTableConfirmedAt: string | null;
  _count: {
    participants: number;
  };
}

interface Participant {
  id: string;
  createdAt: string;
  eventId: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    elo: number;
    name: string;
  };
}

interface EventDetail extends Event {
  participants: Participant[];
  currentUserPayment: unknown;
}

const EVENTS_URL = 'https://cpfgugbirflalcjuludp.supabase.co/functions/v1/proxy/.netlify/functions/events'
const EVENT_DETAILS_URL = 'https://cpfgugbirflalcjuludp.supabase.co/functions/v1/proxy/.netlify/functions/event-details'
const PROXY_BASE = 'https://cpfgugbirflalcjuludp.supabase.co/functions/v1/proxy/'

function extractCookie(name: string): string | undefined {
  const stored = localStorage.getItem(name)
  if (!stored) {
    return undefined
  }
  return stored.split(";")[0]
}

const api = axios.create({ withCredentials: true })
api.interceptors.request.use((config) => {
  const cookie = extractCookie(
    (config.url!!.indexOf('auth-refresh') > -1) ? 'm_refresh_token' : 'm_access_token'
  )
  if (cookie) {
    config.headers.set('m_access_token', cookie)
  }
  const key = localStorage.getItem('myko-auth-key')
  if (key) config.headers.set('x-myko-auth', key)
  return config
})
api.interceptors.response.use((response) => {
  if (response.headers['m_access_token']) {
    localStorage.setItem('m_access_token', response.headers['m_access_token'])
  }
  if (response.headers['m_refresh_token']) {
    localStorage.setItem('m_refresh_token', response.headers['m_refresh_token'])
  }
  return response
})

async function ensureCookieAuth(email: string, password: string): Promise<User | null> {
  try {
    await api.post(`${PROXY_BASE}.netlify/functions/auth-refresh`)
    const { data: me } = await api.get<{ user: User }>(`${PROXY_BASE}.netlify/functions/auth-me`)
    return me.user
  } catch (e) {
    if (!axios.isAxiosError(e) || e.response?.status !== 401) throw new Error(`Auth refresh failed: HTTP ${e instanceof Error ? e.message : e}`)
  }

  const { data: loginData } = await api.post<{ user: User }>(
    `${PROXY_BASE}.netlify/functions/auth-login`,
    { email, password },
  )

  await api.post(`${PROXY_BASE}.netlify/functions/auth-refresh`)
  await api.get(`${PROXY_BASE}.netlify/functions/auth-me`)

  return loginData.user
}

function App() {
  const [authKey, setAuthKey] = useState(() => localStorage.getItem('myko-auth-key') ?? '')
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [authDraft, setAuthDraft] = useState(authKey)
  const [credEmail, setCredEmail] = useState(() => localStorage.getItem('myko-cred-email') ?? '')
  const [credPassword, setCredPassword] = useState(() => localStorage.getItem('myko-cred-password') ?? '')
  const [credDraftEmail, setCredDraftEmail] = useState(credEmail)
  const [credDraftPassword, setCredDraftPassword] = useState(credPassword)
  const [credDialogOpen, setCredDialogOpen] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  const saveAuthKey = () => {
    localStorage.setItem('myko-auth-key', authDraft)
    setAuthKey(authDraft)
    setAuthDialogOpen(false)
  }

  const saveCredentials = () => {
    localStorage.setItem('myko-cred-email', credDraftEmail)
    localStorage.setItem('myko-cred-password', credDraftPassword)
    setCredEmail(credDraftEmail)
    setCredPassword(credDraftPassword)
    setCredDialogOpen(false)
  }

  const hasCredentials = credEmail !== '' && credPassword !== ''

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-UK', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getInitials = (u: User) => `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <>
      <section id="center">
        <div className="button-row">
          <Button variant="outlined" onClick={() => { setAuthDraft(authKey); setAuthDialogOpen(true) }}>
            {authKey ? 'Auth Key Set' : 'Set Auth Key'}
          </Button>
          <Button variant="outlined" onClick={() => { setCredDraftEmail(credEmail); setCredDraftPassword(credPassword); setCredDialogOpen(true) }}>
            {hasCredentials ? 'Credentials Set' : 'Set Credentials'}
          </Button>
          <Button variant="contained" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Loading...' : 'Fetch Events'}
          </Button>
          {user && (
            <Chip
              avatar={<Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>{getInitials(user)}</Avatar>}
              label={`${user.elo}`}
              size="small"
              sx={{ ml: 1 }}
            />
          )}
        </div>

        <Dialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)}>
          <DialogTitle>Auth Key</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              type="password"
              label="x-myko-auth"
              value={authDraft}
              onChange={(e) => setAuthDraft(e.target.value)}
              variant="outlined"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAuthDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveAuthKey}>Save</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={credDialogOpen} onClose={() => setCredDialogOpen(false)}>
          <DialogTitle>Cookie Auth Credentials</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              label="Email"
              value={credDraftEmail}
              onChange={(e) => setCredDraftEmail(e.target.value)}
              variant="outlined"
              sx={{ mb: 2, mt: 1 }}
            />
            <TextField
              fullWidth
              type="password"
              label="Password"
              value={credDraftPassword}
              onChange={(e) => setCredDraftPassword(e.target.value)}
              variant="outlined"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCredDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveCredentials}>Save</Button>
          </DialogActions>
        </Dialog>

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
        
        {events && events.length > 0 && (
          <div className="events-table">
            {events.map((event) => (
              <div key={event.id} className="table-row-group">
                <div className="table-row">
                  <div className="column">{event.title}</div>
                  <div className="column">{formatDate(event.date)}</div>
                  <div className="column">
                    <ParticipationCell participants={event._count?.participants} maxParticipants={event.maxParticipants} />
                  </div>
                  <EventDetailCell eventId={event.id} userId={user?.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function EventDetailCell({ eventId, userId }: { eventId: string; userId: string | undefined }) {
  const [jsonOpen, setJsonOpen] = useState(false)

  const { data: detail } = useQuery<EventDetail>({
    queryKey: ['eventDetail', eventId],
    queryFn: async () => {
      const { data } = await api.get<EventDetail>(`${EVENT_DETAILS_URL}?id=${eventId}`)
      return data
    },
  })

  const isParticipating = detail?.participants?.some(p => p.userId === userId) ?? false

  return (
    <>
      <div className="column">
        {detail ? (
          isParticipating
            ? <span className="participating-yes">&#10003;{detail.currentUserPayment != null && <span className="payment-indicator"> $</span>}</span>
            : <span className="participating-no">&mdash;</span>
        ) : (
          <span className="loading-text">loading...</span>
        )}
      </div>
      <div className="column">
        {detail && (
          <Button variant="outlined" size="small" onClick={() => setJsonOpen(true)}>
            Show JSON
          </Button>
        )}
        <div>
          <a href={`https://sunsetpadel.at/events/${eventId}`} target="_blank" rel="noopener noreferrer">Open Event</a>
        </div>
      </div>
      <Dialog open={jsonOpen} onClose={() => setJsonOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Event Details</DialogTitle>
        <DialogContent>
          <pre className="dialog-json">{detail ? JSON.stringify(detail, null, 2) : ''}</pre>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJsonOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

function ParticipationCell({ participants, maxParticipants }: { participants: number | undefined; maxParticipants: number }) {
  if (maxParticipants <= 0) return <>{participants}</>
  if (participants && participants >= maxParticipants) return <>full ({maxParticipants}) </>
  return <>{participants} ({maxParticipants})</>
}


export default App
