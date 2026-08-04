import { expect, type Page } from '@playwright/test'
import { test } from './setup/ourTest'
import { AnnotationNoCredPrefill } from './setup/credentialsFixture'
import { defaultAuth } from './setup/wordlyTest'

const PROXY_BASE = '/dev-proxy/.netlify/functions'

async function fetchEventDetail(page: Page, eventId: string, token: string) {
  return page.evaluate(async ({ url, eventId, token }) => {
    const response = await fetch(`${url}/event-details?id=${eventId}`, {
      headers: { m_access_token: token },
    })
    return { status: response.status, body: await response.json() }
  }, { url: PROXY_BASE, eventId, token })
}

test('auth-me returns 200 on the happy path with valid tokens', async ({ appPage }) => {
  await appPage.goto()
  const me = await appPage.fetchAndWaitFor('auth-me')
  expect(me.status()).toBe(200)
})

test('auth-me returns 401 when the access token expired', async ({ page, world, appPage }) => {
  world.givenAccessTokenExpired()
  await appPage.goto()
  const status = await page.evaluate(async ({ url, token }) => {
    const res = await fetch(`${url}/auth-me`, {
      headers: { m_access_token: token },
    })
    return res.status
  }, { url: PROXY_BASE, token: defaultAuth.accessToken })
  expect(status).toBe(401)
})

test('event-details returns user-specific info with a valid access token', async ({ page, world, appPage }) => {
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel', currentUserPayment: { id: 'pay-1' }, currentUserWaitlistPosition: 3 }])
  await appPage.goto()
  const res = await fetchEventDetail(page, 'evt-1', defaultAuth.accessToken)
  expect(res.status).toBe(200)
  expect(res.body.currentUserPayment).toEqual({ id: 'pay-1' })
  expect(res.body.currentUserWaitlistPosition).toBe(3)
})

test('event-details strips user-specific info when the access token expired', async ({ page, world, appPage }) => {
  world.givenAccessTokenExpired()
  world.givenEvents([{ id: 'evt-1', title: 'Morning Padel', currentUserPayment: { id: 'pay-1' }, currentUserWaitlistPosition: 3 }])
  await appPage.goto()
  const res = await fetchEventDetail(page, 'evt-1', defaultAuth.accessToken)
  expect(res.status).toBe(200)
  expect(res.body.currentUserPayment).toBeNull()
  expect(res.body.currentUserWaitlistPosition).toBeNull()
})

test('refreshes an expired access token without re-login', async ({ world, appPage }) => {
  world.givenAccessTokenExpired()
  await appPage.goto()
  const refresh = await appPage.fetchAndWaitFor('auth-refresh')
  expect(refresh.status()).toBe(200)
  await appPage.expectElo('1500')
})

test('logs in again when the refresh token expired and credentials are valid', async ({ world, appPage }) => {
  world.givenAuth({ refreshToken: 'refresh-token-expired' })
  await appPage.goto()
  await appPage.fetchEvents()
  await appPage.expectElo('1500')
})

test('shows an error when login credentials are wrong', async ({ page, world, appPage }) => {
  world.givenAuth({ refreshToken: 'refresh-token-expired' })
  await page.addInitScript((creds) => {
    localStorage.setItem('myko-cred-email', creds.email)
    localStorage.setItem('myko-cred-password', creds.password)
  }, { email: defaultAuth.email, password: 'wrong-password' })
  await appPage.goto()
  await appPage.fetchEvents()
  await expect(appPage.authError).toContainText('Request failed with status code 401')
})

test('rejects a wrong refresh token', AnnotationNoCredPrefill, async ({ page, appPage }) => {
  await page.addInitScript((defaults) => {
    localStorage.setItem('myko-auth-key', defaults.authKey)
    localStorage.setItem('myko-cred-email', defaults.email)
    localStorage.setItem('myko-cred-password', defaults.password)
    localStorage.setItem('m_refresh_token', defaults.refreshToken)
  }, {
    authKey: 'test-secret-key',
    email: defaultAuth.email,
    password: defaultAuth.password,
    refreshToken: 'wrong-refresh-token',
  })
  await appPage.goto()
  const refresh = await appPage.fetchAndWaitFor('auth-refresh')
  expect(refresh.status()).toBe(401)
})

test('auth-refresh issues a new access token for the correct refresh token', async ({ appPage }) => {
  await appPage.goto()
  const refresh = await appPage.fetchAndWaitFor('auth-refresh')
  expect(refresh.status()).toBe(200)
  expect(refresh.headers()['m_access_token']).not.toBe(defaultAuth.accessToken)
  await appPage.expectElo('1500')
})
