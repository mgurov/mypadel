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
  await expect(recentDetails.nth(0)).toContainText('elo')
  await expect(recentDetails.nth(0)).toContainText('1461')
  await expect(recentDetails.nth(1)).toContainText('previousElo')
  await expect(recentDetails.nth(1)).toContainText('1461')
  await expect(recentDetails.nth(2)).toContainText('newElo')
  await expect(recentDetails.nth(2)).toContainText('1393')
  await expect(appPage.eloHistoryRows.nth(0).getByTestId('elo-history-match')).toHaveCount(0)

  await appPage.clickEloHistoryRow(1)

  const oldDelta = appPage.eloHistoryRows.nth(1).getByTestId('elo-history-delta')
  await expect(oldDelta).toHaveText('+50')
  await expect(oldDelta).toHaveClass(/elo-delta-positive/)
  const oldDetails = appPage.eloHistoryRows.nth(1).getByTestId('elo-history-detail')
  await expect(oldDetails).toHaveCount(3)
  await expect(oldDetails.nth(2)).toContainText('1550')
})

test('breaks the elo delta down per round for matches the user participated in', async ({ world, appPage }) => {
  world.givenCurrentUser({ elo: 1498 })
  world.givenRegistrations([
    { id: 'reg-rounds', event: { id: 'e-rounds', title: 'ROUNDS CUP', endDate: hoursFromNow(-30) } },
  ])
  world.givenMatchTables([
    {
      eventId: 'e-rounds',
      players: [{ id: USER_ID, name: 'Player One', elo: 1498, previousElo: 1500, newElo: 1498 }],
      matches: [
        {
          round: 3,
          ratingChanges: [
            { userId: USER_ID, before: 1510, delta: -12, after: 1498 },
            { userId: 'someone-else', before: 1475, delta: 8, after: 1483 },
          ],
        },
        {
          round: 1,
          ratingChanges: [{ userId: USER_ID, before: 1500, delta: 10, after: 1510 }],
        },
        {
          round: 2,
          ratingChanges: [{ userId: 'someone-else', before: 1480, delta: -5, after: 1475 }],
        },
      ],
    },
  ])
  await appPage.goto()
  await appPage.fetchEvents()

  await appPage.openEloHistory()
  await appPage.clickEloHistoryRow(0)

  const row = appPage.eloHistoryRows.nth(0)
  const matchRows = row.getByTestId('elo-history-match')
  await expect(matchRows).toHaveCount(2)
  await expect(matchRows.nth(0)).toContainText('Round 1')
  await expect(matchRows.nth(0).getByTestId('elo-history-match-delta')).toHaveText('+10')
  await expect(matchRows.nth(0).getByTestId('elo-history-match-delta')).toHaveClass(/elo-delta-positive/)
  await expect(matchRows.nth(1)).toContainText('Round 3')
  await expect(matchRows.nth(1).getByTestId('elo-history-match-delta')).toHaveText('-12')
  await expect(matchRows.nth(1).getByTestId('elo-history-match-delta')).toHaveClass(/elo-delta-negative/)

  await appPage.clickEloHistoryRow(0)

  await expect(row.getByTestId('elo-history-match')).toHaveCount(0)
  await expect(row.getByTestId('elo-history-details')).toHaveCount(0)

  await appPage.clickEloHistoryRow(0)

  await expect(row.getByTestId('elo-history-match')).toHaveCount(2)
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

test('prefers manualElo over newElo and omits the delta when neither is present', async ({ world, appPage }) => {
  world.givenRegistrations([
    { id: 'reg-manual', event: { id: 'e-manual', title: 'MANUAL CUP', endDate: hoursFromNow(-30) } },
    { id: 'reg-blank', event: { id: 'e-blank', title: 'BLANK CUP', endDate: hoursFromNow(-50) } },
  ])
  world.givenMatchTables([
    {
      eventId: 'e-manual',
      players: [{ id: USER_ID, name: 'Player One', elo: 1393, manualElo: 1443, isWinner: false, previousElo: 1393, newElo: 1350 }],
    },
    {
      eventId: 'e-blank',
      players: [{ id: USER_ID, name: 'Player One', elo: 1393, previousElo: 1393 }],
    },
  ])
  await appPage.goto()
  await appPage.fetchEvents()

  await appPage.openEloHistory()

  await expect(appPage.eloHistoryRows).toHaveCount(2)

  await appPage.clickEloHistoryRow(0)

  const manualDelta = appPage.eloHistoryRows.nth(0).getByTestId('elo-history-delta')
  await expect(manualDelta).toHaveText('+50')
  const manualDetails = appPage.eloHistoryRows.nth(0).getByTestId('elo-history-detail')
  await expect(manualDetails).toHaveCount(5)
  await expect(manualDetails.nth(1)).toContainText('manualElo')
  await expect(manualDetails.nth(1)).toContainText('1443')
  await expect(manualDetails.filter({ hasText: 'isWinner' })).toContainText('false')

  await appPage.clickEloHistoryRow(1)

  await expect(appPage.eloHistoryRows.nth(1).getByTestId('elo-history-delta')).toHaveCount(0)
  const blankDetails = appPage.eloHistoryRows.nth(1).getByTestId('elo-history-detail')
  await expect(blankDetails).toHaveCount(2)
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
