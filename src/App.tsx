import { useState } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import './App.css'
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import { api, EVENTS_URL, ensureCookieAuth, type Event, type User } from './api'
import { CredentialsButton, type Credentials } from './components/CredentialsButton'
import { EventsTable } from './components/EventsTable'

function App() {
  const [authKey, setAuthKey] = useState(() => localStorage.getItem('myko-auth-key') ?? '')
  const [credEmail, setCredEmail] = useState(() => localStorage.getItem('myko-cred-email') ?? '')
  const [credPassword, setCredPassword] = useState(() => localStorage.getItem('myko-cred-password') ?? '')
  const [authError, setAuthError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  const queryClient = useQueryClient()

  const handleFetch = () => {
    void queryClient.refetchQueries({ queryKey: ['eventDetail'] })
    void refetch()
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

  const getInitials = (u: User) => `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <>
      <section id="center">
        <div className="button-row">
          <CredentialsButton authKey={authKey} email={credEmail} password={credPassword} onSave={saveCredentials} />
          <Button variant={credentialsComplete ? 'contained' : 'outlined'} onClick={handleFetch} disabled={isFetching}>
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
          <EventsTable events={events} userId={user?.id} />
        )}
      </section>
    </>
  )
}

export default App
