import { expect, loadDemo, nav, openAt, test } from './fixtures'

test('dashboard with demo data: KPIs, facets, insights, charts, drill-down', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-21T13:30:00')
  await loadDemo(page)
  await nav(page, 'Dashboard').click()
  const main = page.getByRole('main')
  await expect(main.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  for (const k of ['Life Score', 'Growth Hours', 'Ceiling Rate', 'Non-Miss Streak', 'Green Weeks']) await expect(main.getByText(k, { exact: true })).toBeVisible()
  for (const f of ['Deep Work', 'Fitness', 'Mindfulness', 'Reading', 'Family', 'Health & Care', 'Nutrition', 'Sleep'])
    await expect(main.getByRole('heading', { name: f, exact: true })).toBeVisible()

  await expect(main.getByText('Progressing').or(main.getByText('Falling behind')).first()).toBeVisible()
  await expect(main.getByRole('heading', { name: 'Goals' })).toBeVisible()
  await expect(main.getByText('Deep work 20h')).toBeVisible()
  await expect(main.getByRole('heading', { name: 'Growth Hours • 8 Weeks' })).toBeVisible()
  await expect(main.locator('.recharts-bar-rectangle').first()).toBeVisible()

  // Timeframes change the logged-day count
  const sub = main.locator('header p').first()
  await expect(sub).toContainText('5 logged days')
  await main.getByRole('radio', { name: '30 Days' }).click()
  await expect(sub).toContainText('29 logged days')
  await main.getByRole('radio', { name: 'All Time' }).click()
  await expect(sub).toContainText('42 logged days')
  await main.getByRole('radio', { name: 'This Month' }).click()
  await expect(sub).toContainText('20 logged days')

  // Block report expands
  await main.getByRole('button', { name: /^All \d+ blocks/ }).click()
  await expect(main.getByRole('button', { name: 'Hide' })).toBeVisible()

  // Habit matrix dot toggles
  const dot = main.getByRole('button', { name: /^Eat Right 2026-11-16/ })
  const before = await dot.getAttribute('aria-pressed')
  await dot.click()
  await expect(dot).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true')

  // Calendar drill-down opens the day on Today
  await main.getByRole('button', { name: /^2026-11-10 •/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tuesday')
  await expect(page.getByText('Editing past day')).toBeVisible()
})

test('dashboard empty state is calm', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T12:00:00')
  await nav(page, 'Dashboard').click()
  await expect(page.getByText('Log a few more days')).toBeVisible()
  await expect(page.getByText('No Ceiling or Floor days yet')).toBeVisible()
})
