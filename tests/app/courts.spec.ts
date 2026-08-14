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
