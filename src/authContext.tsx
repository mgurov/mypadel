/* oxlint-disable react/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Credentials } from './components/CredentialsButton'

interface AuthContextValue {
  authKey: string
  credEmail: string
  credPassword: string
  authError: string | null
  setAuthError: (error: string | null) => void
  saveCredentials: (creds: Credentials) => void
  hasCredentials: boolean
  credentialsComplete: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authKey, setAuthKey] = useState(() => localStorage.getItem('myko-auth-key') ?? '')
  const [credEmail, setCredEmail] = useState(() => localStorage.getItem('myko-cred-email') ?? '')
  const [credPassword, setCredPassword] = useState(() => localStorage.getItem('myko-cred-password') ?? '')
  const [authError, setAuthError] = useState<string | null>(null)

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

  return (
    <AuthContext.Provider
      value={{ authKey, credEmail, credPassword, authError, setAuthError, saveCredentials, hasCredentials, credentialsComplete }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
