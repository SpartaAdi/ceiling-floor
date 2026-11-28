import { budget, expect, modeTile, openAt, phoneNav, test, timeline } from './fixtures'

// Runs in the "iphone-15-pro" project (393×852, touch, iPhone UA)

test('phone tab bar: thumb-zone tabs, two-cue active state, More sheet, hides while scrolling', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T21:05:00')
  await expect(page.getByRole('complementary', { name: 'Sidebar' })).toBeHidden()
  const bar = page.getByRole('navigation', { name: 'Main' })
  await expect(bar.getByRole('button')).toHaveCount(5)
  for (const n of ['Today', 'Dashboard', 'Goals', 'Review', 'More']) await expect(bar.getByRole('button', { name: n })).toBeVisible()
  // Thumb zone: bar sits at the bottom of the screen; every tab ≥ 44×44
  const box = (await bar.boundingBox())!
  expect(box.y + box.height).toBeGreaterThanOrEqual(852 - 1)
  for (const b of await bar.getByRole('button').all()) {
    const r = (await b.boundingBox())!
    expect(r.width).toBeGreaterThanOrEqual(44)
    expect(r.height).toBeGreaterThanOrEqual(44)
  }
  // Two-cue active state: aria-current + bold label
  const today = bar.getByRole('button', { name: 'Today' })
  await expect(today).toHaveAttribute('aria-current', 'page')
  await expect(today.locator('span').last()).toHaveClass(/font-bold/)

  for (const name of ['Dashboard', 'Goals', 'Review', 'Routine', 'Settings', 'Today']) await phoneNav(page, name)
  await expect(page.getByRole('main').locator('header')).toContainText('9:05 PM')

  // Hides when you scroll down, returns when you scroll up
  await phoneNav(page, 'Dashboard')
  await page.mouse.move(200, 400)
  await page.mouse.wheel(0, 900)
  await expect(bar).toHaveClass(/translate-y-full/)
  await page.mouse.wheel(0, -300)
  await expect(bar).not.toHaveClass(/translate-y-full/)
})

test('auto-scroll to the current block does not hide the tab bar', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T21:05:00')
  await page.waitForTimeout(800) // Today scrolls to NOW
  await expect(page.getByRole('navigation', { name: 'Main' })).not.toHaveClass(/translate-y-full/)
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
  await expect(page.getByText('Ceiling day • 0/14 blocks done')).toBeVisible()
  await timeline(page).getByRole('button', { name: 'Reading done' }).tap()
  await expect(page.getByText('Ceiling day • 1/14 blocks done')).toBeVisible()
  await timeline(page).getByRole('button', { name: 'Reading missed' }).tap()
  await expect(page.getByText('Ceiling day • 0/14 blocks done')).toBeVisible()
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
  await expect(page.getByRole('link', { name: 'Open setup guide' })).toHaveAttribute('href', /SETUP-SYNC\.md$/)
})

test('first-run checklist shows real progress and guides each step', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T09:00:00')
  const welcome = page.getByRole('region', { name: 'Get started' })
  await expect(welcome).toContainText('1/5 done')
  await expect(welcome.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '20')
  await modeTile(page, 'Floor').tap()
  await expect(welcome).toContainText('2/5 done')
  await welcome.getByRole('button', { name: /Set your first goal/ }).tap()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Goals')
  await page.getByRole('button', { name: /Deep work 20h/ }).tap()
  await phoneNav(page, 'Today')
  await expect(welcome).toContainText('3/5 done')
  await welcome.getByRole('button', { name: 'Hide get started' }).tap()
  await expect(welcome).toBeHidden()
  await page.reload()
  await expect(page.getByRole('region', { name: 'Get started' })).toBeHidden()
})

test('empty screens always offer a next step', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T12:00:00')
  await phoneNav(page, 'Review')
  await page.getByRole('button', { name: 'Log today' }).tap()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Today')
  await phoneNav(page, 'Dashboard')
  await expect(page.getByText('Insights unlock after 3 logged days')).toBeVisible()
  await page.getByRole('button', { name: 'Open check-in' }).tap()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Today')
})

test('Goals primary action sits in the thumb zone on the phone', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T12:00:00')
  await phoneNav(page, 'Goals')
  const fab = page.getByRole('button', { name: 'New goal' })
  await expect(fab).toHaveCount(1)
  const r = (await fab.boundingBox())!
  const h = await page.evaluate(() => window.innerHeight)
  expect(r.y).toBeGreaterThan(h * 0.66) // lower third of the visible screen
  await fab.tap()
  await expect(page.getByRole('dialog', { name: 'New goal' })).toBeVisible()
})

test('diet on the phone: one tap to tick, picker sheet, water', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T12:30:00')
  const diet = page.getByRole('region', { name: 'Diet' })
  await diet.getByRole('button', { name: 'Jeera water done' }).tap()
  await diet.getByRole('button', { name: 'Choose Salad & nuts' }).tap()
  const sheet = page.getByRole('dialog', { name: 'Salad & nuts' })
  await sheet.getByRole('checkbox', { name: 'Spinach & Amla' }).tap()
  await sheet.getByRole('checkbox', { name: 'Sprouts & Carrot' }).tap()
  await sheet.getByRole('button', { name: 'Save' }).tap()
  await diet.getByRole('button', { name: 'Add a glass of water' }).tap()
  await expect(diet).toContainText('2/7')
  await expect(diet).toContainText('Water 1/12 glasses')
  const w = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(w).toBeLessThanOrEqual(393)
})

test('Today on the phone: sticky jump bar glides to each section and follows your scroll', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T12:00:00')
  const bar = page.getByRole('navigation', { name: 'Jump to' })
  await expect(bar).toBeVisible()
  await expect(bar.getByRole('button', { name: 'Plan' })).toHaveAttribute('aria-current', 'true')
  await bar.getByRole('button', { name: 'Diet' }).tap()
  await expect(page.getByRole('region', { name: 'Diet' })).toBeInViewport()
  await expect(bar).toBeInViewport() // stays pinned while scrolled
  await expect(bar.getByRole('button', { name: 'Diet' })).toHaveAttribute('aria-current', 'true')
  await bar.getByRole('button', { name: 'Timeline' }).tap()
  await expect(timeline(page)).toBeInViewport()
})
