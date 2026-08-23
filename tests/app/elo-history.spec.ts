import { expect } from '@playwright/test'
import { test } from './setup/ourTest'

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

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

  await dialog.getByRole('button', { name: 'Close' }).click()
  await expect(dialog).toBeHidden()
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
