import { expect, type Page } from '@playwright/test'
import { test } from './setup/ourTest'

const fetchButton = (page: Page) => page.getByTestId('fetch-events-button')
const tab = (page: Page, name: string) => page.getByTestId(`tab-${name}`)

function futureDate(daysAhead: number, hour: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3600_000).toISOString()
}

function todayStart(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

const rowFor = (page: Page, title: string) =>
  page.locator('.table-row-group', { hasText: title }).locator('.table-row')

async function fetchAndShow(page: Page, title: string) {
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText(title)).toBeVisible()
}

test('highlights an unpaid sunset event starting today', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'Today Unpaid', date: futureDate(0, 20), participants: [{ userId: 'user-1' }], currentUserPayment: { id: 'pay-1', status: 'PENDING' } },
  ])
  await fetchAndShow(page, 'Today Unpaid')

  await expect(rowFor(page, 'Today Unpaid')).toHaveClass(/table-row-highlight/)
  await expect(rowFor(page, 'Today Unpaid')).toContainText('unpaid')
})

test('highlights an unpaid sunset event starting tomorrow', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'Tomorrow Unpaid', date: futureDate(1, 10), participants: [{ userId: 'user-1' }], currentUserPayment: { id: 'pay-1', status: 'PENDING' } },
  ])
  await fetchAndShow(page, 'Tomorrow Unpaid')

  await expect(rowFor(page, 'Tomorrow Unpaid')).toHaveClass(/table-row-highlight/)
  await expect(rowFor(page, 'Tomorrow Unpaid')).toContainText('unpaid')
})

test('does not highlight a paid sunset event starting today', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'Today Paid', date: futureDate(0, 20), participants: [{ userId: 'user-1' }], currentUserPayment: { id: 'pay-1', status: 'PAID' } },
  ])
  await fetchAndShow(page, 'Today Paid')

  await expect(rowFor(page, 'Today Paid')).not.toHaveClass(/table-row-highlight/)
  await expect(rowFor(page, 'Today Paid')).not.toContainText('unpaid')
})

test('does not highlight an unpaid sunset event beyond tomorrow', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'Later Unpaid', date: futureDate(2, 10), participants: [{ userId: 'user-1' }], currentUserPayment: { id: 'pay-1', status: 'PENDING' } },
  ])
  await fetchAndShow(page, 'Later Unpaid')

  await expect(rowFor(page, 'Later Unpaid')).not.toHaveClass(/table-row-highlight/)
  await expect(rowFor(page, 'Later Unpaid')).not.toContainText('unpaid')
})

test('does not highlight an unpaid event the user does not attend', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'Not Attending', date: futureDate(0, 20), currentUserPayment: { id: 'pay-1', status: 'PENDING' } },
  ])
  await fetchAndShow(page, 'Not Attending')

  await expect(rowFor(page, 'Not Attending')).not.toHaveClass(/table-row-highlight/)
  await expect(rowFor(page, 'Not Attending')).not.toContainText('unpaid')
})

test('highlights an unpaid sunset event with no payment record', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'No Payment Record', date: futureDate(0, 20), participants: [{ userId: 'user-1' }] },
  ])
  await fetchAndShow(page, 'No Payment Record')

  await expect(rowFor(page, 'No Payment Record')).toHaveClass(/table-row-highlight/)
  await expect(rowFor(page, 'No Payment Record')).toContainText('unpaid')
})

test('still highlights an unpaid sunset event that has already ended', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'Ended Unpaid', date: todayStart(), endDate: hoursFromNow(-1), participants: [{ userId: 'user-1' }], currentUserPayment: { id: 'pay-1', status: 'PENDING' } },
  ])
  await fetchAndShow(page, 'Ended Unpaid')

  await expect(rowFor(page, 'Ended Unpaid')).toHaveClass(/table-row-highlight/)
  await expect(rowFor(page, 'Ended Unpaid')).toHaveClass(/table-row-ended/)
  await expect(rowFor(page, 'Ended Unpaid')).toContainText('unpaid')
})

test('highlights an unpaid sunset row in the combined tab', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'Combined Unpaid', date: futureDate(0, 20), participants: [{ userId: 'user-1' }], currentUserPayment: { id: 'pay-1', status: 'PENDING' } },
  ])
  world.givenMeetupEvents([{ id: 'meetup-1', title: 'Padel Meetup' }])
  await fetchAndShow(page, 'Combined Unpaid')
  await tab(page, 'combined').click()
  await expect(page.getByText('Combined Unpaid')).toBeVisible()

  await expect(rowFor(page, 'Combined Unpaid')).toHaveClass(/table-row-highlight/)
  await expect(rowFor(page, 'Combined Unpaid')).toContainText('unpaid')
  await expect(page.getByText('Padel Meetup')).toHaveCount(0)
})
