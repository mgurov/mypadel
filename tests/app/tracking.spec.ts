import { expect, type Page } from '@playwright/test'
import { test } from './setup/ourTest'

const fetchButton = (page: Page) => page.getByTestId('fetch-events-button')
const tab = (page: Page, name: string) => page.getByTestId(`tab-${name}`)
const newBadge = (page: Page, name: string) => tab(page, name).locator('.new-badge')
const ackAllButton = (page: Page) => page.getByTestId('ack-all-button')
const ackButton = (page: Page) => page.getByTestId('ack-button')

test('first fetch treats every event as already known', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel' }])
  world.givenMeetupEvents([{ id: 'meetup-1', title: 'Padel Meetup' }])
  await page.goto('/')

  await fetchButton(page).click()
  await expect(page.getByText('Morning Padel')).toBeVisible()

  await expect(newBadge(page, 'sunset')).toHaveCount(0)
  await expect(newBadge(page, 'meetup')).toHaveCount(0)
  await expect(ackAllButton(page)).toHaveCount(0)
  await expect(page.getByTestId('only-new-toggle')).toHaveCount(0)
  await expect(page.locator('.new-label')).toHaveCount(0)
})

test('marks a newly fetched event with a badge, ack-all button, and row ack', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'Morning Padel' },
    { id: 'evt-2', title: 'Evening Padel' },
  ])
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('Morning Padel')).toBeVisible()

  world.givenEvents([
    { id: 'evt-1', title: 'Morning Padel' },
    { id: 'evt-2', title: 'Evening Padel' },
    { id: 'evt-3', title: 'Late Night Padel' },
  ])
  await fetchButton(page).click()
  await expect(newBadge(page, 'sunset')).toHaveText('1')
  await expect(newBadge(page, 'combined')).toHaveText('1')

  await expect(ackAllButton(page)).toContainText('Ack all 1 new events')
  await expect(ackButton(page)).toHaveCount(1)

  await expect(page.locator('.events-table .new-label')).toHaveCount(1)
})

test('ack acknowledges a single new event', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel' }])
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('Morning Padel')).toBeVisible()

  world.givenEvents([
    { id: 'evt-1', title: 'Morning Padel' },
    { id: 'evt-2', title: 'Evening Padel' },
    { id: 'evt-3', title: 'Late Night Padel' },
  ])
  await fetchButton(page).click()
  await expect(newBadge(page, 'sunset')).toHaveText('2')

  await ackButton(page).first().click()

  await expect(newBadge(page, 'sunset')).toHaveText('1')
  await expect(ackAllButton(page)).toContainText('Ack all 1 new events')
  await expect(ackButton(page)).toHaveCount(1)
})

test('ack all acknowledges every new event and survives refetch', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel' }])
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('Morning Padel')).toBeVisible()

  world.givenEvents([
    { id: 'evt-1', title: 'Morning Padel' },
    { id: 'evt-2', title: 'Evening Padel' },
    { id: 'evt-3', title: 'Late Night Padel' },
  ])
  await fetchButton(page).click()
  await expect(newBadge(page, 'sunset')).toHaveText('2')

  await ackAllButton(page).click()

  await expect(newBadge(page, 'sunset')).toHaveCount(0)
  await expect(ackAllButton(page)).toHaveCount(0)
  await expect(page.getByTestId('only-new-toggle')).toHaveCount(0)
  await expect(page.locator('.new-label')).toHaveCount(0)

  await fetchButton(page).click()
  await expect(newBadge(page, 'sunset')).toHaveCount(0)
  await expect(ackAllButton(page)).toHaveCount(0)
})

test('keeps sunset and meetup ids distinct in storage', async ({ page, world }) => {
  world.givenMeetupEvents([{ id: '42', title: 'Padel Meetup' }])
  await page.goto('/')
  await fetchButton(page).click()
  await tab(page, 'meetup').click()
  await expect(page.getByText('Padel Meetup')).toBeVisible()

  world.givenEvents([{ id: '42', title: 'Morning Padel' }])
  await fetchButton(page).click()
  await expect(newBadge(page, 'sunset')).toHaveText('1')
  await expect(newBadge(page, 'meetup')).toHaveCount(0)
  await expect(newBadge(page, 'combined')).toHaveText('1')
})

test('tracks new meetup events on their tab', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel' }])
  world.givenMeetupEvents([{ id: 'meetup-1', title: 'Padel Meetup' }])
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('Morning Padel')).toBeVisible()

  world.givenMeetupEvents([
    { id: 'meetup-1', title: 'Padel Meetup' },
    { id: 'meetup-2', title: 'Casual Padel', eventHosts: [{ memberId: 'other-host' }] },
  ])
  await fetchButton(page).click()
  await expect(newBadge(page, 'meetup')).toHaveText('1')
  await expect(newBadge(page, 'combined')).toHaveText('1')

  await tab(page, 'meetup').click()
  await expect(ackAllButton(page)).toContainText('Ack all 1 new events')
  await expect(ackButton(page)).toHaveCount(1)
})

test('only-new toggle filters the table to new events', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'Morning Padel' },
    { id: 'evt-2', title: 'Evening Padel' },
  ])
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('Morning Padel')).toBeVisible()

  world.givenEvents([
    { id: 'evt-1', title: 'Morning Padel' },
    { id: 'evt-2', title: 'Evening Padel' },
    { id: 'evt-3', title: 'Late Night Padel' },
  ])
  await fetchButton(page).click()
  await expect(newBadge(page, 'sunset')).toHaveText('1')

  const toggle = page.getByTestId('only-new-toggle')
  await expect(toggle).not.toBeChecked()
  await toggle.click()

  await expect(toggle).toBeChecked()
  await expect(page.getByText('Morning Padel')).toHaveCount(0)
  await expect(page.getByText('Late Night Padel')).toBeVisible()

  await ackButton(page).first().click()

  await expect(page.getByText('Morning Padel')).toBeVisible()
  await expect(ackAllButton(page)).toHaveCount(0)
  await expect(page.getByTestId('only-new-toggle')).toHaveCount(0)
})
