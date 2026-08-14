import axios from 'axios'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  createdAt: string
  role: string
  elo: number
  achievements: string[]
  isPremium: boolean
}

export interface Event {
  id: string
  title: string
  description: string
  date: string
  endDate: string
  location: string
  status: string
  publishAt: string | null
  reminderSentAt: string | null
  maxParticipants: number
  price: string
  disclaimer: string
  createdAt: string
  competitionId: string | null
  formatId: string | null
  formatConfig: string | null
  matchTableStatus: string
  matchTableMode: string
  matchTableGeneratedAt: string | null
  matchTableConfirmedAt: string | null
  _count: {
    participants: number
  }
}

export interface Participant {
  id: string
  createdAt: string
  eventId: string
  userId: string
  user: {
    id: string
    firstName: string
    lastName: string
    elo: number
    name: string
  }
}

export interface Payment {
  id: string
  status: string
}

export interface EventDetail extends Event {
  participants: Participant[]
  currentUserPayment: Payment | null
  currentUserWaitlistPosition: number | null
}

export interface MeetupEvent {
  id: string
  title: string
  dateTime: string
  status: string
  eventUrl: string
  venue: {
    id: string
    name: string
  }
  eventHosts: {
    memberId: string
  }[]
  maxTickets: number
  going: {
    totalCount: number
  }
  rsvps: {
    totalCount: number
    edges: {
      node: {
        member: {
          id: string
        }
      }
    }[]
  }
}

export interface MeetupGraphqlResponse {
  data: {
    groupByUrlname: {
      events: {
        edges: {
          node: MeetupEvent
        }[]
      }
    }
  }
}

const PROXY_BASE = '/.netlify/functions/sunset-proxy/'
export const EVENTS_URL = `${PROXY_BASE}.netlify/functions/events`
export const EVENT_DETAILS_URL = `${PROXY_BASE}.netlify/functions/event-details`
export const MEETUP_URL = `/.netlify/functions/proxy/gql2`

export async function fetchEventDetail(id: string): Promise<EventDetail> {
  const { data } = await api.get<EventDetail>(`${EVENT_DETAILS_URL}?id=${id}`)
  return data
}

export function buildMeetupBody(): Record<string, unknown> {
  const afterDateTime = `${new Date().toISOString().slice(0, 10)}T00:00:00Z`
  return {
    operationName: 'getUpcomingGroupEvents',
    variables: {
      urlname: 'vienna-sports-meetup',
      title: 'padel',
      status: ['ACTIVE'],
      afterDateTime,
    },
    extensions: {
      persistedQuery: {
        version: 1,
        sha256Hash: '81a7529c2bcfd8739837a20305ed04bc9555a1c2629663c62f79df5e5bad70ab',
      },
    },
  }
}

function extractCookie(name: string): string | undefined {
  const stored = localStorage.getItem(name)
  if (!stored) {
    return undefined
  }
  return stored.split(';')[0]
}

export const api = axios.create({ withCredentials: true })
api.interceptors.request.use((config) => {
  const isRefresh = config.url != null && config.url.indexOf('auth-refresh') > -1
  const cookie = extractCookie(isRefresh ? 'm_refresh_token' : 'm_access_token')
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

export async function ensureCookieAuth(email: string, password: string): Promise<User | null> {
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
