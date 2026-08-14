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

  await expect(ackAllButton(page)).toHaveCount(0)
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
  await expect(ackAllButton(page)).toHaveCount(0)
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
  await expect(ackAllButton(page)).toHaveCount(0)
  await expect(ackButton(page)).toHaveCount(1)
})

test('ack-all button sits to the right of the filter toggles', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel' }])
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('Morning Padel')).toBeVisible()

  world.givenEvents([
    { id: 'evt-1', title: 'Morning Padel' },
    { id: 'evt-2', title: 'Evening Padel', participants: [{ userId: 'user-1' }] },
    { id: 'evt-3', title: 'Late Night Padel', participants: [{ userId: 'user-1' }] },
  ])
  await fetchButton(page).click()
  await expect(newBadge(page, 'sunset')).toHaveText('2')

  const joined = page.getByTestId('only-attending-toggle')
  const newToggle = page.getByTestId('only-new-toggle')
  const ackAll = page.getByTestId('ack-all-button')
  await expect(joined).toBeVisible()
  await expect(newToggle).toBeVisible()
  await expect(ackAll).toBeVisible()

  const joinedBox = await joined.boundingBox()
  const newBox = await newToggle.boundingBox()
  const ackAllBox = await ackAll.boundingBox()
  expect(joinedBox!.x).toBeLessThan(newBox!.x)
  expect(newBox!.x).toBeLessThan(ackAllBox!.x)
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

test('new-event badges stay fully visible inside their tabs on narrow mobile layouts', async ({ page, world }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  world.givenEvents(Array.from({ length: 8 }, (_, i) => ({ id: `evt-${i + 1}`, title: `Morning Padel ${i + 1}` })))
  world.givenMeetupEvents([
    ...Array.from({ length: 4 }, (_, i) => ({ id: `wg-${i + 1}`, title: `Wolfgang Meetup ${i + 1}`, eventHosts: [{ memberId: '456811393' }] })),
    ...Array.from({ length: 4 }, (_, i) => ({ id: `mt-${i + 1}`, title: `Casual Meetup ${i + 1}`, eventHosts: [{ memberId: 'other-host' }] })),
  ])
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('Morning Padel 1')).toBeVisible()

  world.givenEvents([
    ...Array.from({ length: 8 }, (_, i) => ({ id: `evt-${i + 1}`, title: `Morning Padel ${i + 1}` })),
    { id: 'evt-new', title: 'New Sunset Padel' },
  ])
  world.givenMeetupEvents([
    ...Array.from({ length: 4 }, (_, i) => ({ id: `wg-${i + 1}`, title: `Wolfgang Meetup ${i + 1}`, eventHosts: [{ memberId: '456811393' }] })),
    { id: 'wg-new', title: 'New Wolfgang Meetup', eventHosts: [{ memberId: '456811393' }] },
    ...Array.from({ length: 4 }, (_, i) => ({ id: `mt-${i + 1}`, title: `Casual Meetup ${i + 1}`, eventHosts: [{ memberId: 'other-host' }] })),
    { id: 'mt-new', title: 'New Casual Meetup', eventHosts: [{ memberId: 'other-host' }] },
  ])
  await fetchButton(page).click()

  for (const name of ['combined', 'sunset', 'wolfgang', 'meetup']) {
    const badge = newBadge(page, name)
    await expect(badge).toBeVisible()
    await expect(badge).toHaveText(name === 'combined' ? '3' : '1')
    const badgeBox = await badge.boundingBox()
    const tabBox = await tab(page, name).boundingBox()
    expect(badgeBox!.x).toBeGreaterThanOrEqual(tabBox!.x)
    expect(badgeBox!.x + badgeBox!.width).toBeLessThanOrEqual(tabBox!.x + tabBox!.width)

    const labelText = tab(page, name).locator('.tab-label-text')
    const { scrollWidth, clientWidth, offsetWidth } = await labelText.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      offsetWidth: el.offsetWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
    expect(offsetWidth).toBeGreaterThan(0)
  }
})
