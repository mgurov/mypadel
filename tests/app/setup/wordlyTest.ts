import { test, type Page, type Route } from "@playwright/test";

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

const defaultUser: WorldUser = {
  id: 'user-1',
  email: 'player@example.com',
  firstName: 'Player',
  lastName: 'One',
  phone: null,
  createdAt: '2026-01-01T00:00:00Z',
  role: 'USER',
  elo: 1500,
  achievements: [],
  isPremium: false,
}

export const wordlyTest = test.extend<{ world: World }>({
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

class World {
  private page: Page
  private state = {
    events: [] as WorldEvent[],
    eventDetails: new Map<string, WorldEventDetail>(),
    eventDetailDelays: new Map<string, number>(),
    user: defaultUser,
  }

  constructor(page: Page) {
    this.page = page
    page.route(PROXY_BASE + "/**", (route) => this.handleProxy(route))
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
        await route.fulfill({ json: detail })
      } else {
        await route.fulfill({ status: 404, json: { error: 'not found' } })
      }
    } else if (url.pathname.endsWith('/.netlify/functions/auth-refresh')) {
      await route.fulfill({ status: 200, json: {} })
    } else if (url.pathname.endsWith('/.netlify/functions/auth-me')) {
      await route.fulfill({ json: { user: this.state.user } })
    } else {
      await route.fallback()
    }
  }

  givenEvents(overrides: Partial<WorldEvent>[]): WorldEvent[] {
    this.state.events = overrides.map(o => ({ ...defaultEvent(), ...o }))
    for (const event of this.state.events) {
      if (!this.state.eventDetails.has(event.id)) {
        this.state.eventDetails.set(event.id, {
          ...event,
          participants: [],
          currentUserPayment: null,
          currentUserWaitlistPosition: null,
        })
      }
    }
    return this.state.events
  }

  givenEventDetails(eventId: string, detail: Partial<WorldEventDetail>, opts?: { delayMs?: number }) {
    const base = this.state.eventDetails.get(eventId) ?? {
      ...defaultEvent(),
      id: eventId,
      participants: [],
      currentUserPayment: null,
      currentUserWaitlistPosition: null,
    }
    this.state.eventDetails.set(eventId, { ...base, ...detail })
    if (opts?.delayMs != null) {
      this.state.eventDetailDelays.set(eventId, opts.delayMs)
    }
  }

  givenCurrentUser(user: Partial<WorldUser>) {
    this.state.user = { ...defaultUser, ...user }
  }
}

export { World, defaultUser }
export type { WorldEvent, WorldEventDetail, WorldUser }
