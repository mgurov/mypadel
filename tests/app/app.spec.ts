import { expect, type Locator, type Page } from '@playwright/test'
import { test } from './setup/ourTest'
import { AnnotationNoCredPrefill } from './setup/credentialsFixture'

const credentialsButton = (page: Page) => page.getByTestId('credentials-button')
const credentialsSetButton = (page: Page) => page.getByTestId('credentials-button')
const fetchButton = (page: Page) => page.getByTestId('fetch-events-button')
const tab = (page: Page, name: string) => page.getByTestId(`tab-${name}`)

function futureDate(daysAhead: number, hour: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

const expectVariant = (button: Locator, variant: 'contained' | 'outlined') =>
  expect(button).toHaveClass(new RegExp(`MuiButton-${variant}`))

async function fillCredentials(page: Page, authKey: string, email: string, password: string) {
  await credentialsButton(page).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('x-myko-auth').fill(authKey)
  await dialog.getByLabel('Email').fill(email)
  await dialog.getByLabel('Password').fill(password)
  await dialog.getByRole('button', { name: 'Save' }).click()
}

test('shows main controls', AnnotationNoCredPrefill, async ({ page }) => {
  await page.goto('/')
  await expect(credentialsButton(page)).toBeVisible()
  await expect(fetchButton(page)).toBeVisible()
})

test('credentials dialog contains all three fields', AnnotationNoCredPrefill, async ({ page }) => {
  await page.goto('/')
  await credentialsButton(page).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('x-myko-auth')).toBeVisible()
  await expect(dialog.getByLabel('Email')).toBeVisible()
  await expect(dialog.getByLabel('Password')).toBeVisible()
})

test('button indicates all three pieces missing by default', AnnotationNoCredPrefill, async ({ page }) => {
  await page.goto('/')
  await expectVariant(credentialsButton(page), 'contained')
  await expectVariant(fetchButton(page), 'outlined')
})

test('button indicates missing email and password when only auth key is set', AnnotationNoCredPrefill, async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('myko-auth-key', 'test-secret-key')
  })
  await page.goto('/')
  await expectVariant(credentialsButton(page), 'contained')
  await expectVariant(fetchButton(page), 'outlined')
})

test('button indicates missing auth key when only credentials are set', AnnotationNoCredPrefill, async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('myko-cred-email', 'player@example.com')
    localStorage.setItem('myko-cred-password', 'hunter2')
  })
  await page.goto('/')
  await expectVariant(credentialsButton(page), 'contained')
  await expectVariant(fetchButton(page), 'outlined')
})

test('saving all three credentials sets button and localStorage', AnnotationNoCredPrefill, async ({ page }) => {
  await page.goto('/')
  await fillCredentials(page, 'test-secret-key', 'player@example.com', 'hunter2')

  await expect(credentialsSetButton(page)).toBeVisible()
  await expectVariant(credentialsSetButton(page), 'outlined')
  await expectVariant(fetchButton(page), 'contained')
  expect(await page.evaluate(() => localStorage.getItem('myko-auth-key'))).toBe('test-secret-key')
  expect(await page.evaluate(() => localStorage.getItem('myko-cred-email'))).toBe('player@example.com')
  expect(await page.evaluate(() => localStorage.getItem('myko-cred-password'))).toBe('hunter2')
})

test('saving a partial set still indicates what is missing', AnnotationNoCredPrefill, async ({ page }) => {
  await page.goto('/')
  await credentialsButton(page).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('x-myko-auth').fill('test-secret-key')
  await dialog.getByLabel('Email').fill('player@example.com')
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(credentialsButton(page)).toBeVisible()
  await expectVariant(credentialsButton(page), 'contained')
  await expectVariant(fetchButton(page), 'outlined')
  expect(await page.evaluate(() => localStorage.getItem('myko-cred-password'))).toBe('')
})

test('dialog prefills saved values on reopen', AnnotationNoCredPrefill, async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('myko-auth-key', 'saved-key')
    localStorage.setItem('myko-cred-email', 'saved@example.com')
    localStorage.setItem('myko-cred-password', 'saved-pass')
  })
  await page.goto('/')
  await credentialsSetButton(page).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('x-myko-auth')).toHaveValue('saved-key')
  await expect(dialog.getByLabel('Email')).toHaveValue('saved@example.com')
  await expect(dialog.getByLabel('Password')).toHaveValue('saved-pass')
})

test('cancel does not save credentials', AnnotationNoCredPrefill, async ({ page }) => {
  await page.goto('/')
  await credentialsButton(page).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('x-myko-auth').fill('test-secret-key')
  await dialog.getByLabel('Email').fill('player@example.com')
  await dialog.getByLabel('Password').fill('hunter2')
  await dialog.getByRole('button', { name: 'Cancel' }).click()

  await expect(credentialsButton(page)).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('myko-auth-key'))).toBeNull()
  expect(await page.evaluate(() => localStorage.getItem('myko-cred-email'))).toBeNull()
  expect(await page.evaluate(() => localStorage.getItem('myko-cred-password'))).toBeNull()
})

test('fetches and displays events after setting credentials', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'Morning Padel' },
    { id: 'evt-2', title: 'Evening Padel' },
  ])
  await page.goto('/')

  await fetchButton(page).click()

  await expect(page.getByText('Morning Padel')).toBeVisible()
  await expect(page.getByText('Evening Padel')).toBeVisible()
  await expect(page.getByText('3 (8)').first()).toBeVisible()
  await expect(page.getByText('1500')).toBeVisible()
  await expectVariant(credentialsSetButton(page), 'outlined')
  await expectVariant(fetchButton(page), 'contained')
})

test('actions menu offers show json, calendar, and open event', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel' }])
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('Morning Padel')).toBeVisible()

  await page.getByRole('button', { name: 'Actions' }).first().click()

  await expect(page.getByRole('menuitem', { name: 'Show JSON' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Add to Calendar' })).toBeVisible()
  const openEvent = page.getByRole('menuitem', { name: 'Open Event' })
  await expect(openEvent).toBeVisible()
  await expect(openEvent).toHaveAttribute('href', 'https://sunsetpadel.at/events/evt-1')
  await expect(openEvent).toHaveAttribute('target', '_blank')
})

test('show json action opens event details dialog', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel' }])
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('Morning Padel')).toBeVisible()

  await page.getByRole('button', { name: 'Actions' }).first().click()
  await page.getByRole('menuitem', { name: 'Show JSON' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('"participants": []')).toBeVisible()
})

test('shows error alert when fetch fails', async ({ page }) => {
  await page.route('**/.netlify/functions/events', (route) =>
    route.fulfill({ status: 401, json: { error: 'unauthorized' } }),
  )
  await page.goto('/')

  await fetchButton(page).click()

  await expect(page.getByRole('alert').filter({ hasText: 'Failed to fetch events' })).toContainText('Failed to fetch events')
})

test('page background stays light even in dark color scheme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')

  const bg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)
  expect(bg).toBe('rgb(255, 255, 255)')
})

test('actions button wraps below participants on narrow screens', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel' }])
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('Morning Padel')).toBeVisible()

  const participants = page.locator('.width-56').first()
  const actions = page.getByRole('button', { name: 'Actions' }).first()

  const overlap = async () => {
    const [a, p] = await Promise.all([actions.boundingBox(), participants.boundingBox()])
    return a && p && a.y < p.y + p.height && a.y + a.height > p.y
  }

  await page.setViewportSize({ width: 375, height: 812 })
  await expect.poll(overlap).toBe(false)

  await page.setViewportSize({ width: 1280, height: 720 })
  await expect.poll(overlap).toBe(true)
})

test('date cell moves below title on narrow screens', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel' }])
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('Morning Padel')).toBeVisible()

  const row = page.locator('.table-row').first()
  const title = row.locator('> .column').nth(0)
  const date = row.locator('> .column').nth(1)

  const dateBelowTitle = async () => {
    const [d, t] = await Promise.all([date.boundingBox(), title.boundingBox()])
    return d && t && d.y > t.y
  }
  const dateSameRowAsTitle = async () => {
    const [d, t] = await Promise.all([date.boundingBox(), title.boundingBox()])
    return d && t && d.y === t.y
  }

  await page.setViewportSize({ width: 375, height: 812 })
  await expect.poll(dateBelowTitle).toBe(true)

  await page.setViewportSize({ width: 1280, height: 720 })
  await expect.poll(dateSameRowAsTitle).toBe(true)
})

test('fetch events refreshes event details', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'Morning Padel' },
    { id: 'evt-2', title: 'Evening Padel' },
  ])
  await page.goto('/')

  const fetchBtn = page.getByTestId('fetch-events-button')
  const participation = page.locator('.width-28').first()

  await fetchBtn.click()
  await expect(participation).toContainText('—')

  world.givenEvents([
    { id: 'evt-1', title: 'Morning Padel', participants: [{ userId: 'user-1' }] },
    { id: 'evt-2', title: 'Evening Padel' },
  ])
  await fetchBtn.click()
  await expect(participation).toContainText('✓')
})

test('keeps previous event details visible while refetching', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel' }])
  await page.goto('/')

  const fetchBtn = page.getByTestId('fetch-events-button')
  const participation = page.locator('.width-28').first()
  const spinner = page.locator('.participation-cell .MuiCircularProgress-root')

  await fetchBtn.click()
  await expect(participation).toContainText('—')
  await expect(spinner).toHaveCount(0)

  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel', participants: [{ userId: 'user-1' }] }])

  let release!: () => void
  const held = new Promise<void>((r) => { release = r })
  await page.route('**/event-details*', async (route) => {
    await held
    await route.fallback()
  })

  await fetchBtn.click()

  await expect(spinner).toHaveCount(1)
  await expect(participation).toContainText('—')

  release()

  await expect(spinner).toHaveCount(0)
  await expect(participation).toContainText('✓')
})

test('shows an error icon when event details fetch fails with 404', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel' }])
  await page.route('**/event-details*', (route) =>
    route.fulfill({ status: 404, json: { error: 'not found' } }),
  )
  await page.goto('/')

  await fetchButton(page).click()

  await expect(page.getByText('Morning Padel')).toBeVisible()

  const participation = page.locator('.participation-cell').first()
  const errorIcon = page.getByTestId('event-detail-error')
  await expect(errorIcon).toBeVisible()
  await expect(participation.locator('.MuiCircularProgress-root')).toHaveCount(0)

  await errorIcon.hover()
  const tooltip = page.getByRole('tooltip')
  await expect(tooltip).toContainText('Failed to load event details')
  await expect(tooltip).toContainText('404')

  await errorIcon.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Failed to load event details')
  await expect(dialog).toContainText('404')
})

test('shows the waitlist position for a waiting user', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel', currentUserWaitlistPosition: 3 }])
  await page.goto('/')

  await fetchButton(page).click()

  await expect(page.locator('.width-28').first()).toContainText('⏳')
  await expect(page.locator('.width-28').first()).toContainText('3')
})

test('hides tabs before the first fetch', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel' }])
  world.givenMeetupEvents([{ id: 'meetup-1', title: 'Padel Meetup' }])
  await page.goto('/')

  await expect(tab(page, 'sunset')).toHaveCount(0)

  await fetchButton(page).click()

  await expect(tab(page, 'sunset')).toBeVisible()
})

test('shows a fetch indicator on tabs while their source is fetched', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel' }])
  world.givenMeetupEvents([{ id: 'meetup-1', title: 'Padel Meetup' }])
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('Morning Padel')).toBeVisible()

  let releaseSunset!: () => void
  const heldSunset = new Promise<void>((r) => { releaseSunset = r })
  await page.route('**/.netlify/functions/events', async (route) => {
    await heldSunset
    await route.fallback()
  })
  let releaseMeetup!: () => void
  const heldMeetup = new Promise<void>((r) => { releaseMeetup = r })
  await page.route('**/.netlify/functions/proxy/gql2', async (route) => {
    await heldMeetup
    await route.fallback()
  })

  await fetchButton(page).click()

  await expect(tab(page, 'combined').locator('.MuiCircularProgress-root')).toHaveCount(1)
  await expect(tab(page, 'sunset').locator('.MuiCircularProgress-root')).toHaveCount(1)
  await expect(tab(page, 'wolfgang').locator('.MuiCircularProgress-root')).toHaveCount(1)
  await expect(tab(page, 'meetup').locator('.MuiCircularProgress-root')).toHaveCount(1)

  releaseSunset()
  releaseMeetup()

  await expect(tab(page, 'sunset').locator('.MuiCircularProgress-root')).toHaveCount(0)
  await expect(tab(page, 'wolfgang').locator('.MuiCircularProgress-root')).toHaveCount(0)
  await expect(tab(page, 'combined').locator('.MuiCircularProgress-root')).toHaveCount(0)
})

test('sunset tab is open by default after fetching', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel' }])
  world.givenMeetupEvents([{ id: 'meetup-1', title: 'Padel Meetup' }])
  await page.goto('/')

  await fetchButton(page).click()

  await expect(tab(page, 'sunset')).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Morning Padel')).toBeVisible()
  await expect(page.getByText('Padel Meetup')).toHaveCount(0)
})

test('tabs show the number of fetched entries', async ({ page, world }) => {
  world.givenEvents([
    { id: 'evt-1', title: 'Morning Padel' },
    { id: 'evt-2', title: 'Evening Padel' },
  ])
  world.givenMeetupEvents([
    { id: 'meetup-wolfgang', title: 'Wolfgang Padel', eventHosts: [{ memberId: '456811393' }] },
    { id: 'meetup-casual', title: 'Casual Padel' },
  ])
  await page.goto('/')

  await fetchButton(page).click()

  await expect(tab(page, 'combined')).toContainText('(4)')
  await expect(tab(page, 'sunset')).toContainText('(2)')
  await expect(tab(page, 'wolfgang')).toContainText('(1)')
  await expect(tab(page, 'meetup')).toContainText('(1)')
})

test('tabs use the same colors as the source labels', async ({ page, world }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel' }])
  world.givenMeetupEvents([
    { id: 'meetup-wolfgang', title: 'Wolfgang Padel', eventHosts: [{ memberId: '456811393' }] },
    { id: 'meetup-casual', title: 'Casual Padel' },
  ])
  await page.goto('/')

  await fetchButton(page).click()

  await expect(tab(page, 'combined')).toHaveCSS('background-color', 'rgb(107, 99, 117)')
  await expect(tab(page, 'sunset')).toHaveCSS('background-color', 'rgb(170, 59, 255)')
  await expect(tab(page, 'wolfgang')).toHaveCSS('background-color', 'rgb(46, 125, 50)')
  await expect(tab(page, 'meetup')).toHaveCSS('background-color', 'rgb(25, 118, 210)')
  await expect(tab(page, 'sunset')).toHaveCSS('color', 'rgb(255, 255, 255)')
})

test('combined tab merges sunset and meetup events chronologically', async ({ page, world }) => {
  world.givenEvents([
    { id: 'sunset-later', title: 'Sunset Later', date: futureDate(3, 18) },
  ])
  world.givenMeetupEvents([
    { id: 'meetup-earlier', title: 'Meetup Earlier', dateTime: futureDate(2, 9) },
    { id: 'meetup-wolfgang', title: 'Wolfgang Meetup', dateTime: futureDate(3, 9), eventHosts: [{ memberId: '456811393' }] },
  ])
  await page.goto('/')

  await fetchButton(page).click()
  await tab(page, 'combined').click()

  const rows = page.locator('.table-row-group')
  await expect(rows).toHaveCount(3)
  await expect(rows.nth(0)).toContainText('Meetup Earlier')
  await expect(rows.nth(1)).toContainText('Wolfgang Meetup')
  await expect(rows.nth(2)).toContainText('Sunset Later')

  await expect(rows.nth(0).locator('.source-label')).toHaveText('Meetup')
  await expect(rows.nth(1).locator('.source-label')).toHaveText('Wolfgang')
  await expect(rows.nth(2).locator('.source-label')).toHaveText('Sunset')
})

test('meetup events are split into wolfgang and meetup tabs', async ({ page, world }) => {
  world.givenMeetupEvents([
    {
      id: 'meetup-wolfgang',
      title: 'Wolfgang Padel',
      eventUrl: 'https://www.meetup.com/wolfgang',
      eventHosts: [{ memberId: '456811393' }],
      maxTickets: 8,
      going: { totalCount: 8 },
    },
    {
      id: 'meetup-casual',
      title: 'Casual Padel',
      eventUrl: 'https://www.meetup.com/casual',
      eventHosts: [{ memberId: 'other-host' }],
      rsvps: { totalCount: 3, edges: [{ node: { member: { id: '176325322' } } }] },
    },
    {
      id: 'meetup-cancelled',
      title: 'Cancelled Padel',
      status: 'CANCELLED',
      eventHosts: [{ memberId: 'other-host' }],
    },
    {
      id: 'meetup-floridsdorf',
      title: 'Floridsdorf Padel',
      venue: { id: '28170985', name: 'Floridsdorf' },
      eventHosts: [{ memberId: 'other-host' }],
    },
  ])
  await page.goto('/')

  await fetchButton(page).click()

  await expect(tab(page, 'wolfgang')).toContainText('(1)')
  await expect(tab(page, 'meetup')).toContainText('(1)')

  await tab(page, 'wolfgang').click()
  await expect(page.getByText('Wolfgang Padel')).toBeVisible()
  await expect(page.getByText('full')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open' }).first()).toHaveAttribute('href', 'https://www.meetup.com/wolfgang')
  await expect(page.getByText('Cancelled Padel')).toHaveCount(0)
  await expect(page.getByText('Floridsdorf Padel')).toHaveCount(0)

  await tab(page, 'meetup').click()
  await expect(page.getByText('Casual Padel')).toBeVisible()
  await expect(page.getByText('3 free of 8')).toBeVisible()
  await expect(page.getByText('✓')).toHaveCount(1)
})
