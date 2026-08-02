import { expect, type Page } from '@playwright/test'
import { test } from './setup/ourTest'

test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

const DIALOG_OPENER = 'Set Credentials'
const DIALOG_OPENER_SET = 'Credentials Set'

async function setClipboardText(page: Page, text: string) {
  await page.evaluate((value) => navigator.clipboard.writeText(value), text)
}

async function openDialog(page: Page, opener: string = DIALOG_OPENER) {
  await page.goto('/')
  await page.getByRole('button', { name: opener }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

async function setClipboardAndOpenDialog(page: Page, text: string, opener: string = DIALOG_OPENER) {
  await openDialog(page, opener)
  await setClipboardText(page, text)
}

const field = (page: Page, label: string) => page.getByRole('dialog').getByLabel(label)
const copyButton = (page: Page) => page.getByRole('button', { name: 'Copy' })
const pasteButton = (page: Page) => page.getByRole('button', { name: 'Paste' })

test('copy is disabled and paste enabled when no values are set', async ({ page }) => {
  await openDialog(page)
  await expect(copyButton(page)).toBeDisabled()
  await expect(pasteButton(page)).toBeEnabled()
})

test('copy is enabled once any value is set', async ({ page }) => {
  await openDialog(page)
  await expect(copyButton(page)).toBeDisabled()
  await field(page, 'Email').fill('player@example.com')
  await expect(copyButton(page)).toBeEnabled()
})

test('copy writes full credentials JSON to the clipboard', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('myko-auth-key', 'secret-key')
    localStorage.setItem('myko-cred-email', 'player@example.com')
    localStorage.setItem('myko-cred-password', 'hunter2')
  })
  await openDialog(page, DIALOG_OPENER_SET)

  await copyButton(page).click()

  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(JSON.parse(clip)).toEqual({
    authKey: 'secret-key',
    email: 'player@example.com',
    password: 'hunter2',
  })
})

test('paste fills all fields from full JSON', async ({ page }) => {
  await setClipboardAndOpenDialog(page, JSON.stringify({ authKey: 'key-1', email: 'a@b.c', password: 'pass-1' }))

  await pasteButton(page).click()

  await expect(field(page, 'x-myko-auth')).toHaveValue('key-1')
  await expect(field(page, 'Email')).toHaveValue('a@b.c')
  await expect(field(page, 'Password')).toHaveValue('pass-1')
})

test('paste keeps previous values for missing fields and warns', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('myko-auth-key', 'old-key')
    localStorage.setItem('myko-cred-password', 'old-pass')
  })
  await setClipboardAndOpenDialog(page, JSON.stringify({ email: 'player@example.com' }))

  await pasteButton(page).click()

  await expect(field(page, 'Email')).toHaveValue('player@example.com')
  await expect(field(page, 'x-myko-auth')).toHaveValue('old-key')
  await expect(field(page, 'Password')).toHaveValue('old-pass')
  await expect(page.getByRole('alert')).toContainText('Missing credential fields: x-myko-auth, password. Previous values kept.')
})

test('paste with empty values keeps previous values and warns', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('myko-auth-key', 'old-key')
    localStorage.setItem('myko-cred-email', 'old@example.com')
    localStorage.setItem('myko-cred-password', 'old-pass')
  })
  await setClipboardAndOpenDialog(page, JSON.stringify({ authKey: 'new-key', email: '', password: '' }), DIALOG_OPENER_SET)

  await pasteButton(page).click()

  await expect(field(page, 'x-myko-auth')).toHaveValue('new-key')
  await expect(field(page, 'Email')).toHaveValue('old@example.com')
  await expect(field(page, 'Password')).toHaveValue('old-pass')
  await expect(page.getByRole('alert')).toContainText('Missing credential fields: email, password. Previous values kept.')
})

test('paste shows error for non-json clipboard', async ({ page }) => {
  await setClipboardAndOpenDialog(page, 'this is not json')

  await pasteButton(page).click()

  await expect(page.getByRole('alert')).toContainText('Clipboard does not contain valid JSON.')
})

test('paste shows error for json without credential fields', async ({ page }) => {
  await setClipboardAndOpenDialog(page, JSON.stringify({ foo: 'bar' }))

  await pasteButton(page).click()

  await expect(page.getByRole('alert')).toContainText('Clipboard JSON does not contain any credential fields.')
})

test('paste ignores unknown fields and warns about the missing ones', async ({ page }) => {
  await setClipboardAndOpenDialog(page, JSON.stringify({ authKey: 'key-1', foo: 'bar' }))

  await pasteButton(page).click()

  await expect(field(page, 'x-myko-auth')).toHaveValue('key-1')
  await expect(page.getByRole('alert')).toContainText('Missing credential fields: email, password.')
  await expect(page.getByRole('alert')).not.toContainText('foo')
})

test('paste then save persists credentials', async ({ page }) => {
  await setClipboardAndOpenDialog(page, JSON.stringify({ authKey: 'key-1', email: 'a@b.c', password: 'pass-1' }))

  await pasteButton(page).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()

  await expect(page.getByRole('button', { name: DIALOG_OPENER_SET })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('myko-auth-key'))).toBe('key-1')
  expect(await page.evaluate(() => localStorage.getItem('myko-cred-email'))).toBe('a@b.c')
  expect(await page.evaluate(() => localStorage.getItem('myko-cred-password'))).toBe('pass-1')
})

test('paste into an empty dialog enables the copy button', async ({ page }) => {
  await setClipboardAndOpenDialog(page, JSON.stringify({ authKey: 'key-1' }))

  await expect(copyButton(page)).toBeDisabled()
  await pasteButton(page).click()
  await expect(copyButton(page)).toBeEnabled()
})

test('error message clears when the dialog is reopened', async ({ page }) => {
  await setClipboardAndOpenDialog(page, 'this is not json')

  await pasteButton(page).click()
  await expect(page.getByRole('alert')).toContainText('Clipboard does not contain valid JSON.')

  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
  await page.getByRole('button', { name: DIALOG_OPENER }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})
