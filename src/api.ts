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
  freeCancellationUntil: string | null
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
  premiumSubscriptionId: string | null
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
  waitlistCount: number
  currentUserPayment: Payment | null
  currentUserWaitlistPosition: number | null
}

export interface MeetupEvent {
  id: string
  title: string
  dateTime: string
  endTime: string
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

export interface ProfileEvent {
  id: string
  title: string
  date: string
  endDate: string
}

export interface ProfileRegistration {
  id: string
  createdAt: string
  eventId: string
  userId: string
  event: ProfileEvent
}

export interface Profile {
  id: string
  elo: number
  registrations: ProfileRegistration[]
}

export function pastRegistrations(registrations: ProfileRegistration[], now: Date = new Date()): ProfileRegistration[] {
  return registrations
    .filter((r) => new Date(r.event.endDate).getTime() < now.getTime())
    .sort((a, b) => new Date(b.event.endDate).getTime() - new Date(a.event.endDate).getTime())
}

export interface MatchTablePlayer {
  id: string
  name: string
  elo: number
  isWinner?: boolean
  previousElo: number
  newElo?: number
  manualElo?: number
}

export interface MatchCourt {
  courtNumber: number
  players: MatchTablePlayer[]
  isManual: boolean
  manualOverride: boolean
}

export interface RatingChange {
  userId: string
  before: number
  delta: number
  after: number
}

export interface MatchTableMatch {
  id: string
  courtNumber: number
  round: number
  pair1: MatchTablePlayer[]
  pair2: MatchTablePlayer[]
  score1: number | null
  score2: number | null
  status: string
  updatedAt: string | null
  updatedBy: MatchTablePlayer | null
  ratingChanges: RatingChange[]
}

export interface EventMatchTable {
  eventId: string
  mode: string
  status: string
  generatedAt: string | null
  confirmedAt: string | null
  courts: MatchCourt[]
  matches: MatchTableMatch[]
}

export function matchTablePlayer(matchTable: EventMatchTable, userId: string): MatchTablePlayer | null {
  for (const court of matchTable.courts ?? []) {
    const player = court.players?.find((p) => p.id === userId)
    if (player) return player
  }
  return null
}

export function effectiveEloForPlayer(player: MatchTablePlayer): number | null {
  return player.manualElo ?? player.newElo ?? null
}

export function eloDeltaForPlayer(matchTable: EventMatchTable, userId: string): number | null {
  const player = matchTablePlayer(matchTable, userId)
  if (!player) return null
  const effective = effectiveEloForPlayer(player)
  return effective != null ? effective - player.previousElo : null
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

const PROXY_BASE = import.meta.env.VITE_PROXY_BASE ?? (import.meta.env.DEV ? '/dev-proxy/' : 'https://cpfgugbirflalcjuludp.supabase.co/functions/v1/proxy/')
//const PROXY_BASE = '/.netlify/functions/sunset-proxy/'
export const EVENTS_URL = `${PROXY_BASE}.netlify/functions/events`
export const EVENT_DETAILS_URL = `${PROXY_BASE}.netlify/functions/event-details`
export const MEETUP_URL = `/.netlify/functions/proxy/gql2`
export const PROFILE_URL = `${PROXY_BASE}.netlify/functions/profile`
export const EVENT_MATCH_TABLE_URL = `${PROXY_BASE}.netlify/functions/event-match-table`

export async function fetchEventDetail(id: string): Promise<EventDetail> {
  const { data } = await api.get<EventDetail>(`${EVENT_DETAILS_URL}?id=${id}`)
  return data
}

export async function fetchEventMatchTable(eventId: string): Promise<EventMatchTable> {
  const { data } = await api.get<EventMatchTable>(`${EVENT_MATCH_TABLE_URL}?eventId=${eventId}`)
  return data
}

export async function fetchProfile(): Promise<Profile> {
  const { data } = await api.get<Profile>(PROFILE_URL)
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
    if (!axios.isAxiosError(e) || e.response?.status !== 401) throw new Error(`Auth refresh failed: HTTP ${e instanceof Error ? e.message : String(e)}`)
  }

  const { data: loginData } = await api.post<{ user: User }>(
    `${PROXY_BASE}.netlify/functions/auth-login`,
    { email, password },
  )

  await api.post(`${PROXY_BASE}.netlify/functions/auth-refresh`)
  await api.get(`${PROXY_BASE}.netlify/functions/auth-me`)

  return loginData.user
}
