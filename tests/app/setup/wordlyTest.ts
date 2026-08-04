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
  currentUserPayment: unknown
  currentUserWaitlistPosition: number | null
}

type WorldEventInput = Partial<WorldEvent> & {
  participants?: unknown[]
  currentUserPayment?: unknown
  currentUserWaitlistPosition?: number | null
  _detailDelay?: number
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
  competitionId: null,
  formatId: null,
  formatConfig: null,
  matchTableStatus: 'NONE',
  matchTableMode: 'MANUAL',
  matchTableGeneratedAt: null,
  matchTableConfirmedAt: null,
  _count: { participants: 3 },
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
    eventDetailDelays: new Map<string, number>(),
    user: defaultUser,
    auth: { ...defaultAuth },
  }

  constructor(page: Page) {
    this.page = page
    void page.route(PROXY_BASE + "/**", (route) => this.handleProxy(route))
  }

  private handleProxy = async (route: Route) => {
    const url = new URL(route.request().url())

    if (url.pathname.endsWith('/.netlify/functions/events')) {
      await route.fulfill({ json: this.state.events })
    } else if (url.pathname.includes('/.netlify/functions/event-details')) {
      const eventId = url.searchParams.get('id')
      const detail = eventId ? this.state.eventDetails.get(eventId) : undefined
      if (detail) {
        const delay = eventId ? this.state.eventDetailDelays.get(eventId) : undefined
        if (delay) await new Promise(r => setTimeout(r, delay))
        const presented = route.request().headers()['m_access_token']
        const body = presented === this.state.auth.accessToken ? detail : this.withoutUserInfo(detail)
        await route.fulfill({ json: body })
      } else {
        await route.fulfill({ status: 404, json: { error: 'not found' } })
      }
    } else if (url.pathname.endsWith('/.netlify/functions/auth-login')) {
      const body = route.request().postDataJSON() as { email?: string; password?: string } | null
      if (body?.email === this.state.auth.email && body?.password === this.state.auth.password) {
        await route.fulfill({ status: 200, headers: this.rotateTokens(), json: { user: this.state.user } })
      } else {
        await route.fulfill({ status: 401, json: { error: 'invalid credentials' } })
      }
    } else if (url.pathname.endsWith('/.netlify/functions/auth-refresh')) {
      const presented = route.request().headers()['m_access_token']
      if (presented === this.state.auth.refreshToken) {
        await route.fulfill({ status: 200, headers: this.rotateTokens(), json: {} })
      } else {
        await route.fulfill({ status: 401, json: { error: 'invalid refresh token' } })
      }
    } else if (url.pathname.endsWith('/.netlify/functions/auth-me')) {
      const presented = route.request().headers()['m_access_token']
      if (presented !== this.state.auth.accessToken) {
        await route.fulfill({ status: 401, json: { error: 'unauthorized' } })
      } else {
        await route.fulfill({ json: { user: this.state.user } })
      }
    } else {
      await route.fallback()
    }
  }

  givenEvents(inputs: WorldEventInput[]): WorldEvent[] {
    this.state.events = inputs.map(({ participants, currentUserPayment, currentUserWaitlistPosition, _detailDelay, ...eventFields }) => {
      const event = { ...defaultEvent(), ...eventFields }
      this.state.eventDetails.set(event.id, {
        ...event,
        participants: participants ?? [],
        currentUserPayment: currentUserPayment ?? null,
        currentUserWaitlistPosition: currentUserWaitlistPosition ?? null,
      })
      if (_detailDelay != null) {
        this.state.eventDetailDelays.set(event.id, _detailDelay)
      }
      return event
    })
    return this.state.events
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
export type { WorldEvent, WorldEventDetail, WorldEventInput, WorldUser, WorldAuth }
