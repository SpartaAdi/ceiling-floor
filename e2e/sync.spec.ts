import { expect, test } from '@playwright/test'
import { IPHONE, modeTile, phoneNav, timeline, watchErrors } from './fixtures'
import { fakeSupabase } from './fakeSupabase'

// Runs in the "sync" project: the app built with sync on, against an in-memory Supabase.

const EMAIL = 'me@example.com'
const PASSWORD = 'correct-horse-9'
/** Set SHOTS=<dir> to save screenshots for a visual check. */
const shot = async (page: import('@playwright/test').Page, name: string) => {
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/${name}.png` })
}
const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

test('Mac and iPhone stay in sync through the cloud', async ({ browser }) => {
  const cloud = fakeSupabase()
  const errors: string[] = []
  const macCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Kolkata', serviceWorkers: 'block' })
  const phoneCtx = await browser.newContext({ ...IPHONE, timezoneId: 'Asia/Kolkata', serviceWorkers: 'block' })
  await cloud.attach(macCtx)
  await cloud.attach(phoneCtx)
  const mac = await macCtx.newPage()
  const phone = await phoneCtx.newPage()
  watchErrors(mac, errors)
  watchErrors(phone, errors)

  // --- Mac: create the account, then log today as Ceiling
  await mac.goto('/')
  await expect(mac.getByRole('heading', { level: 1 })).toBeVisible()
  await mac.keyboard.press('6')
  const macCard = mac.getByRole('main')
  await expect(macCard.getByText('Sync off • Sign in')).toBeVisible()
  await macCard.getByLabel('Email').fill(EMAIL)
  await macCard.getByLabel('Password').fill(PASSWORD)
  await macCard.getByRole('button', { name: 'Create account' }).click()
  await expect(macCard.getByText(`Signed in as ${EMAIL}`)).toBeVisible()
  await expect(mac.getByRole('complementary', { name: 'Sidebar' }).getByRole('status')).toContainText('Synced')

  await mac.keyboard.press('1')
  await mac.keyboard.press('c')
  await expect(mac.getByText(/Ceiling day • \d+\/\d+ blocks done/)).toBeVisible()
  await expect.poll(() => cloud.row(EMAIL)?.days?.[todayKey()]?.mode, { timeout: 10_000 }).toBe('ceiling')

  // --- iPhone: sign in with the same account → Mac's day appears
  await phone.goto('/')
  await expect(phone.getByRole('heading', { level: 1 })).toBeVisible()
  await phoneNav(phone, 'Settings')
  await phone.getByLabel('Email').scrollIntoViewIfNeeded()
  await shot(phone, 'phone-signin')
  await phone.getByLabel('Email').fill(EMAIL)
  await phone.getByLabel('Password').fill(PASSWORD)
  await phone.getByRole('button', { name: 'Sign in', exact: true }).tap()
  await expect(phone.getByText(`Signed in as ${EMAIL}`)).toBeVisible()
  // On iPhone outside the Home Screen app, reminders explain the extra step
  await expect(phone.getByText(/Add to Home Screen, then open the app from your Home Screen/)).toBeVisible()
  await phone.getByText('Daily reminders').scrollIntoViewIfNeeded()
  await shot(phone, 'phone-signed-in')
  await phoneNav(phone, 'Today')
  await expect(modeTile(phone, 'Ceiling')).toHaveAttribute('aria-checked', 'true')

  // --- iPhone edits a block → Mac receives it
  await timeline(phone).getByRole('button', { name: 'Reading missed' }).tap()
  await expect
    .poll(() => {
      const day = cloud.row(EMAIL)?.days?.[todayKey()]
      const reading = day?.blocks.find((b) => b.title === 'Reading')
      return reading ? day!.statuses[reading.id] : undefined
    }, { timeout: 10_000 })
    .toBe('missed')
  await mac.keyboard.press('6')
  await macCard.getByRole('button', { name: 'Sync now' }).click()
  await shot(mac, 'mac-settings-synced')
  await mac.keyboard.press('1')
  await expect(timeline(mac).getByRole('button', { name: 'Reading missed' })).toHaveAttribute('aria-pressed', 'true')

  // --- Theme is per device: dark on phone, Mac unchanged; cloud copy keeps the Mac's choice
  await phone.getByRole('button', { name: 'Expand menu' }).tap()
  await phone.getByRole('navigation', { name: 'Main' }).getByRole('radio', { name: 'Dark' }).tap()
  await expect(phone.locator('html')).toHaveClass(/dark/)
  await mac.reload()
  await expect(mac.locator('html')).not.toHaveClass(/dark/)

  // --- Reload on iPhone: still signed in, data still there (persisted session + local copy)
  await phone.reload()
  await expect(modeTile(phone, 'Ceiling')).toHaveAttribute('aria-checked', 'true')

  // --- Wrong password is reported, not crashed
  const other = await (await browser.newContext({ serviceWorkers: 'block' })).newPage()
  await cloud.attach(other.context())
  await other.goto('/')
  await expect(other.getByRole('heading', { level: 1 })).toBeVisible()
  await other.keyboard.press('6')
  await other.getByLabel('Email').fill(EMAIL)
  await other.getByLabel('Password').fill('wrong-password')
  await other.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(other.getByText('Invalid login credentials')).toBeVisible()

  // --- Sign out on the phone keeps local data
  await phoneNav(phone, 'Settings')
  await phone.getByRole('button', { name: 'Sign out' }).tap()
  await expect(phone.getByRole('button', { name: 'Create account' })).toBeVisible()
  await phoneNav(phone, 'Today')
  await expect(modeTile(phone, 'Ceiling')).toHaveAttribute('aria-checked', 'true')

  expect(errors.filter((e) => !/Failed to load resource.*400/.test(e))).toEqual([])
})
