import { expect, type Page } from '@playwright/test'
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
    page.route('**/.netlify/functions/auth-refresh', (route) => route.fulfill({ status: 200, json: {} })),
    page.route('**/.netlify/functions/auth-me', (route) =>
      route.fulfill({
        json: {
          user: {
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
          },
        },
      }),
    ),
  ])
}

const credentialsButton = (page: Page) => page.getByRole('button', { name: 'Set Credentials' })
const credentialsSetButton = (page: Page) => page.getByRole('button', { name: 'Credentials Set' })

async function fillCredentials(page: Page, authKey: string, email: string, password: string) {
  await credentialsButton(page).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('x-myko-auth').fill(authKey)
  await dialog.getByLabel('Email').fill(email)
  await dialog.getByLabel('Password').fill(password)
  await dialog.getByRole('button', { name: 'Save' }).click()
}

test('shows main controls', async ({ page }) => {
  await page.goto('/')
  await expect(credentialsButton(page)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Fetch Events' })).toBeVisible()
})

test('credentials dialog contains all three fields', async ({ page }) => {
  await page.goto('/')
  await credentialsButton(page).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('x-myko-auth')).toBeVisible()
  await expect(dialog.getByLabel('Email')).toBeVisible()
  await expect(dialog.getByLabel('Password')).toBeVisible()
})

test('button indicates all three pieces missing by default', async ({ page }) => {
  await page.goto('/')
  await expect(credentialsButton(page)).toHaveAttribute('title', 'Missing: auth key, email, password')
})

test('button indicates missing email and password when only auth key is set', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('myko-auth-key', 'test-secret-key')
  })
  await page.goto('/')
  await expect(credentialsButton(page)).toHaveAttribute('title', 'Missing: email, password')
})

test('button indicates missing auth key when only credentials are set', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('myko-cred-email', 'player@example.com')
    localStorage.setItem('myko-cred-password', 'hunter2')
  })
  await page.goto('/')
  await expect(credentialsButton(page)).toHaveAttribute('title', 'Missing: auth key')
})

test('saving all three credentials sets button and localStorage', async ({ page }) => {
  await page.goto('/')
  await fillCredentials(page, 'test-secret-key', 'player@example.com', 'hunter2')

  await expect(credentialsSetButton(page)).toBeVisible()
  await expect(credentialsSetButton(page)).toHaveAttribute('title', 'All credentials set')
  expect(await page.evaluate(() => localStorage.getItem('myko-auth-key'))).toBe('test-secret-key')
  expect(await page.evaluate(() => localStorage.getItem('myko-cred-email'))).toBe('player@example.com')
  expect(await page.evaluate(() => localStorage.getItem('myko-cred-password'))).toBe('hunter2')
})

test('saving a partial set still indicates what is missing', async ({ page }) => {
  await page.goto('/')
  await credentialsButton(page).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('x-myko-auth').fill('test-secret-key')
  await dialog.getByLabel('Email').fill('player@example.com')
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(credentialsButton(page)).toBeVisible()
  await expect(credentialsButton(page)).toHaveAttribute('title', 'Missing: password')
  expect(await page.evaluate(() => localStorage.getItem('myko-cred-password'))).toBe('')
})

test('dialog prefills saved values on reopen', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('myko-auth-key', 'saved-key')
    localStorage.setItem('myko-cred-email', 'saved@example.com')
    localStorage.setItem('myko-cred-password', 'saved-pass')
  })
  await page.goto('/')
  await credentialsSetButton(page).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('x-myko-auth')).toHaveValue('saved-key')
  await expect(dialog.getByLabel('Email')).toHaveValue('saved@example.com')
  await expect(dialog.getByLabel('Password')).toHaveValue('saved-pass')
})

test('cancel does not save credentials', async ({ page }) => {
  await page.goto('/')
  await credentialsButton(page).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('x-myko-auth').fill('test-secret-key')
  await dialog.getByLabel('Email').fill('player@example.com')
  await dialog.getByLabel('Password').fill('hunter2')
  await dialog.getByRole('button', { name: 'Cancel' }).click()

  await expect(credentialsButton(page)).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('myko-auth-key'))).toBeNull()
  expect(await page.evaluate(() => localStorage.getItem('myko-cred-email'))).toBeNull()
  expect(await page.evaluate(() => localStorage.getItem('myko-cred-password'))).toBeNull()
})

test('fetches and displays events after setting credentials', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  await fillCredentials(page, 'test-secret-key', 'player@example.com', 'hunter2')

  await page.getByRole('button', { name: 'Fetch Events' }).click()

  await expect(page.getByText('Morning Padel')).toBeVisible()
  await expect(page.getByText('Evening Padel')).toBeVisible()
  await expect(page.getByText('3 (8)').first()).toBeVisible()
  await expect(page.getByText('1500')).toBeVisible()
})

test('shows error alert when fetch fails', async ({ page }) => {
  await page.route('**/.netlify/functions/events', (route) =>
    route.fulfill({ status: 401, json: { error: 'unauthorized' } }),
  )
  await page.goto('/')

  await page.getByRole('button', { name: 'Fetch Events' }).click()

  await expect(page.getByRole('alert')).toContainText('Failed to fetch events')
})
