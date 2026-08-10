import { expect, type Page } from '@playwright/test'
import { test } from './setup/ourTest'

const fetchButton = (page: Page) => page.getByTestId('fetch-events-button')
const tab = (page: Page, name: string) => page.getByTestId(`tab-${name}`)
const attendingToggle = (page: Page) => page.getByTestId('only-attending-toggle')

test('attending toggle sits under the tab header', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel' }])
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('Morning Padel')).toBeVisible()

  await expect(attendingToggle(page)).toBeVisible()
  const tabBox = await tab(page, 'sunset').boundingBox()
  const toggleBox = await attendingToggle(page).boundingBox()
  expect(toggleBox!.y).toBeGreaterThan(tabBox!.y)
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
    { id: 'm1', title: 'Going Meetup', rsvps: { totalCount: 1, edges: [{ node: { member: { id: '176325322' } } }] } },
    { id: 'm2', title: 'Not Going', rsvps: { totalCount: 0, edges: [] } },
  ])
  await page.goto('/')
  await fetchButton(page).click()
  await tab(page, 'meetup').click()
  await expect(page.getByText('Going Meetup')).toBeVisible()
  await expect(page.getByText('Not Going')).toBeVisible()

  await attendingToggle(page).click()

  await expect(page.getByText('Going Meetup')).toBeVisible()
  await expect(page.getByText('Not Going')).toHaveCount(0)
  await expect(tab(page, 'meetup')).toContainText('(1)')
})

test('attending toggle filters the combined tab across sources', async ({ page, world }) => {
  world.givenEvents([
    { id: 'sunset-1', title: 'Sunset Going', participants: [{ userId: 'user-1' }] },
    { id: 'sunset-2', title: 'Sunset Not Going' },
  ])
  world.givenMeetupEvents([
    { id: 'meetup-1', title: 'Meetup Going', rsvps: { totalCount: 1, edges: [{ node: { member: { id: '176325322' } } }] } },
    { id: 'meetup-2', title: 'Meetup Not Going', rsvps: { totalCount: 0, edges: [] } },
  ])
  await page.goto('/')
  await fetchButton(page).click()
  await tab(page, 'combined').click()
  await expect(page.getByText('Sunset Going')).toBeVisible()
  await expect(page.getByText('Meetup Not Going')).toBeVisible()

  await attendingToggle(page).click()

  await expect(page.getByText('Sunset Going')).toBeVisible()
  await expect(page.getByText('Meetup Going')).toBeVisible()
  await expect(page.getByText('Sunset Not Going')).toHaveCount(0)
  await expect(page.getByText('Meetup Not Going')).toHaveCount(0)
  await expect(tab(page, 'combined')).toContainText('(2)')
})
