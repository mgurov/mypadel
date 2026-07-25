import { useState } from 'react'
import './App.css'
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';

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

function App() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [authKey, setAuthKey] = useState(() => localStorage.getItem('myko-auth-key') ?? '')
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [authDraft, setAuthDraft] = useState(authKey)

  const saveAuthKey = () => {
    localStorage.setItem('myko-auth-key', authDraft)
    setAuthKey(authDraft)
    setAuthDialogOpen(false)
  }

  const getAuthHeaders = (): Record<string, string> => {
    return authKey ? { 'x-myko-auth': authKey } : {}
  }

  const fetchEvents = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('https://cpfgugbirflalcjuludp.supabase.co/functions/v1/proxy/.netlify/functions/events', {
        headers: getAuthHeaders()
      })
      if (!res.ok) {
        const errorBody = await res.text()
        throw new Error(`HTTP ${res.status}: ${errorBody || res.statusText}`)
      }
      const data: Event[] = await res.json()
      const now = new Date()
      const filtered = data.filter(e => !e.title.startsWith('Ladies Night') && new Date(e.date) >= now)
      setEvents(filtered)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(`Failed to fetch events: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      <section id="center">
        <Button variant="outlined" onClick={() => { setAuthDraft(authKey); setAuthDialogOpen(true) }}>
          {authKey ? 'Auth Key Set' : 'Set Auth Key'}
        </Button>

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

        <Button variant="contained" onClick={fetchEvents} disabled={loading}>
          {loading ? 'Loading...' : 'Fetch Events'}
        </Button>

        {error && (
          <Alert severity="error" sx={{ mt: 2, width: '100%' }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {events.length > 0 && (
          <div className="events-table">
            <div className="table-header">
              <div className="column">Title</div>
              <div className="column">Date</div>
              <div className="column">Status</div>
              <div className="column">Actions</div>
            </div>
            
            {events.map((event) => (
              <div key={event.id} className="table-row-group">
                <div className="table-row">
                  <div className="column">{event.title}</div>
                  <div className="column">{formatDate(event.date)}</div>
                  <div className="column">{event.status}</div>
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

export default App
