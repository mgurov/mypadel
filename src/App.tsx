import { Route, Routes } from 'react-router-dom'
import './App.css'
import { CredentialsButton } from './components/CredentialsButton'
import { FetchButton } from './components/FetchButton'
import { EventsView } from './components/EventsView'
import { EloHistoryChip } from './components/EloHistoryChip'
import { EloHistoryPage } from './components/EloHistoryPage'
import { useAuth } from './authContext'

function App() {
  const { authKey, credEmail, credPassword, saveCredentials } = useAuth()

  return (
    <section id="center">
      <div className="button-row">
        <CredentialsButton authKey={authKey} email={credEmail} password={credPassword} onSave={saveCredentials} />
        <FetchButton />
        <EloHistoryChip />
      </div>

      <Routes>
        <Route path="/" element={<EventsView />} />
        <Route path="/elo-history" element={<EloHistoryPage />} />
      </Routes>
    </section>
  )
}

export default App
