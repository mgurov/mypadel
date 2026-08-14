import { expect } from '@playwright/test'
import { test } from './setup/ourTest'

const participants = [
  { id: 'p-alice', userId: 'u-alice', user: { name: 'Alice', firstName: 'Alice', lastName: '', elo: 1500 } },
  { id: 'p-bob', userId: 'u-bob', user: { name: 'Bob', firstName: 'Bob', lastName: '', elo: 1600 } },
  { id: 'p-carol', userId: 'u-carol', user: { name: 'Carol', firstName: 'Carol', lastName: '', elo: 1400 } },
  { id: 'p-dave', userId: 'u-dave', user: { name: 'Dave', firstName: 'Dave', lastName: '', elo: 1550 } },
  { id: 'p-eve', userId: 'u-eve', user: { name: 'Eve', firstName: 'Eve', lastName: '', elo: 1450 } },
  { id: 'p-frank', userId: 'u-frank', user: { name: 'Frank', firstName: 'Frank', lastName: '', elo: 1300 } },
]

async function openCourts(page: import('@playwright/test').Page, world: import('./setup/wordlyTest').World) {
  world.givenEvents([
    { id: 'evt-1', title: 'Morning Padel', participants },
  ])
  await page.goto('/')
  await page.getByTestId('fetch-events-button').click()
  await expect(page.getByText('Morning Padel')).toBeVisible()

  await page.getByRole('button', { name: 'Actions' }).first().click()
  await page.getByRole('menuitem', { name: 'Courts' }).click()
  return page.getByRole('dialog')
}

test('actions menu offers the courts option', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel', participants }])
  await page.goto('/')
  await page.getByTestId('fetch-events-button').click()
  await expect(page.getByText('Morning Padel')).toBeVisible()

  await page.getByRole('button', { name: 'Actions' }).first().click()

  await expect(page.getByRole('menuitem', { name: 'Courts' })).toBeVisible()
})

test('courts dialog groups participants by elo desc into courts of 4 by default', async ({ page, world }) => {
  const dialog = await openCourts(page, world)

  await expect(dialog.getByTestId('court-1')).toContainText('Court 1')
  await expect(dialog.getByTestId('court-2')).toContainText('Court 2')

  const court1Names = dialog.getByTestId('court-1').locator('.court-player-name')
  await expect(court1Names).toHaveText(['Bob', 'Dave', 'Alice', 'Eve'])
  const court1Elos = dialog.getByTestId('court-1').locator('.court-player-elo')
  await expect(court1Elos).toHaveText(['1600', '1550', '1500', '1450'])

  const court2Names = dialog.getByTestId('court-2').locator('.court-player-name')
  await expect(court2Names).toHaveText(['Carol', 'Frank'])
})

test('courts dialog can switch to courts of 5', async ({ page, world }) => {
  const dialog = await openCourts(page, world)

  await dialog.getByTestId('court-size-5').click()

  const court1Names = dialog.getByTestId('court-1').locator('.court-player-name')
  await expect(court1Names).toHaveText(['Bob', 'Dave', 'Alice', 'Eve', 'Carol'])
  const court2Names = dialog.getByTestId('court-2').locator('.court-player-name')
  await expect(court2Names).toHaveText(['Frank'])
})

test('courts dialog closes', async ({ page, world }) => {
  const dialog = await openCourts(page, world)
  await dialog.getByRole('button', { name: 'Close' }).click()
  await expect(dialog).toHaveCount(0)
})

test('highlights the court of the current user', async ({ page, world }) => {
  const withMine = [
    ...participants,
    { id: 'p-me', userId: 'user-1', user: { name: 'Me', firstName: 'Me', lastName: '', elo: 1700 } },
  ]
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel', participants: withMine }])
  await page.goto('/')
  await page.getByTestId('fetch-events-button').click()
  await expect(page.getByText('Morning Padel')).toBeVisible()

  await page.getByRole('button', { name: 'Actions' }).first().click()
  await page.getByRole('menuitem', { name: 'Courts' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByTestId('court-1')).toHaveClass(/court-card-mine/)
  await expect(dialog.getByTestId('court-1')).toContainText('mine')
  await expect(dialog.getByTestId('court-2')).not.toHaveClass(/court-card-mine/)
})

async function openCourtsWithDescription(page: import('@playwright/test').Page, world: import('./setup/wordlyTest').World, description: string) {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel', description }])
  await page.goto('/')
  await page.getByTestId('fetch-events-button').click()
  await expect(page.getByText('Morning Padel')).toBeVisible()

  await page.getByRole('button', { name: 'Actions' }).first().click()
  await page.getByRole('menuitem', { name: 'Courts' }).click()
  return page.getByRole('dialog')
}

test('shows ladder format indicator for a ladder description', async ({ page, world }) => {
  const dialog = await openCourtsWithDescription(page, world, 'Climb the Ladder format event details')
  await expect(dialog.getByTestId('event-format-indicator')).toHaveText('ladder')
})

test('shows king format indicator for a king of the court description', async ({ page, world }) => {
  const dialog = await openCourtsWithDescription(page, world, 'King of the Court tournament')
  await expect(dialog.getByTestId('event-format-indicator')).toHaveText('king')
})

test('shows unknown format indicator otherwise', async ({ page, world }) => {
  const dialog = await openCourtsWithDescription(page, world, 'Casual padel evening')
  await expect(dialog.getByTestId('event-format-indicator')).toHaveText('unknown')
})

test('clicking the format indicator pops up the description', async ({ page, world }) => {
  const description = 'Climb the Ladder format - start on court 4 and move up'
  const dialog = await openCourtsWithDescription(page, world, description)

  await dialog.getByTestId('event-format-indicator').click()

  await expect(page.getByTestId('event-format-description')).toContainText(description)
})

test('description popup stays open until clicked away', async ({ page, world }) => {
  const description = 'Climb the Ladder format - start on court 4 and move up'
  const dialog = await openCourtsWithDescription(page, world, description)

  await dialog.getByTestId('event-format-indicator').click()
  const popup = page.getByTestId('event-format-description')
  await expect(popup).toContainText(description)
  await expect(popup).toBeVisible()
  await page.waitForTimeout(3000)
  await expect(popup).toBeVisible()

  await dialog.getByTestId('event-format-indicator').click()
  await expect(popup).toHaveCount(0)
})

test('preselects 5 players per court for king format and allows switching', async ({ page, world }) => {
  const dialog = await openCourtsWithDescription(page, world, 'King of the Court tournament')

  await expect(dialog.getByTestId('court-size-5')).toHaveAttribute('aria-pressed', 'true')
  await expect(dialog.getByTestId('court-size-4')).toHaveAttribute('aria-pressed', 'false')

  await dialog.getByTestId('court-size-4').click()

  await expect(dialog.getByTestId('court-size-4')).toHaveAttribute('aria-pressed', 'true')
  await expect(dialog.getByTestId('court-size-5')).toHaveAttribute('aria-pressed', 'false')
})

test('preselects 4 players per court for ladder format', async ({ page, world }) => {
  const dialog = await openCourtsWithDescription(page, world, 'Climb the Ladder format event')

  await expect(dialog.getByTestId('court-size-4')).toHaveAttribute('aria-pressed', 'true')
  await expect(dialog.getByTestId('court-size-5')).toHaveAttribute('aria-pressed', 'false')
})

test('preselects 4 players per court for unknown format', async ({ page, world }) => {
  const dialog = await openCourtsWithDescription(page, world, 'Casual padel evening')

  await expect(dialog.getByTestId('court-size-4')).toHaveAttribute('aria-pressed', 'true')
  await expect(dialog.getByTestId('court-size-5')).toHaveAttribute('aria-pressed', 'false')
})
