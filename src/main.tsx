import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { SunsetUserProvider } from './userContext'
import { AuthProvider } from './authContext'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SunsetUserProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </SunsetUserProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
