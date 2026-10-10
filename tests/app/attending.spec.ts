import { expect, type Page } from '@playwright/test'
import { test } from './setup/ourTest'

const fetchButton = (page: Page) => page.getByTestId('fetch-events-button')
const tab = (page: Page, name: string) => page.getByTestId(`tab-${name}`)
const openTab = async (page: Page, name: string) => {
  await tab(page, 'more').click()
  await tab(page, name).click()
}
const attendingToggle = (page: Page) => page.getByTestId('only-attending-toggle')

test('attending toggle sits under the tab header', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel', participants: [{ userId: 'user-1' }] }])
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('Morning Padel')).toBeVisible()

  await expect(attendingToggle(page)).toBeVisible()
  const tabBox = await tab(page, 'sunset').boundingBox()
  const toggleBox = await attendingToggle(page).boundingBox()
  expect(toggleBox!.y).toBeGreaterThan(tabBox!.y)
})

test('attending toggle is hidden when the active tab has no joined events', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel' }])
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('Morning Padel')).toBeVisible()

  await expect(attendingToggle(page)).toHaveCount(0)
})

test('attending toggle appears on tabs that have joined events and hides on those without', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel', participants: [{ userId: 'user-1' }] }])
  world.givenMeetupEvents([
    { id: 'm1', title: 'Meetup One', rsvps: { totalCount: 0, edges: [] } },
    { id: 'm2', title: 'Meetup Two', rsvps: { totalCount: 0, edges: [] } },
  ])
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('Morning Padel')).toBeVisible()

  await expect(attendingToggle(page)).toBeVisible()

  await openTab(page, 'meetup')
  await expect(page.getByText('Meetup One')).toBeVisible()
  await expect(attendingToggle(page)).toHaveCount(0)
})

test('attending toggle shows only sunset events the user participates in', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'Morning Padel', participants: [{ userId: 'user-1' }] },
    { id: 'evt-2', title: 'Evening Padel' },
  ])
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('Morning Padel')).toBeVisible()
  await expect(page.getByText('Evening Padel')).toBeVisible()

  const toggle = attendingToggle(page)
  await toggle.click()
  await expect(toggle).toBeChecked()

  await expect(page.getByText('Morning Padel')).toBeVisible()
  await expect(page.getByText('Evening Padel')).toHaveCount(0)
  await expect(tab(page, 'sunset')).toContainText('(1)')

  await toggle.click()
  await expect(toggle).not.toBeChecked()

  await expect(page.getByText('Evening Padel')).toBeVisible()
  await expect(tab(page, 'sunset')).toContainText('(2)')
})

test('attending toggle includes waitlisted events', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'Morning Padel', currentUserWaitlistPosition: 2 },
    { id: 'evt-2', title: 'Evening Padel' },
  ])
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('Evening Padel')).toBeVisible()

  await attendingToggle(page).click()

  await expect(page.getByText('Morning Padel')).toBeVisible()
  await expect(page.getByText('Evening Padel')).toHaveCount(0)
})

test('attending toggle shows only meetup events the user RSVPs to', async ({ page, world }) => {
  world.givenMeetupEvents([
    { id: 'm1', title: 'Going Meetup', rsvps: { totalCount: 1, edges: [{ node: { member: { id: '176325322', name: 'My Member' } } }] } },
    { id: 'm2', title: 'Not Going', rsvps: { totalCount: 0, edges: [] } },
  ])
  await page.goto('/')
  await fetchButton(page).click()
  await openTab(page, 'meetup')
  await expect(page.getByText('Going Meetup')).toBeVisible()
  await expect(page.getByText('Not Going')).toBeVisible()

  await attendingToggle(page).click()

  await expect(page.getByText('Going Meetup')).toBeVisible()
  await expect(page.getByText('Not Going')).toHaveCount(0)
  await expect(tab(page, 'more')).toContainText('Adina (1)')
})

test('shows a question mark for a meetup event with more than five attendees that may hide the user', async ({ page, world }) => {
  const edges = Array.from({ length: 6 }, (_, i) => ({ node: { member: { id: `member-${i}`, name: `Member ${i}` } } }))
  world.givenMeetupEvents([
    { id: 'm1', title: 'Big Meetup', rsvps: { totalCount: 6, edges } },
    { id: 'm2', title: 'Small Meetup', rsvps: { totalCount: 5, edges: edges.slice(0, 5) } },
    { id: 'm3', title: 'My Meetup', rsvps: { totalCount: 6, edges: [{ node: { member: { id: '176325322', name: 'My Member' } } }, ...edges] } },
  ])
  await page.goto('/')
  await fetchButton(page).click()
  await openTab(page, 'meetup')

  await expect(page.locator('.table-row').filter({ hasText: 'Big Meetup' }).locator('.participating-question')).toHaveText('?')
  await expect(page.locator('.table-row').filter({ hasText: 'Small Meetup' }).locator('.participating-question')).toHaveCount(0)
  await expect(page.locator('.table-row').filter({ hasText: 'My Meetup' }).locator('.participating-question')).toHaveCount(0)
  await expect(page.locator('.table-row').filter({ hasText: 'My Meetup' }).locator('.participating-yes')).toHaveText('\u2713')
})

test('force-marks meetup attendance via the actions menu', async ({ page, world }) => {
  world.givenMeetupEvents([
    { id: 'm1', title: 'Big Meetup', rsvps: { totalCount: 6, edges: [] } },
    { id: 'm2', title: 'Joined Meetup', rsvps: { totalCount: 6, edges: [{ node: { member: { id: '176325322', name: 'My Member' } } }] } },
  ])
  await page.goto('/')
  await fetchButton(page).click()
  await openTab(page, 'meetup')

  const bigRow = page.locator('.table-row').filter({ hasText: 'Big Meetup' })
  const joinedRow = page.locator('.table-row').filter({ hasText: 'Joined Meetup' })
  await expect(bigRow.locator('.participating-question')).toHaveText('?')
  await expect(joinedRow.locator('.participating-yes')).toHaveText('\u2713')

  await bigRow.getByTestId('event-actions-button').click()
  await page.getByTestId('mark-attending').click()
  await expect(bigRow.locator('.participating-yes')).toHaveText('\u2713')
  await expect(bigRow.locator('.participating-question')).toHaveCount(0)

  await joinedRow.getByTestId('event-actions-button').click()
  await page.getByTestId('mark-not-attending').click()
  await expect(joinedRow.locator('.participating-no')).toHaveText('\u2014')

  await attendingToggle(page).click()
  await expect(page.getByText('Big Meetup')).toBeVisible()
  await expect(page.getByText('Joined Meetup')).toHaveCount(0)
})

test('persists forced meetup attendance across a reload', async ({ page, world }) => {
  world.givenMeetupEvents([
    { id: 'm1', title: 'Big Meetup', rsvps: { totalCount: 6, edges: [] } },
    { id: 'm2', title: 'Joined Meetup', rsvps: { totalCount: 6, edges: [{ node: { member: { id: '176325322', name: 'My Member' } } }] } },
  ])
  await page.goto('/')
  await fetchButton(page).click()
  await openTab(page, 'meetup')

  await page.locator('.table-row').filter({ hasText: 'Big Meetup' }).getByTestId('event-actions-button').click()
  await page.getByTestId('mark-attending').click()
  await page.locator('.table-row').filter({ hasText: 'Joined Meetup' }).getByTestId('event-actions-button').click()
  await page.getByTestId('mark-not-attending').click()

  await page.reload()
  await fetchButton(page).click()
  await openTab(page, 'meetup')
  await expect(page.locator('.table-row').filter({ hasText: 'Big Meetup' }).locator('.participating-yes')).toHaveText('\u2713')
  await expect(page.locator('.table-row').filter({ hasText: 'Joined Meetup' }).locator('.participating-no')).toHaveText('\u2014')
})

test('attending toggle filters the combined tab across sources', async ({ page, world }) => {
  world.givenEvents([
    { id: 'sunset-1', title: 'Sunset Going', participants: [{ userId: 'user-1' }] },
    { id: 'sunset-2', title: 'Sunset Not Going' },
  ])
  world.givenMeetupEvents([
    { id: 'meetup-1', title: 'Meetup Going', rsvps: { totalCount: 1, edges: [{ node: { member: { id: '176325322', name: 'My Member' } } }] } },
    { id: 'meetup-2', title: 'Meetup Not Going', rsvps: { totalCount: 0, edges: [] } },
  ])
  await page.goto('/')
  await fetchButton(page).click()
  await tab(page, 'combined').click()
  await expect(page.getByText('Sunset Going')).toBeVisible()
  await expect(page.getByText('Sunset Not Going')).toBeVisible()
  await expect(page.getByText('Meetup Not Going')).toHaveCount(0)

  await attendingToggle(page).click()

  await expect(page.getByText('Sunset Going')).toBeVisible()
  await expect(page.getByText('Sunset Not Going')).toHaveCount(0)
  await expect(page.getByText('Meetup Going')).toHaveCount(0)
  await expect(tab(page, 'combined')).toContainText('(1)')
})
