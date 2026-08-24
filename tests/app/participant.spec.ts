import { expect } from '@playwright/test'
import { test } from './setup/ourTest'

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

const UID = 'u-alice'

test('lists past sunset events newest first and filters out future ones', async ({ world, page }) => {
  world.givenEvents([
    { id: 'evt-old', title: 'OLD SLAM', date: hoursFromNow(-72), endDate: hoursFromNow(-70) },
    { id: 'evt-future', title: 'FUTURE SLAM', date: hoursFromNow(24), endDate: hoursFromNow(26) },
    { id: 'evt-live', title: 'LIVE CUP', date: hoursFromNow(-1), endDate: hoursFromNow(1) },
    { id: 'evt-recent', title: 'RECENT CUP', date: hoursFromNow(-5), endDate: hoursFromNow(-4) },
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
  world.givenEvents([
    { id: 'evt-recent', title: 'RECENT CUP', date: hoursFromNow(-5), endDate: hoursFromNow(-4) },
  ])
  world.givenMatchTables([
    {
      eventId: 'evt-recent',
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

test('shows empty state when all events are still in the future', async ({ world, page }) => {
  world.givenEvents([
    { id: 'evt-future', title: 'FUTURE SLAM', date: hoursFromNow(24), endDate: hoursFromNow(26) },
  ])
  await page.goto('/sunset/participant/u-alice')

  await expect(page.getByTestId('sunset-participant-empty')).toContainText('No finished events yet')
})

test('shows an error when the events fetch fails', async ({ world, page }) => {
  world.givenEventsUnavailable()
  await page.goto('/sunset/participant/u-alice')

  await expect(page.getByTestId('sunset-participant-error')).toContainText('Failed to fetch events')
})
