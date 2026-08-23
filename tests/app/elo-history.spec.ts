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

  const dialog = appPage.eloHistoryDialog
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Current ELO: 1393')
  await expect(appPage.eloHistoryRows).toHaveCount(2)
  await expect(appPage.eloHistoryRows.nth(0)).toContainText('RECENT CUP')
  await expect(appPage.eloHistoryRows.nth(1)).toContainText('OLD SLAM')
  await expect(dialog).not.toContainText('FUTURE SLAM')

  const recentDelta = appPage.eloHistoryRows.nth(0).getByTestId('elo-history-delta')
  await expect(recentDelta).toHaveText('-68')
  await expect(recentDelta).toHaveClass(/elo-delta-negative/)
  const oldDelta = appPage.eloHistoryRows.nth(1).getByTestId('elo-history-delta')
  await expect(oldDelta).toHaveText('+50')
  await expect(oldDelta).toHaveClass(/elo-delta-positive/)

  await dialog.getByRole('button', { name: 'Close' }).click()
  await expect(dialog).toBeHidden()
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

  const dialog = appPage.eloHistoryDialog
  await expect(appPage.eloHistoryRows).toHaveCount(2)
  await expect(appPage.eloHistoryRows.nth(0)).toContainText('NO USER CUP')
  await expect(appPage.eloHistoryRows.nth(1)).toContainText('NO TABLE CUP')
  await expect(dialog.getByTestId('elo-history-delta')).toHaveCount(0)
})

test('shows empty state when there are no finished events yet', async ({ appPage }) => {
  await appPage.goto()
  await appPage.fetchEvents()

  await appPage.openEloHistory()

  const dialog = appPage.eloHistoryDialog
  await expect(dialog).toBeVisible()
  await expect(dialog.getByTestId('elo-history-empty')).toContainText('No finished events yet')
})

test('shows an error when the profile fetch fails', async ({ world, appPage }) => {
  world.givenProfileUnavailable()
  await appPage.goto()
  await appPage.fetchEvents()

  await appPage.openEloHistory()

  const dialog = appPage.eloHistoryDialog
  await expect(dialog.getByTestId('elo-history-error')).toContainText('Failed to fetch profile')
})
