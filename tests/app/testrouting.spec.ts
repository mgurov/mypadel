import { expect } from '@playwright/test'
import { test } from './setup/ourTest'

test('unmocked proxy calls fail loudly with 505', async ({ page }) => {
  await page.goto('/')

  const response = await page.evaluate(async () => {
    const res = await fetch('/dev-proxy/.netlify/functions/unknown-endpoint')
    return { status: res.status, body: await res.text() }
  })

  expect(response.status).toBe(505)
  expect(response.body).toMatch(/the route GET .+\/unknown-endpoint isn't routed/)
})
