import { createContext, useContext, useState, type ReactNode } from 'react'
import type { User } from './api'

interface SunsetUserContextValue {
  user: User | null
  setUser: (user: User | null) => void
}

const SunsetUserContext = createContext<SunsetUserContextValue | null>(null)

export function SunsetUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  return (
    <SunsetUserContext.Provider value={{ user, setUser }}>
      {children}
    </SunsetUserContext.Provider>
  )
}

export function useSunsetUser(): SunsetUserContextValue {
  const context = useContext(SunsetUserContext)
  if (context === null) {
    throw new Error('useSunsetUser must be used within SunsetUserProvider')
  }
  return context
}
