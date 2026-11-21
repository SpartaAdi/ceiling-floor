import { budget, essentials, expect, modeTile, moveClock, openAt, test, timeline } from './fixtures'

// Wed 18 Nov 2026 is a weekday
test('real-time focus, catch-up and night-care nudges', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T21:05:00')
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  await expect(page.getByText('21:05')).toBeVisible()

  // NOW block + Now/Next card
  const nowRow = timeline(page).locator('li[data-now]')
  await expect(nowRow).toContainText('Night Care')
  await expect(nowRow).toContainText('NOW')
  const now = page.getByRole('region', { name: 'Now and next' })
  await expect(now).toContainText('Night Care')
  await expect(now).toContainText('25m left')
  await expect(now).toContainText('Reading')

  // Earlier Today: 11 past blocks unlogged
  const catchUp = page.getByRole('region', { name: 'Earlier Today' })
  await expect(catchUp).toContainText('11 unlogged')
  await catchUp.getByRole('button', { name: 'Morning Reset missed' }).click()
  await expect(catchUp).toContainText('10 unlogged')
  await catchUp.getByRole('button', { name: 'All ✓' }).click()
  await expect(catchUp).toBeHidden()

  // Evening habits inline in Night Care, synced with the essentials strip
  const open = page.getByRole('group', { name: 'Still open habits' })
  await expect(open.getByRole('button')).toHaveText(['Meds', 'Steam', 'Brush'])
  await open.getByRole('button', { name: 'Meds' }).click()
  await expect(essentials(page).getByRole('button', { name: 'Meds' })).toHaveAttribute('aria-pressed', 'true')
  await expect(open.getByRole('button')).toHaveText(['Steam', 'Brush'])

  // Triphala nudged after 19:30
  await expect(essentials(page).getByRole('button', { name: 'Triphala' })).toHaveClass(/border-floor/)

  // Ceiling keeps catch-up ticks (Morning Reset stays red)
  await page.keyboard.press('c')
  await expect(modeTile(page, 'Ceiling')).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('Ceiling day • 13/14 blocks done')).toBeVisible()
  await expect(budget(page)).toContainText('1/5')
})

test('mode switching, block overrides and weekly counters', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T10:00:00')
  await modeTile(page, 'Ceiling').click()
  await expect(page.getByText('Ceiling day • 14/14 blocks done')).toBeVisible()

  // Red-tick a block on a Ceiling day
  await timeline(page).getByRole('button', { name: 'Reading missed' }).click()
  await expect(page.getByText('Ceiling day • 13/14 blocks done')).toBeVisible()
  await expect(timeline(page).getByRole('heading', { name: 'Reading' })).toHaveClass(/line-through/)
  // and back to green
  await timeline(page).getByRole('button', { name: 'Reading done' }).click()
  await expect(page.getByText('Ceiling day • 14/14 blocks done')).toBeVisible()

  // Floor: loads Floor template, decrements Floor Left 2 → 1
  await expect(budget(page)).toContainText('Floor Left2')
  await page.keyboard.press('f')
  await expect(page.getByText('Weekday Floor • 9 blocks')).toBeVisible()
  await expect(budget(page)).toContainText('Floor Left1')
  // Green-tick nothing extra; partial credit on a Floor day
  await timeline(page).getByRole('button', { name: 'Evening Sitting missed' }).click()
  await expect(page.getByText('Floor day • 8/9 blocks done')).toBeVisible()

  // Miss with a reason
  await page.keyboard.press('m')
  await expect(page.getByText('Miss day • 0/14 blocks done')).toBeVisible()
  await page.getByRole('button', { name: 'Sick' }).click()
  await expect(page.getByRole('button', { name: 'Sick' })).toHaveClass(/bg-miss/)
  await expect(budget(page)).toContainText('Miss1')

  // Partial credit on a Miss day
  await timeline(page).getByRole('button', { name: 'Gym done' }).click()
  await expect(page.getByText('Miss day • 1/14 blocks done')).toBeVisible()

  // Reset
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(page.getByText('No mode yet • Pick how today went')).toBeVisible()
  await expect(budget(page)).toContainText('Floor Left2')
})

test('day navigation, past-day editing and week strip', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T12:00:00')
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tuesday')
  await expect(page.getByText('Editing past day')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Now and next' })).toBeHidden()
  await modeTile(page, 'Floor').click()

  await page.keyboard.press('t')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Today')
  await expect(budget(page).getByRole('listitem', { name: /2026-11-17 • Floor/ })).toBeVisible()
  // future days disabled; can't go past today
  await expect(budget(page).getByRole('listitem', { name: /^2026-11-19/ })).toBeDisabled()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Today')

  await budget(page).getByRole('listitem', { name: /^2026-11-16/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Monday')
})

test('Green → Amber week health with live forecast', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-20T20:00:00') // Friday
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Monday')
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('c')
    await page.keyboard.press('ArrowRight')
  }
  await page.keyboard.press('c')
  await expect(budget(page)).toContainText('5/5')
  await expect(budget(page)).toContainText('Green Week')
  await expect(budget(page)).toContainText('Green secured • Avoid a Miss')

  await moveClock(page, '2026-11-21T20:00:00')
  await page.keyboard.press('m')
  await expect(budget(page)).toContainText('Amber Week')
})

test('check-in persists and feeds tomorrow’s focus', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T22:10:00')
  await page.getByRole('radio', { name: /^4/ }).click()
  await page.getByPlaceholder('One thing that went well').fill('Shipped the review page')
  await page.getByPlaceholder('The one thing that matters').fill('Deep Block before noon')
  await page.getByPlaceholder('The one thing that matters').press('Enter')
  await page.reload()
  await expect(page.getByRole('radio', { name: /^4/ })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByPlaceholder('One thing that went well')).toHaveValue('Shipped the review page')

  await moveClock(page, '2026-11-19T07:00:00')
  await expect(page.getByRole('region', { name: 'Now and next' })).toContainText('Deep Block before noon')
})

test('weekend care is tracked once per week', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-21T10:00:00') // Saturday
  const care = page.getByRole('group', { name: 'Weekend care' })
  await care.getByRole('button', { name: /Besan Scrub/ }).click()
  await expect(care.getByRole('button', { name: /Besan Scrub/ })).toHaveAttribute('aria-pressed', 'true')

  await moveClock(page, '2026-11-22T10:00:00') // Sunday
  await expect(care.getByRole('button', { name: /Besan Scrub/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/Besan Scrub done Sat/)).toBeVisible()
  await expect(care.getByRole('button', { name: /Oiling/ })).toHaveAttribute('aria-pressed', 'false')

  await moveClock(page, '2026-11-23T10:00:00') // Monday — hidden
  await expect(page.getByRole('group', { name: 'Weekend care' })).toBeHidden()
})

test('clock refreshes every minute and moves NOW', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T21:29:30')
  await expect(timeline(page).locator('li[data-now]')).toContainText('Night Care')
  await page.clock.runFor(61_000)
  await expect(page.locator('header').getByText('21:30')).toBeVisible()
  await expect(timeline(page).locator('li[data-now]')).toContainText('Reading')
})

test('keyboard shortcuts dialog and page keys', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T12:00:00')
  await page.keyboard.press('?')
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  const pages: [string, string][] = [
    ['2', 'Dashboard'],
    ['3', 'Goals'],
    ['4', 'Weekly Review'],
    ['5', 'Routine'],
    ['6', 'Settings'],
    ['1', 'Today'],
  ]
  for (const [k, h] of pages) {
    await page.keyboard.press(k)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(h)
  }
})
