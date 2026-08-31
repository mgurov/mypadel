import { expect, type Page } from '@playwright/test'
import { test } from './setup/ourTest'

const fetchButton = (page: Page) => page.getByTestId('fetch-events-button')
const tab = (page: Page, name: string) => page.getByTestId(`tab-${name}`)

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

async function fetch(page: Page) {
  await page.goto('/')
  await fetchButton(page).click()
}

async function showMeetup(page: Page, title: string) {
  await fetch(page)
  await tab(page, 'meetup').click()
  await expect(page.getByText(title)).toBeVisible()
}

test('tones down an ended sunset event', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'Ended Sunset', date: todayStart(), endDate: hoursFromNow(-1), participants: [{ userId: 'user-1' }] },
  ])
  await fetch(page)
  await expect(page.getByText('Ended Sunset')).toBeVisible()

  await expect(rowFor(page, 'Ended Sunset')).toHaveClass(/table-row-ended/)
  await expect(rowFor(page, 'Ended Sunset')).not.toHaveClass(/table-row-live/)
})

test('highlights a live sunset event the user attends', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'Live Sunset', date: todayStart(), endDate: hoursFromNow(2), participants: [{ userId: 'user-1' }], currentUserPayment: { id: 'pay-1', status: 'PAID' } },
  ])
  await fetch(page)
  await expect(page.getByText('Live Sunset')).toBeVisible()

  await expect(rowFor(page, 'Live Sunset')).toHaveClass(/table-row-live/)
  await expect(rowFor(page, 'Live Sunset')).not.toHaveClass(/table-row-ended/)
})

test('does not highlight a live sunset event the user does not attend', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'Live Not Attending', date: todayStart(), endDate: hoursFromNow(2), participants: [{ userId: 'other-user' }] },
  ])
  await fetch(page)
  await expect(page.getByText('Live Not Attending')).toBeVisible()

  await expect(rowFor(page, 'Live Not Attending')).not.toHaveClass(/table-row-live/)
  await expect(rowFor(page, 'Live Not Attending')).not.toHaveClass(/table-row-ended/)
})

test('does not highlight a sunset event that has not started', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'Upcoming Sunset', date: hoursFromNow(2), endDate: hoursFromNow(4), participants: [{ userId: 'user-1' }] },
  ])
  await fetch(page)
  await expect(page.getByText('Upcoming Sunset')).toBeVisible()

  await expect(rowFor(page, 'Upcoming Sunset')).not.toHaveClass(/table-row-live/)
  await expect(rowFor(page, 'Upcoming Sunset')).not.toHaveClass(/table-row-ended/)
})

test('tones down an ended meetup event', async ({ page, world }) => {
  world.givenMeetupEvents([
    { id: 'meetup-1', title: 'Ended Meetup', dateTime: hoursFromNow(-3), endTime: hoursFromNow(-1) },
  ])
  await showMeetup(page, 'Ended Meetup')

  await expect(rowFor(page, 'Ended Meetup')).toHaveClass(/table-row-ended/)
  await expect(rowFor(page, 'Ended Meetup')).not.toHaveClass(/table-row-live/)
})

test('highlights a live meetup event the user RSVPs to', async ({ page, world }) => {
  world.givenMeetupEvents([
    { id: 'meetup-1', title: 'Live Meetup', dateTime: hoursFromNow(-1), endTime: hoursFromNow(1), rsvps: { totalCount: 1, edges: [{ node: { member: { id: '176325322', name: 'My Member' } } }] } },
  ])
  await showMeetup(page, 'Live Meetup')

  await expect(rowFor(page, 'Live Meetup')).toHaveClass(/table-row-live/)
  await expect(rowFor(page, 'Live Meetup')).not.toHaveClass(/table-row-ended/)
})

test('does not highlight a live meetup event the user does not RSVP to', async ({ page, world }) => {
  world.givenMeetupEvents([
    { id: 'meetup-1', title: 'Live Meetup Not Going', dateTime: hoursFromNow(-1), endTime: hoursFromNow(1), rsvps: { totalCount: 0, edges: [] } },
  ])
  await showMeetup(page, 'Live Meetup Not Going')

  await expect(rowFor(page, 'Live Meetup Not Going')).not.toHaveClass(/table-row-live/)
  await expect(rowFor(page, 'Live Meetup Not Going')).not.toHaveClass(/table-row-ended/)
})
