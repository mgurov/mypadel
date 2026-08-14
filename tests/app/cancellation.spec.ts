import { expect, type Page } from '@playwright/test'
import { test } from './setup/ourTest'

const fetchButton = (page: Page) => page.getByTestId('fetch-events-button')

const rowFor = (page: Page, title: string) =>
  page.locator('.table-row-group', { hasText: title }).locator('.table-row')

const FIXED_NOW = '2026-09-05T00:00:00Z'

const ME = [{ userId: 'user-1' }]

async function showEvents(page: Page, title: string) {
  await page.clock.install({ time: new Date(FIXED_NOW) })
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText(title)).toBeVisible()
}

test('shows the cancel sign when the null deadline falls within 24h', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Cancel Soon', date: '2026-09-06T12:00:00Z', participants: ME }])
  await showEvents(page, 'Cancel Soon')

  await expect(rowFor(page, 'Cancel Soon')).toContainText('cancel 24h')
})

test('shows the cancel sign for an explicit deadline within 24h', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'Explicit Deadline', date: '2026-09-07T18:00:00Z', freeCancellationUntil: '2026-09-05T10:00:00Z', participants: ME },
  ])
  await showEvents(page, 'Explicit Deadline')

  await expect(rowFor(page, 'Explicit Deadline')).toContainText('cancel 24h')
})

test('does not show the cancel sign when the null deadline is beyond 24h', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Not Urgent', date: '2026-09-08T18:00:00Z', participants: ME }])
  await showEvents(page, 'Not Urgent')

  await expect(rowFor(page, 'Not Urgent')).not.toContainText('cancel 24h')
})

test('does not show the cancel sign for a far future explicit deadline', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'Far Deadline', date: '2026-09-10T18:00:00Z', freeCancellationUntil: '2026-09-08T00:00:00Z', participants: ME },
  ])
  await showEvents(page, 'Far Deadline')

  await expect(rowFor(page, 'Far Deadline')).not.toContainText('cancel 24h')
})

test('does not show the cancel sign when the free cancellation window has already closed', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'Null Passed', date: '2026-09-05T18:00:00Z', participants: ME },
    { id: 'evt-2', title: 'Explicit Passed', date: '2026-09-05T18:00:00Z', freeCancellationUntil: '2026-09-04T10:00:00Z', participants: ME },
  ])
  await showEvents(page, 'Null Passed')

  await expect(rowFor(page, 'Null Passed')).not.toContainText('cancel 24h')
  await expect(rowFor(page, 'Explicit Passed')).not.toContainText('cancel 24h')
})

test('does not show the cancel sign for an event the user does not participate in', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Not Attending', date: '2026-09-06T12:00:00Z' }])
  await showEvents(page, 'Not Attending')

  await expect(rowFor(page, 'Not Attending')).not.toContainText('cancel 24h')
})

test('shows the cancel sign for a sunset event in the combined tab', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Combined Cancel', date: '2026-09-06T12:00:00Z', participants: ME }])
  await page.clock.install({ time: new Date(FIXED_NOW) })
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('Combined Cancel')).toBeVisible()

  await page.getByTestId('tab-combined').click()

  await expect(rowFor(page, 'Combined Cancel')).toContainText('cancel 24h')
})

test('shows the cancellation deadline in a popup when clicking the cancel sign', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Cancel Soon', date: '2026-09-06T12:00:00Z', participants: ME }])
  await showEvents(page, 'Cancel Soon')

  const row = rowFor(page, 'Cancel Soon')
  await expect(row).toContainText('cancel 24h')
  await expect(page.getByTestId('cancel-deadline')).toHaveCount(0)

  await page.getByTestId('cancel-label').click()

  await expect(page.getByTestId('cancel-deadline')).toContainText('free cancel until')
  await expect(page.getByTestId('cancel-deadline')).toContainText(/\d{1,2}:\d{2}/)
  await expect(page.getByTestId('cancel-ack-button')).toBeVisible()
})

test('hides the cancel sign when acknowledging the cancellation in the popup', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Cancel Soon', date: '2026-09-06T12:00:00Z', participants: ME }])
  await showEvents(page, 'Cancel Soon')

  await page.getByTestId('cancel-label').click()
  await page.getByTestId('cancel-ack-button').click()

  await expect(page.getByTestId('cancel-label')).toHaveCount(0)
  await expect(page.getByTestId('cancel-deadline')).toHaveCount(0)
})

test('keeps the cancel sign hidden after acknowledging, across a reload', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Cancel Soon', date: '2026-09-06T12:00:00Z', participants: ME }])
  await showEvents(page, 'Cancel Soon')

  await page.getByTestId('cancel-label').click()
  await page.getByTestId('cancel-ack-button').click()
  await expect(page.getByTestId('cancel-label')).toHaveCount(0)

  await page.reload()
  await fetchButton(page).click()
  await expect(page.getByText('Cancel Soon')).toBeVisible()
  await expect(page.getByTestId('cancel-label')).toHaveCount(0)
})

test('acknowledging the cancellation does not ack the event newness', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Cancel Soon', date: '2026-09-06T12:00:00Z', participants: ME }])
  await showEvents(page, 'Cancel Soon')

  world.givenEvents([
    { id: 'evt-1', title: 'Cancel Soon', date: '2026-09-06T12:00:00Z', participants: ME },
    { id: 'evt-2', title: 'New Urgent', date: '2026-09-06T12:00:00Z', participants: ME },
  ])
  await fetchButton(page).click()
  await expect(page.getByText('New Urgent')).toBeVisible()

  const row = rowFor(page, 'New Urgent')
  await expect(row.locator('.new-label')).toBeVisible()
  await row.getByTestId('cancel-label').click()
  await page.getByTestId('cancel-ack-button').click()

  await expect(row.getByTestId('cancel-label')).toHaveCount(0)
  await expect(row.locator('.new-label')).toBeVisible()

  await page.reload()
  await fetchButton(page).click()
  await expect(page.getByText('New Urgent')).toBeVisible()
  await expect(rowFor(page, 'New Urgent').getByTestId('cancel-label')).toHaveCount(0)
  await expect(rowFor(page, 'New Urgent').locator('.new-label')).toBeVisible()
})
