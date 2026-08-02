import { expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import { test } from './setup/ourTest'

function futureDate(daysAhead: number, hour: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function mockEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt-1',
    title: 'Morning Padel',
    description: 'Join us for padel',
    date: futureDate(1, 10),
    endDate: futureDate(1, 12),
    location: 'Court 1',
    status: 'PUBLISHED',
    publishAt: null,
    reminderSentAt: null,
    maxParticipants: 8,
    price: '10',
    disclaimer: 'Bring water',
    createdAt: futureDate(-1, 9),
    competitionId: null,
    formatId: null,
    formatConfig: null,
    matchTableStatus: 'NONE',
    matchTableMode: 'MANUAL',
    matchTableGeneratedAt: null,
    matchTableConfirmedAt: null,
    _count: { participants: 3 },
    ...overrides,
  }
}

function mockApi(page: Page) {
  return Promise.all([
    page.route('**/.netlify/functions/events', (route) =>
      route.fulfill({
        json: [
          mockEvent(),
          mockEvent({ id: 'evt-2', title: 'Evening Padel', date: futureDate(2, 18) }),
        ],
      }),
    ),
    page.route('**/.netlify/functions/event-details**', (route) =>
      route.fulfill({ json: { ...mockEvent(), participants: [], currentUserPayment: null } }),
    ),
  ])
}

async function loadEvents(page: Page) {
  await mockApi(page)
  await page.addInitScript(() => localStorage.setItem('myko-auth-key', 'test-secret-key'))
  await page.goto('/')
  await page.getByRole('button', { name: 'Fetch Events' }).click()
  await expect(page.getByText('Morning Padel')).toBeVisible()
}

const icsTime = (iso: string) => iso.slice(0, 19).replace(/[-:]/g, '')

test('downloads an ics file for the first event', async ({ page }) => {
  await loadEvents(page)

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Add to Calendar' }).first().click(),
  ])

  expect(download.suggestedFilename()).toBe('Morning-Padel.ics')
  const content = fs.readFileSync((await download.path())!, 'utf8')
  expect(content).toContain('BEGIN:VCALENDAR')
  expect(content).toContain('END:VCALENDAR')
  expect(content).toContain('SUMMARY:Morning Padel')
  expect(content).toContain(`UID:evt-1@mypadel`)
  expect(content).toContain(`DTSTART:${icsTime(mockEvent().date)}`)
  expect(content).toContain(`DTEND:${icsTime(mockEvent().endDate)}`)
  expect(content).toContain('LOCATION:Court 1')
  expect(content).toContain('DESCRIPTION:Join us for padel')
  expect(content).toContain('URL:https://sunsetpadel.at/events/evt-1')
})

test('each event downloads its own ics file', async ({ page }) => {
  const evening = mockEvent({ id: 'evt-2', title: 'Evening Padel', date: futureDate(2, 18) })
  await mockApi(page)
  await page.route('**/.netlify/functions/events', (route) =>
    route.fulfill({ json: [mockEvent(), evening] }),
  )
  await page.addInitScript(() => localStorage.setItem('myko-auth-key', 'test-secret-key'))
  await page.goto('/')
  await page.getByRole('button', { name: 'Fetch Events' }).click()
  await expect(page.getByText('Evening Padel')).toBeVisible()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Add to Calendar' }).nth(1).click(),
  ])

  expect(download.suggestedFilename()).toBe('Evening-Padel.ics')
  const content = fs.readFileSync((await download.path())!, 'utf8')
  expect(content).toContain('SUMMARY:Evening Padel')
  expect(content).toContain('UID:evt-2@mypadel')
  expect(content).toContain(`DTSTART:${icsTime(evening.date)}`)
})

test('escapes special characters in ics text fields', async ({ page }) => {
  await mockApi(page)
  await page.route('**/.netlify/functions/events', (route) =>
    route.fulfill({
      json: [mockEvent({ title: 'Team A, B; C', description: 'Line 1\nLine 2, ok' })],
    }),
  )
  await page.addInitScript(() => localStorage.setItem('myko-auth-key', 'test-secret-key'))
  await page.goto('/')
  await page.getByRole('button', { name: 'Fetch Events' }).click()
  await expect(page.getByText('Team A, B; C')).toBeVisible()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Add to Calendar' }).click(),
  ])

  expect(download.suggestedFilename()).toBe('Team-A-B-C.ics')
  const content = fs.readFileSync((await download.path())!, 'utf8')
  expect(content).toContain('SUMMARY:Team A\\, B\\; C')
  expect(content).toContain('DESCRIPTION:Line 1\\nLine 2\\, ok')
})
