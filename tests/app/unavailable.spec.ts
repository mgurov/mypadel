import { expect, type Page } from '@playwright/test'
import { test } from './setup/ourTest'

const fetchButton = (page: Page) => page.getByTestId('fetch-events-button')
const tab = (page: Page, name: string) => page.getByTestId(`tab-${name}`)
const toggle = (page: Page) => page.getByTestId('unavailable-date-toggle')
const unavailableHeader = (page: Page) => page.locator('.date-group-header.date-group-header-unavailable')

function dateInDays(daysAhead: number, hour: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

test('shows an unavailable toggle on each date group header', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'Morning Padel' },
    { id: 'evt-2', title: 'Evening Padel', date: dateInDays(3, 18) },
  ])
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('Morning Padel')).toBeVisible()

  await expect(toggle(page)).toHaveCount(2)
})

test('marks a date unavailable and flags its events', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'Morning Padel' },
    { id: 'evt-2', title: 'Evening Padel' },
  ])
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('Morning Padel')).toBeVisible()

  await toggle(page).click()
  await expect(toggle(page)).toHaveText('\u2713 unavailable')
  await expect(unavailableHeader(page)).toHaveCount(1)
  await expect(page.locator('.table-row-unavailable')).toHaveCount(2)
})

test('toggling a marked date off clears the unavailable flag', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel' }])
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('Morning Padel')).toBeVisible()

  await toggle(page).click()
  await expect(unavailableHeader(page)).toHaveCount(1)

  await toggle(page).click()
  await expect(unavailableHeader(page)).toHaveCount(0)
  await expect(page.locator('.table-row-unavailable')).toHaveCount(0)
  await expect(toggle(page)).toHaveText('unavailable')
})

test('a marked date stays unavailable across tabs and survives a reload', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Sunset Event' }])
  world.givenMeetupEvents([{ id: 'm1', title: 'Meetup Event', eventHosts: [{ memberId: 'other-host' }] }])
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('Sunset Event')).toBeVisible()

  await toggle(page).click()
  await expect(unavailableHeader(page)).toHaveCount(1)

  await tab(page, 'combined').click()
  await expect(unavailableHeader(page)).toHaveCount(1)
  await expect(page.locator('.table-row-unavailable')).toHaveCount(1)

  await page.reload()
  await fetchButton(page).click()
  await expect(page.getByText('Sunset Event')).toBeVisible()
  await expect(unavailableHeader(page)).toHaveCount(1)

  await tab(page, 'meetup').click()
  await expect(page.getByText('Meetup Event')).toBeVisible()
  await expect(unavailableHeader(page)).toHaveCount(1)
})

test('marks a meetup event date unavailable on its tab', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel' }])
  world.givenMeetupEvents([
    { id: 'm1', title: 'Meetup One', eventHosts: [{ memberId: 'other-host' }] },
    { id: 'm2', title: 'Meetup Two', eventHosts: [{ memberId: 'other-host' }] },
  ])
  await page.goto('/')
  await fetchButton(page).click()
  await tab(page, 'meetup').click()
  await expect(page.getByText('Meetup One')).toBeVisible()

  await toggle(page).click()
  await expect(unavailableHeader(page)).toHaveCount(1)
  await expect(page.locator('.table-row-unavailable')).toHaveCount(2)
})