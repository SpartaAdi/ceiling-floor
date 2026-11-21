import { expect, loadDemo, nav, openAt, test } from './fixtures'

test('weekly review: nudge, scorecard, reflect, plan next week', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-23T09:00:00') // Monday after a demo week
  await loadDemo(page)
  await nav(page, 'Today').click()
  await expect(page.getByText('Weekly review due')).toBeVisible()
  await expect(nav(page, 'Review')).toContainText('Due')

  await page.getByRole('button', { name: 'Start review' }).click()
  const main = page.getByRole('main')
  await expect(main.getByRole('heading', { name: 'Weekly Review' })).toBeVisible()
  await expect(main.locator('header').getByText('Last week', { exact: true })).toBeVisible()
  await expect(main.getByText('Not reviewed')).toBeVisible()
  await expect(main.getByRole('table')).toContainText('Deep Work')
  await expect(main.getByRole('table').getByRole('row')).toHaveCount(9)
  await expect(main.getByRole('heading', { name: 'Day by Day' })).toBeVisible()
  await expect(main.getByRole('heading', { name: 'Weekly Goals' })).toBeVisible()
  await expect(main.getByText('Gym 5x')).toBeVisible()

  // Reflect
  await main.getByRole('radiogroup', { name: 'Week rating' }).getByRole('radio', { name: /^4/ }).click()
  await main.getByLabel('What went well?').fill('Deep blocks before noon')
  await main.getByLabel('What got in the way?').fill('Late nights')
  await main.getByLabel('One change for next week').fill('Phone out by 21:30')
  await main.getByLabel('One change for next week').blur()

  // Plan next week: replace demo priorities with Fitness
  for (const name of ['Deep Work', 'Reading']) {
    const chip = main.getByRole('button', { name, exact: true }).last()
    if ((await chip.getAttribute('aria-pressed')) === 'true') await chip.click()
  }
  await main.getByRole('button', { name: 'Fitness', exact: true }).last().click()
  await main.getByLabel('Fitness intention').fill('Gym 5x')
  await main.getByLabel('Fitness intention').press('Enter')

  await main.getByRole('button', { name: 'Complete review' }).click()
  await expect(page.getByRole('status')).toContainText('Review complete')
  await expect(main.getByText(/^Reviewed/)).toBeVisible()
  await expect(nav(page, 'Review')).not.toContainText('Due')

  // Persisted + priorities show on Today
  await page.reload()
  await expect(main.getByLabel('What went well?')).toHaveValue('Deep blocks before noon')
  await nav(page, 'Today').click()
  await expect(page.getByText('Weekly review due')).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Week Priorities' })).toBeVisible()
  await expect(page.getByText('• Gym 5x')).toBeVisible()

  // Week navigation
  await nav(page, 'Review').click()
  await main.getByRole('button', { name: 'Previous week' }).click()
  await expect(main.getByText(/^Reviewed/)).toBeVisible() // demo week 2 back is reviewed
  await main.getByRole('button', { name: 'Next week' }).click()
  await main.getByRole('button', { name: 'Next week' }).click()
  await expect(main.locator('header').getByText('This week', { exact: true })).toBeVisible()
  await expect(main.getByRole('button', { name: 'Next week' })).toBeDisabled()
})

test('review on an empty week explains what to do', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T12:00:00')
  await nav(page, 'Review').click()
  await expect(page.getByText('Nothing logged this week')).toBeVisible()
})
