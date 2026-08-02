import { test, expect, type Page } from '@playwright/test'

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

test('shows main controls', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Set Auth Key' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Set Credentials' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Fetch Events' })).toBeVisible()
})

test('can set auth key via dialog', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Set Auth Key' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('x-myko-auth').fill('test-secret-key')
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByRole('button', { name: 'Auth Key Set' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('myko-auth-key'))).toBe('test-secret-key')
})

test('can set credentials via dialog', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Set Credentials' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Email').fill('player@example.com')
  await dialog.getByLabel('Password').fill('hunter2')
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByRole('button', { name: 'Credentials Set' })).toBeVisible()
})

test('fetches and displays events', async ({ page }) => {
  await mockApi(page)
  await page.addInitScript(() => localStorage.setItem('myko-auth-key', 'test-secret-key'))
  await page.goto('/')

  await page.getByRole('button', { name: 'Fetch Events' }).click()

  await expect(page.getByText('Morning Padel')).toBeVisible()
  await expect(page.getByText('Evening Padel')).toBeVisible()
  await expect(page.getByText('3 (8)').first()).toBeVisible()
})

test('shows error alert when fetch fails', async ({ page }) => {
  await page.route('**/.netlify/functions/events', (route) =>
    route.fulfill({ status: 401, json: { error: 'unauthorized' } }),
  )
  await page.goto('/')

  await page.getByRole('button', { name: 'Fetch Events' }).click()

  await expect(page.getByRole('alert')).toContainText('Failed to fetch events')
})
