import { expect } from '@playwright/test'
import fs from 'node:fs'
import { test } from './setup/ourTest'
import type { World, WorldEventInput } from './setup/wordlyTest'

const icsTime = (iso: string) => iso.slice(0, 19).replace(/[-:]/g, '') + 'Z'

async function loadEvents(world: World, events: WorldEventInput[], page: import('@playwright/test').Page) {
  const resolved = world.givenEvents(events)
  await page.goto('/')
  await page.getByTestId('fetch-events-button').click()
  await expect(page.getByText(resolved[0].title)).toBeVisible()
  return resolved
}

async function downloadCalendar(page: import('@playwright/test').Page, index = 0) {
  await page.getByTestId('event-actions-button').nth(index).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: 'Add to Calendar' }).click(),
  ])
  return download
}

test('downloads an ics file for the first event', async ({ page, world }) => {
  const [first] = await loadEvents(world, [
    { id: 'evt-1', title: 'Morning Padel', description: 'Join us for padel', location: 'Court 1', disclaimer: 'Bring water' },
    { id: 'evt-2', title: 'Evening Padel' },
  ], page)

  const download = await downloadCalendar(page)

  expect(download.suggestedFilename()).toBe('Morning-Padel.ics')
  const content = fs.readFileSync((await download.path())!, 'utf8')
  expect(content).toContain('BEGIN:VCALENDAR')
  expect(content).toContain('END:VCALENDAR')
  expect(content).toContain('SUMMARY:M: Padel Morning Padel')
  expect(content).toContain(`UID:evt-1@mypadel`)
  expect(content).toContain(`DTSTART:${icsTime(first.date)}`)
  expect(content).toContain(`DTEND:${icsTime(first.endDate)}`)
  expect(content).toContain('LOCATION:Court 1')
  expect(content).toContain('DESCRIPTION:Join us for padel')
  expect(content).toContain('URL:https://sunsetpadel.at/events/evt-1')
})

test('each event downloads its own ics file', async ({ page, world }) => {
  const [, evening] = await loadEvents(world, [
    { id: 'evt-1', title: 'Morning Padel' },
    { id: 'evt-2', title: 'Evening Padel' },
  ], page)
  await expect(page.getByText('Evening Padel')).toBeVisible()

  const download = await downloadCalendar(page, 1)

  expect(download.suggestedFilename()).toBe('Evening-Padel.ics')
  const content = fs.readFileSync((await download.path())!, 'utf8')
  expect(content).toContain('SUMMARY:M: Padel Evening Padel')
  expect(content).toContain('UID:evt-2@mypadel')
  expect(content).toContain(`DTSTART:${icsTime(evening.date)}`)
})

test('keeps the UTC timezone designation on dates', async ({ page, world }) => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(16, 0, 0, 0)
  const endDate = new Date(date)
  endDate.setHours(18, 0, 0, 0)

  await loadEvents(world, [
    {
      id: 'evt-1',
      title: 'Morning Padel',
      date: date.toISOString(),
      endDate: endDate.toISOString(),
    },
  ], page)

  const download = await downloadCalendar(page)

  const content = fs.readFileSync((await download.path())!, 'utf8')
  expect(content).toContain(`DTSTART:${icsTime(date.toISOString())}`)
  expect(content).toContain(`DTEND:${icsTime(endDate.toISOString())}`)
})

test('escapes special characters in ics text fields', async ({ page, world }) => {
  await loadEvents(world, [
    { id: 'evt-1', title: 'Team A, B; C', description: 'Line 1\nLine 2, ok' },
  ], page)
  await expect(page.getByText('Team A, B; C')).toBeVisible()

  const download = await downloadCalendar(page)

  expect(download.suggestedFilename()).toBe('Team-A-B-C.ics')
  const content = fs.readFileSync((await download.path())!, 'utf8')
  expect(content).toContain('SUMMARY:M: Padel Team A\\, B\\; C')
  expect(content).toContain('DESCRIPTION:Line 1\\nLine 2\\, ok')
})

test('downloads an ics file for a meetup event', async ({ page, world }) => {
  const dateTime = new Date()
  dateTime.setDate(dateTime.getDate() + 2)
  dateTime.setHours(18, 30, 0, 0)

  world.givenMeetupEvents([
    {
      id: 'meetup-1',
      title: 'Padel Meetup',
      dateTime: dateTime.toISOString(),
      eventUrl: 'https://www.meetup.com/vienna-sports-meetup/events/42/',
      venue: { id: 'venue-1', name: 'Vienna Court' },
    },
  ])
  await page.goto('/')
  await page.getByTestId('fetch-events-button').click()
  await page.getByTestId('tab-meetup').click()
  await expect(page.getByText('Padel Meetup')).toBeVisible()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Calendar' }).click(),
  ])

  expect(download.suggestedFilename()).toBe('Padel-Meetup.ics')
  const content = fs.readFileSync((await download.path())!, 'utf8')
  expect(content).toContain('BEGIN:VCALENDAR')
  expect(content).toContain('END:VCALENDAR')
  expect(content).toContain('SUMMARY:M: Padel Padel Meetup')
  expect(content).toContain(`UID:meetup-1@mypadel`)
  expect(content).toContain(`DTSTART:${icsTime(dateTime.toISOString())}`)
  expect(content).toContain('LOCATION:Vienna Court')
  expect(content).toContain('URL:https://www.meetup.com/vienna-sports-meetup/events/42/')
})
