import { expect } from '@playwright/test'
import { test } from './setup/ourTest'

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

const UID = 'u-alice'

test('lists past games from the logged-in profile newest first and filters out future ones', async ({ world, page }) => {
  world.givenRegistrations([
    { id: 'reg-old', event: { id: 'e-old', title: 'OLD SLAM', date: hoursFromNow(-72), endDate: hoursFromNow(-70) } },
    { id: 'reg-future', event: { id: 'e-future', title: 'FUTURE SLAM', date: hoursFromNow(24), endDate: hoursFromNow(26) } },
    { id: 'reg-live', event: { id: 'e-live', title: 'LIVE CUP', date: hoursFromNow(-1), endDate: hoursFromNow(1) } },
    { id: 'reg-recent', event: { id: 'e-recent', title: 'RECENT CUP', date: hoursFromNow(-5), endDate: hoursFromNow(-4) } },
  ])
  await page.goto('/sunset/participant/u-alice')

  const participantPage = page.getByTestId('sunset-participant-page')
  await expect(participantPage).toBeVisible()
  await expect(page.getByTestId('sunset-participant-uid')).toHaveText('u-alice')

  const rows = page.getByTestId('elo-history-row')
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(0)).toContainText('RECENT CUP')
  await expect(rows.nth(1)).toContainText('OLD SLAM')
  await expect(participantPage).not.toContainText('FUTURE SLAM')
  await expect(participantPage).not.toContainText('LIVE CUP')
})

test('fetches the match table on row click and shows results for the route participant', async ({ world, page }) => {
  world.givenRegistrations([
    { id: 'reg-recent', event: { id: 'e-recent', title: 'RECENT CUP', date: hoursFromNow(-5), endDate: hoursFromNow(-4) } },
  ])
  world.givenMatchTables([
    {
      eventId: 'e-recent',
      players: [
        { id: UID, name: 'Alice Wonderland', elo: 1515, previousElo: 1500, newElo: 1515 },
        { id: 'user-1', name: 'Player One', elo: 1490, previousElo: 1500, newElo: 1490 },
      ],
    },
  ])

  await page.goto('/sunset/participant/u-alice')

  const row = page.getByTestId('elo-history-row').nth(0)
  await row.click()

  const delta = row.getByTestId('elo-history-delta')
  await expect(delta).toHaveText('+15')
  await expect(delta).toHaveClass(/elo-delta-positive/)
  await expect(row.getByTestId('elo-history-detail').filter({ hasText: 'newElo' })).toContainText('1515')
})

test('shows the participant name and elo from a shared past event', async ({ world, page }) => {
  world.givenRegistrations([
    { id: 'reg-recent', event: { id: 'e-recent', title: 'RECENT CUP', date: hoursFromNow(-5), endDate: hoursFromNow(-4) } },
  ])
  world.givenEvents([
    {
      id: 'e-recent',
      title: 'RECENT CUP',
      participants: [
        { id: 'p-alice', userId: UID, user: { id: UID, firstName: 'Alice', lastName: 'Wonderland', name: 'Alice Wonderland', elo: 1520 } },
      ],
    },
  ])

  await page.goto('/sunset/participant/u-alice')

  await expect(page.getByTestId('sunset-participant-summary')).toHaveText('Alice Wonderland · ELO 1520')
})

test('shows empty state when all games are still in the future', async ({ world, page }) => {
  world.givenRegistrations([
    { id: 'reg-future', event: { id: 'e-future', title: 'FUTURE SLAM', date: hoursFromNow(24), endDate: hoursFromNow(26) } },
  ])
  await page.goto('/sunset/participant/u-alice')

  await expect(page.getByTestId('sunset-participant-empty')).toContainText('No finished events yet')
})

test('hides the participant summary when no fetched event contains the uid', async ({ world, page }) => {
  world.givenRegistrations([
    { id: 'reg-old', event: { id: 'e-old', title: 'OLD SLAM', date: hoursFromNow(-72), endDate: hoursFromNow(-70) } },
  ])
  world.givenEvents([
    {
      id: 'e-old',
      title: 'OLD SLAM',
      participants: [
        { id: 'p-bob', userId: 'u-bob', user: { id: 'u-bob', firstName: 'Bob', lastName: 'Johnson', name: 'Bob Johnson', elo: 1600 } },
      ],
    },
  ])
  await page.goto('/sunset/participant/u-alice')

  await expect(page.getByTestId('sunset-participant-page')).toBeVisible()
  await expect(page.getByTestId('sunset-participant-summary')).toHaveCount(0)
})

test('shows an error when the profile fetch fails', async ({ world, page }) => {
  world.givenProfileUnavailable()
  await page.goto('/sunset/participant/u-alice')

  await expect(page.getByTestId('sunset-participant-error')).toContainText('Failed to fetch profile')
})
