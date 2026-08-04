import { expect } from '@playwright/test'
import { test } from './setup/ourTest'
import { AnnotationNoCredPrefill } from './setup/credentialsFixture'
import { defaultAuth } from './setup/wordlyTest'

const fetchButton = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'Fetch Events' })

async function responseByUrl(page: import('@playwright/test').Page, urlPart: string) {
  const response = page.waitForResponse(r => r.url().includes(urlPart))
  await fetchButton(page).click()
  return response
}

test('auth-me returns 200 on the happy path with valid tokens', async ({ page }) => {
  await page.goto('/')
  const me = await responseByUrl(page, 'auth-me')
  expect(me.status()).toBe(200)
})

test('auth-me returns 401 when the access token expired', async ({ page, world }) => {
  world.givenAccessTokenExpired()
  await page.goto('/')
  const me = await responseByUrl(page, 'auth-me')
  expect(me.status()).toBe(401)
})

test('logs in again when the access token expired and credentials are valid', async ({ page, world }) => {
  world.givenAccessTokenExpired()
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByText('1500')).toBeVisible()
})

test('shows an error when login credentials are wrong', async ({ page, world }) => {
  world.givenAccessTokenExpired()
  await page.addInitScript(() => {
    localStorage.setItem('myko-cred-email', defaultAuth.email)
    localStorage.setItem('myko-cred-password', 'wrong-password')
  })
  await page.goto('/')
  await fetchButton(page).click()
  await expect(page.getByRole('alert')).toContainText('Cookie auth failed')
})

test('rejects a wrong refresh token', AnnotationNoCredPrefill, async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('myko-auth-key', 'test-secret-key')
    localStorage.setItem('myko-cred-email', defaultAuth.email)
    localStorage.setItem('myko-cred-password', defaultAuth.password)
    localStorage.setItem('m_refresh_token', 'wrong-refresh-token')
  })
  await page.goto('/')
  const refresh = await responseByUrl(page, 'auth-refresh')
  expect(refresh.status()).toBe(401)
})

test('auth-refresh issues a new access token for the correct refresh token', async ({ page }) => {
  await page.goto('/')
  const refresh = await responseByUrl(page, 'auth-refresh')
  expect(refresh.status()).toBe(200)
  expect(refresh.headers()['m_access_token']).not.toBe(defaultAuth.accessToken)
  await expect(page.getByText('1500')).toBeVisible()
})
