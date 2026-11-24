import { budget, expect, modeTile, openAt, phoneNav, test, timeline } from './fixtures'

// Runs in the "iphone-15-pro" project (393×852, touch, iPhone UA)

test('phone menu collapses by default and expands on tap', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T21:05:00')
  await expect(page.getByRole('complementary', { name: 'Sidebar' })).toBeHidden()
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden()
  const toggle = page.getByRole('button', { name: 'Expand menu' })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.click()
  const menu = page.getByRole('navigation', { name: 'Main' })
  await expect(menu.getByRole('button')).toHaveCount(6)
  await expect(page.getByRole('button', { name: 'Collapse menu' })).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('button', { name: 'Collapse menu' }).click()
  await expect(menu).toBeHidden()
  for (const name of ['Dashboard', 'Goals', 'Review', 'Routine', 'Settings', 'Today']) {
    await phoneNav(page, name)
    await expect(page.locator('header').first()).toContainText(name)
  }
  await expect(page.locator('header').first()).toContainText('9:05 PM')
})

test('every page fits the iPhone width (no sideways scrolling)', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-23T21:05:00')
  await phoneNav(page, 'Settings')
  await page.getByRole('button', { name: /Load 6-Week Demo Data/ }).click()
  for (const name of ['Today', 'Dashboard', 'Goals', 'Review', 'Routine', 'Settings']) {
    await phoneNav(page, name)
    await page.waitForTimeout(300)
    const w = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(w, `${name} width`).toBeLessThanOrEqual(393)
  }
})

test('Today on the phone: what matters first, logging works with touch', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T21:05:00')
  const now = page.getByRole('region', { name: 'Now and next' })
  const tiles = page.getByRole('radiogroup', { name: 'Day mode' })
  const habits = page.getByRole('group', { name: 'Daily essentials' })
  const [yNow, yTiles, yHabits] = await Promise.all([now, tiles, habits].map(async (l) => (await l.boundingBox())!.y))
  expect(yNow).toBeLessThan(yTiles)
  expect(yTiles).toBeLessThan(yHabits)
  // keyboard hints hidden on phone
  await expect(tiles.locator('kbd').first()).toBeHidden()

  await modeTile(page, 'Ceiling').tap()
  await expect(page.getByText('Ceiling day • 14/14 blocks done')).toBeVisible()
  await timeline(page).getByRole('button', { name: 'Reading missed' }).tap()
  await expect(page.getByText('Ceiling day • 13/14 blocks done')).toBeVisible()
  await expect(budget(page)).toContainText('1/5')
})

test('check-in writing dialog works on the phone', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T22:00:00')
  await page.getByRole('button', { name: /^I'm grateful for/ }).tap()
  const pad = page.getByRole('textbox', { name: "I'm grateful for" })
  await expect(pad).toBeVisible()
  const box = (await pad.boundingBox())!
  expect(box.width).toBeGreaterThan(300)
  await pad.fill('Family dinner and a quiet evening walk.')
  await page.getByRole('button', { name: 'Save' }).tap()
  await expect(page.getByRole('button', { name: /^I'm grateful for • written/ })).toBeVisible()
})

test('settings on the phone explain sync is not set up yet', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T12:00:00')
  await phoneNav(page, 'Settings')
  await expect(page.getByText("Sync isn't set up yet • Data stays on this device")).toBeVisible()
})
