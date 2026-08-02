import { test, expect } from '@playwright/test'

test('unmocked proxy calls fail loudly with 505', async ({ page }) => {
  await page.goto('/')

  const responsePromise = page.waitForResponse((res) =>
    res.url().includes('/functions/v1/proxy/'),
  )
  await page.getByRole('button', { name: 'Fetch Events' }).click()
  const response = await responsePromise

  expect(response.status()).toBe(505)
  expect(await response.text()).toMatch(/the route GET .+\/events isn't routed/)
})