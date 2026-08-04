import { expect } from '@playwright/test'
import { test } from './setup/ourTest'

//TODO: rewrite to inject the call to the unmocked path and check the results instead of expecting the functionality to be calling unmocked pathes which is generally not supposed to happen
test('unmocked proxy calls fail loudly with 505', async ({ page }) => {
  await page.goto('/')

  const responsePromise = page.waitForResponse((res) =>
    res.url().includes('/dev-proxy/'),
  )
  await page.getByRole('button', { name: 'Fetch Events' }).click()
  const response = await responsePromise

  expect(response.status()).toBe(505)
  expect(await response.text()).toMatch(/the route GET .+\/events isn't routed/)
})