import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
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

const EVENTS_URL = 'https://cpfgugbirflalcjuludp.supabase.co/functions/v1/proxy/.netlify/functions/events'
const PROXY_BASE = 'https://cpfgugbirflalcjuludp.supabase.co/functions/v1/proxy/'

async function ensureCookieAuth(email: string, password: string): Promise<User | null> {
  const meRes = await fetch(`${PROXY_BASE}.netlify/functions/auth-me`, { credentials: 'include' })
  if (meRes.ok) return null
  if (meRes.status !== 401) throw new Error(`Auth check failed: HTTP ${meRes.status}`)

  const loginRes = await fetch(`${PROXY_BASE}.netlify/functions/auth-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })
  if (!loginRes.ok) throw new Error(`Login failed: HTTP ${loginRes.status}`)

  const loginData: { user: User } = await loginRes.json()

  const refreshRes = await fetch(`${PROXY_BASE}.netlify/functions/auth-refresh`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!refreshRes.ok) throw new Error(`Refresh failed: HTTP ${refreshRes.status}`)

  const finalCheck = await fetch(`${PROXY_BASE}.netlify/functions/auth-me`, { credentials: 'include' })
  if (!finalCheck.ok) throw new Error(`Auth still failing after login+refresh: HTTP ${finalCheck.status}`)

  return loginData.user
}

function App() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
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
      const headers: Record<string, string> = authKey ? { 'x-myko-auth': authKey } : {}
      const res = await fetch(EVENTS_URL, { headers, credentials: 'include' })
      if (!res.ok) {
        const errorBody = await res.text()
        throw new Error(`HTTP ${res.status}: ${errorBody || res.statusText}`)
      }
      const data: Event[] = await res.json()
      const now = new Date()
      return data.filter(e => !e.title.startsWith('Ladies Night') && new Date(e.date) >= now)
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
                  <div className="column">
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                    >
                      {expandedId === event.id ? 'Hide JSON' : 'Show JSON'}
                    </Button>
                  </div>
                </div>
                {expandedId === event.id && (
                  <pre className="inline-json">{JSON.stringify(event, null, 2)}</pre>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function ParticipationCell({ participants, maxParticipants }: { participants: number | undefined; maxParticipants: number }) {
  if (maxParticipants <= 0) return <>{participants}</>
  if (participants && participants >= maxParticipants) return <>full ({maxParticipants}) </>
  return <>{participants} ({maxParticipants})</>
}


export default App
