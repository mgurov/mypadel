import { test, type Page, type Route } from "@playwright/test";
import { AppPage } from "./appPage";

const PROXY_BASE = '**/dev-proxy'

function futureDate(daysAhead: number, hour: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

interface WorldEvent {
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
  freeCancellationUntil: string | null
  competitionId: string | null
  formatId: string | null
  formatConfig: string | null
  matchTableStatus: string
  matchTableMode: string
  matchTableGeneratedAt: string | null
  matchTableConfirmedAt: string | null
  _count: { participants: number }
}

interface WorldEventDetail extends WorldEvent {
  participants: unknown[]
  waitlistCount: number
  currentUserPayment: unknown
  currentUserWaitlistPosition: number | null
}

interface MeetupNode {
  id: string
  title: string
  dateTime: string
  endTime: string
  status: string
  eventUrl: string
  venue: { id: string; name: string }
  eventHosts: { memberId: string }[]
  maxTickets: number
  going: { totalCount: number }
  rsvps: { totalCount: number; edges: { node: { member: { id: string; name: string; memberPhoto?: { id: string; source: string } | null } } }[] }
}

interface ProfileEvent {
  id: string
  title: string
  date: string
  endDate: string
}

export interface WorldRegistration {
  id: string
  createdAt: string
  eventId: string
  userId: string
  event: ProfileEvent
}

type RegistrationInput = Partial<Omit<WorldRegistration, 'event'>> & { event?: Partial<ProfileEvent> }

export interface WorldMatchPlayer {
  id: string
  name: string
  elo: number
  isWinner?: boolean
  previousElo: number
  newElo?: number
  manualElo?: number
}

export interface WorldRatingChange {
  userId: string
  before: number
  delta: number
  after: number
}

export interface WorldMatch {
  id?: string
  courtNumber?: number
  round: number
  pair1?: unknown[]
  pair2?: unknown[]
  score1?: number | null
  score2?: number | null
  status?: string
  updatedAt?: string | null
  updatedBy?: unknown
  ratingChanges?: WorldRatingChange[]
}

export interface WorldMatchTable {
  eventId: string
  mode: string
  status: string
  generatedAt: string
  confirmedAt: string
  courts: { courtNumber: number; players: WorldMatchPlayer[]; isManual: boolean; manualOverride: boolean }[]
  matches: WorldMatch[]
}

export interface MatchTableInput {
  eventId: string
  players?: Partial<WorldMatchPlayer>[]
  matches?: Partial<WorldMatch>[]
}

type WorldEventInput = Partial<WorldEvent> & {
  participants?: unknown[]
  waitlistCount?: number
  currentUserPayment?: unknown
  currentUserWaitlistPosition?: number | null
}

interface WorldUser {
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

const defaultEvent = (): WorldEvent => ({
  id: 'evt-1',
  title: 'Morning Padel',
  description: '',
  date: futureDate(1, 10),
  endDate: futureDate(1, 12),
  location: 'Court 1',
  status: 'PUBLISHED',
  publishAt: null,
  reminderSentAt: null,
  maxParticipants: 8,
  price: '10',
  disclaimer: '',
  createdAt: futureDate(-1, 9),
  freeCancellationUntil: null,
  competitionId: null,
  formatId: null,
  formatConfig: null,
  matchTableStatus: 'NONE',
  matchTableMode: 'MANUAL',
  matchTableGeneratedAt: null,
  matchTableConfirmedAt: null,
  _count: { participants: 3 },
})

const defaultMeetupNode = (): MeetupNode => ({
  id: 'meetup-1',
  title: 'Padel Meetup',
  dateTime: futureDate(1, 10),
  endTime: futureDate(1, 12),
  status: 'ACTIVE',
  eventUrl: 'https://www.meetup.com/vienna-sports-meetup/events/1/',
  venue: { id: 'venue-1', name: 'Vienna Court' },
  eventHosts: [{ memberId: 'host-1' }],
  maxTickets: 8,
  going: { totalCount: 5 },
  rsvps: { totalCount: 5, edges: [{ node: { member: { id: 'member-1', name: 'Member One' } } }] },
})

export const defaultAuth = {
  email: 'player@example.com',
  password: 'hunter2',
  accessToken: 'access-token-1',
  refreshToken: 'refresh-token-1',
}

const defaultUser: WorldUser = {
  id: 'user-1',
  email: defaultAuth.email,
  firstName: 'Player',
  lastName: 'One',
  phone: null,
  createdAt: '2026-01-01T00:00:00Z',
  role: 'USER',
  elo: 1500,
  achievements: [],
  isPremium: false,
}

const defaultRegistration = (index: number): WorldRegistration => ({
  id: `reg-${index}`,
  createdAt: futureDate(-7, 9),
  eventId: `evt-reg-${index}`,
  userId: 'user-1',
  event: {
    id: `evt-reg-${index}`,
    title: `Past Padel ${index}`,
    date: futureDate(-1, 10),
    endDate: futureDate(-1, 12),
  },
})

export const wordlyTest = test.extend<{ world: World; appPage: AppPage }>({
  appPage: [async ({ page }, use) => {
    await use(new AppPage(page))
  }, {}],
  world: [async ({ page }, use) => {
    await page.route(PROXY_BASE + "/**", (route, request) =>
      route.fulfill({
        status: 505,
        json: { message: `the route ${request.method()} ${request.url()} isn't routed` },
      }),
    )

    const world = new World(page);
    await use(world);
  }, { auto: true }],
});

export interface WorldAuth {
  email: string
  password: string
  accessToken: string
  refreshToken: string
}

class World {
  private page: Page
  private tokenNonce = 1
  private state = {
    events: [] as WorldEvent[],
    eventDetails: new Map<string, WorldEventDetail>(),
    meetupEvents: [] as MeetupNode[],
    registrations: [] as WorldRegistration[],
    matchTables: new Map<string, WorldMatchTable>(),
    profileStatus: 200,
    eventsStatus: 200,
    user: defaultUser,
    auth: { ...defaultAuth },
  }

  constructor(page: Page) {
    this.page = page
    void page.route(PROXY_BASE + "/**", (route) => this.handleProxy(route))
    void page.route('**/.netlify/functions/proxy/gql2', (route) => this.handleProxy(route))
  }

  private handleProxy = async (route: Route) => {
    const url = new URL(route.request().url())

    if (url.pathname.endsWith('/.netlify/functions/events')) {
      await route.fulfill({
        status: this.state.eventsStatus,
        json: this.state.eventsStatus === 200 ? this.state.events : { error: 'events unavailable' },
      })
    } else if (url.pathname.endsWith('/.netlify/functions/proxy/gql2')) {
      await route.fulfill({
        json: {
          data: {
            groupByUrlname: {
              events: {
                edges: this.state.meetupEvents.map((node) => ({ node })),
              },
            },
          },
        },
      })
    } else if (url.pathname.includes('/.netlify/functions/event-details')) {
      const eventId = url.searchParams.get('id')
      const detail = eventId ? this.state.eventDetails.get(eventId) : undefined
      if (detail) {
        const body = this.hasValidAccessToken(route) ? detail : this.withoutUserInfo(detail)
        await route.fulfill({ json: body })
      } else {
        await route.fulfill({ status: 404, json: { error: 'not found' } })
      }
    } else if (url.pathname.endsWith('/.netlify/functions/event-match-table')) {
      const eventId = url.searchParams.get('eventId')
      const table = eventId ? this.state.matchTables.get(eventId) : undefined
      if (table) {
        await route.fulfill({ json: table })
      } else {
        await route.fulfill({ status: 404, json: { error: 'not found' } })
      }
    } else if (url.pathname.endsWith('/.netlify/functions/profile')) {
      await route.fulfill({
        status: this.state.profileStatus,
        json:
          this.state.profileStatus === 200
            ? {
                id: this.state.user.id,
                elo: this.state.user.elo,
                registrations: this.state.registrations,
              }
            : { error: 'profile unavailable' },
      })
    } else if (url.pathname.endsWith('/.netlify/functions/auth-login')) {
      const body = route.request().postDataJSON() as { email?: string; password?: string } | null
      if (body?.email === this.state.auth.email && body?.password === this.state.auth.password) {
        await route.fulfill({ status: 200, headers: this.rotateTokens(), json: { user: this.state.user } })
      } else {
        await route.fulfill({ status: 401, json: { error: 'invalid credentials' } })
      }
    } else if (url.pathname.endsWith('/.netlify/functions/auth-refresh')) {
      if (this.presentedToken(route) === this.state.auth.refreshToken) {
        await route.fulfill({ status: 200, headers: this.rotateTokens(), json: {} })
      } else {
        await route.fulfill({ status: 401, json: { error: 'invalid refresh token' } })
      }
    } else if (url.pathname.endsWith('/.netlify/functions/auth-me')) {
      if (!this.hasValidAccessToken(route)) {
        await route.fulfill({ status: 401, json: { error: 'unauthorized' } })
      } else {
        await route.fulfill({ json: { user: this.state.user } })
      }
    } else {
      await route.fallback()
    }
  }

  givenEvents(inputs: WorldEventInput[]): WorldEvent[] {
    this.state.events = inputs.map(({ participants, waitlistCount, currentUserPayment, currentUserWaitlistPosition, ...eventFields }) => {
      const event = { ...defaultEvent(), ...eventFields }
      this.state.eventDetails.set(event.id, {
        ...event,
        participants: participants ?? [],
        waitlistCount: waitlistCount ?? 0,
        currentUserPayment: currentUserPayment ?? null,
        currentUserWaitlistPosition: currentUserWaitlistPosition ?? null,
      })
      return event
    })
    return this.state.events
  }

  givenMeetupEvents(inputs: Partial<MeetupNode>[]): MeetupNode[] {
    this.state.meetupEvents = inputs.map((node) => ({ ...defaultMeetupNode(), ...node }))
    return this.state.meetupEvents
  }

  givenRegistrations(inputs: RegistrationInput[]): WorldRegistration[] {
    this.state.profileStatus = 200
    this.state.registrations = inputs.map(({ event, ...regFields }, i) => {
      const base = defaultRegistration(i)
      const mergedEvent = { ...base.event, ...event }
      const registration = { ...base, ...regFields, eventId: regFields.eventId ?? mergedEvent.id, event: mergedEvent }
      return registration
    })
    return this.state.registrations
  }

  givenProfileUnavailable() {
    this.state.profileStatus = 500
    this.state.registrations = []
  }

  givenEventsUnavailable() {
    this.state.eventsStatus = 500
    this.state.events = []
  }

  givenMatchTables(inputs: MatchTableInput[]): void {
    for (const { eventId, players, matches } of inputs) {
      const table: WorldMatchTable = {
        eventId,
        mode: 'AUTO_COURTS',
        status: 'CONFIRMED',
        generatedAt: futureDate(-1, 18),
        confirmedAt: futureDate(-1, 20),
        courts: [{ courtNumber: 1, players: (players ?? []).map((player) => ({ ...player } as WorldMatchPlayer)), isManual: false, manualOverride: false }],
        matches: (matches ?? []).map((match, i) => ({
          id: match.id ?? `match-${i + 1}`,
          courtNumber: match.courtNumber ?? 1,
          round: match.round,
          pair1: match.pair1 ?? [],
          pair2: match.pair2 ?? [],
          score1: match.score1 ?? null,
          score2: match.score2 ?? null,
          status: match.status ?? 'CONFIRMED',
          updatedAt: match.updatedAt ?? null,
          updatedBy: match.updatedBy ?? null,
          ratingChanges: match.ratingChanges ?? [],
        })),
      }
      this.state.matchTables.set(eventId, table)
    }
  }

  private presentedToken(route: Route): string | undefined {
    return route.request().headers()['m_access_token']
  }

  private hasValidAccessToken(route: Route): boolean {
    return this.presentedToken(route) === this.state.auth.accessToken
  }

  private withoutUserInfo(detail: WorldEventDetail): WorldEventDetail {
    return { ...detail, currentUserPayment: null, currentUserWaitlistPosition: null }
  }

  private rotateTokens(): Record<string, string> {
    this.tokenNonce += 1
    const accessToken = `access-token-${this.tokenNonce}`
    const refreshToken = `refresh-token-${this.tokenNonce}`
    this.state.auth = { ...this.state.auth, accessToken, refreshToken }
    return { m_access_token: accessToken, m_refresh_token: refreshToken }
  }

  givenAccessTokenExpired() {
    this.tokenNonce += 1
    this.state.auth = { ...this.state.auth, accessToken: `access-token-${this.tokenNonce}` }
  }

  givenAuth(auth: Partial<WorldAuth>) {
    this.state.auth = { ...this.state.auth, ...auth }
  }

  givenCurrentUser(user: Partial<WorldUser>) {
    this.state.user = { ...defaultUser, ...user }
  }
}

export { World, defaultUser }
export type { WorldEvent, WorldEventDetail, WorldEventInput, WorldUser, WorldAuth, MeetupNode, RegistrationInput, MatchTableInput, WorldMatch, WorldRatingChange }
