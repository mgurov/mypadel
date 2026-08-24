import { expect } from '@playwright/test'
import { test } from './setup/ourTest'

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

const USER_ID = 'user-1'

test('opens ELO history from the user chip and lists past events newest first', async ({ world, appPage }) => {
  world.givenCurrentUser({ elo: 1393 })
  world.givenRegistrations([
    { id: 'reg-old', event: { id: 'e-old', title: 'OLD SLAM', date: hoursFromNow(-72), endDate: hoursFromNow(-70) } },
    {
      id: 'reg-recent',
      event: { id: 'e-recent', title: 'RECENT CUP', date: hoursFromNow(-5), endDate: hoursFromNow(-4) },
    },
    {
      id: 'reg-later-today',
      event: { id: 'e-future', title: 'FUTURE SLAM', date: hoursFromNow(-1), endDate: hoursFromNow(3) },
    },
  ])
  world.givenMatchTables([
    {
      eventId: 'e-recent',
      players: [{ id: 'someone-else', name: 'Someone Else', elo: 1500, previousElo: 1500, newElo: 1515 }, { id: USER_ID, name: 'Player One', elo: 1461, previousElo: 1461, newElo: 1393 }],
    },
    {
      eventId: 'e-old',
      players: [{ id: USER_ID, name: 'Player One', elo: 1500, previousElo: 1500, newElo: 1550 }],
    },
  ])
  await appPage.goto()
  await appPage.fetchEvents()

  await appPage.openEloHistory()

  const page = appPage.eloHistoryPage
  await expect(page).toBeVisible()
  await expect(page).toContainText('Current ELO: 1393')
  await expect(appPage.eloHistoryRows).toHaveCount(2)
  await expect(appPage.eloHistoryRows.nth(0)).toContainText('RECENT CUP')
  await expect(appPage.eloHistoryRows.nth(1)).toContainText('OLD SLAM')
  await expect(page).not.toContainText('FUTURE SLAM')
  await expect(appPage.eloHistoryDeltas).toHaveCount(0)

  await appPage.clickEloHistoryRow(0)

  const recentDelta = appPage.eloHistoryRows.nth(0).getByTestId('elo-history-delta')
  await expect(recentDelta).toHaveText('-68')
  await expect(recentDelta).toHaveClass(/elo-delta-negative/)
  await expect(appPage.eloHistoryRows.nth(1).getByTestId('elo-history-delta')).toHaveCount(0)

  const recentDetails = appPage.eloHistoryRows.nth(0).getByTestId('elo-history-detail')
  await expect(recentDetails).toHaveCount(3)
  await expect(recentDetails.nth(0)).toContainText('Previous ELO')
  await expect(recentDetails.nth(0)).toContainText('1461')
  await expect(recentDetails.nth(1)).toContainText('New ELO')
  await expect(recentDetails.nth(1)).toContainText('1393')
  await expect(recentDetails.nth(2)).toContainText('Current ELO')
  await expect(recentDetails.nth(2)).toContainText('1461')

  await appPage.clickEloHistoryRow(1)

  const oldDelta = appPage.eloHistoryRows.nth(1).getByTestId('elo-history-delta')
  await expect(oldDelta).toHaveText('+50')
  await expect(oldDelta).toHaveClass(/elo-delta-positive/)
  const oldDetails = appPage.eloHistoryRows.nth(1).getByTestId('elo-history-detail')
  await expect(oldDetails).toHaveCount(3)
  await expect(oldDetails.nth(1)).toContainText('1550')
})

test('navigates back from the elo history page to the events view', async ({ world, appPage, page }) => {
  world.givenCurrentUser({ elo: 1393 })
  world.givenRegistrations([])
  await appPage.goto()
  await appPage.fetchEvents()

  await appPage.openEloHistory()

  await page.getByRole('button', { name: 'Back' }).click()

  await expect(page).toHaveURL(/\/$/)
})

test('deep-links straight to the elo history page', async ({ world, appPage }) => {
  world.givenCurrentUser({ elo: 1393 })
  world.givenRegistrations([
    { id: 'reg-old', event: { id: 'e-old', title: 'DEEP SLAM', endDate: hoursFromNow(-30) } },
  ])

  await appPage.goto('/elo-history')

  const page = appPage.eloHistoryPage
  await expect(page).toBeVisible()
  await expect(page).toContainText('Current ELO: 1393')
  await expect(appPage.eloHistoryRows).toHaveCount(1)
  await expect(appPage.eloHistoryRows.nth(0)).toContainText('DEEP SLAM')
})

test('omits the delta when the user is absent from the match table or it is missing', async ({ world, appPage }) => {
  world.givenRegistrations([
    { id: 'reg-no-user', event: { id: 'e-no-user', title: 'NO USER CUP', endDate: hoursFromNow(-30) } },
    { id: 'reg-no-table', event: { id: 'e-no-table', title: 'NO TABLE CUP', endDate: hoursFromNow(-50) } },
  ])
  world.givenMatchTables([
    { eventId: 'e-no-user', players: [{ id: 'someone-else', name: 'Someone Else', elo: 1500, previousElo: 1500, newElo: 1515 }] },
  ])
  await appPage.goto()
  await appPage.fetchEvents()

  await appPage.openEloHistory()

  await expect(appPage.eloHistoryRows).toHaveCount(2)
  await expect(appPage.eloHistoryRows.nth(0)).toContainText('NO USER CUP')
  await expect(appPage.eloHistoryRows.nth(1)).toContainText('NO TABLE CUP')

  await appPage.clickEloHistoryRow(0)
  await appPage.clickEloHistoryRow(1)

  await expect(appPage.eloHistoryPage.getByTestId('elo-history-row-loading')).toHaveCount(0)
  await expect(appPage.eloHistoryDeltas).toHaveCount(0)
  await expect(appPage.eloHistoryPage.getByTestId('elo-history-details')).toHaveCount(0)
})

test('shows empty state when there are no finished events yet', async ({ appPage }) => {
  await appPage.goto()
  await appPage.fetchEvents()

  await appPage.openEloHistory()

  await expect(appPage.eloHistoryPage.getByTestId('elo-history-empty')).toContainText('No finished events yet')
})

test('shows an error when the profile fetch fails', async ({ world, appPage }) => {
  world.givenProfileUnavailable()
  await appPage.goto()
  await appPage.fetchEvents()

  await appPage.openEloHistory()

  await expect(appPage.eloHistoryPage.getByTestId('elo-history-error')).toContainText('Failed to fetch profile')
})
