import { readFileSync, writeFileSync } from 'node:fs'
import { budget, essentials, expect, modeTile, nav, openAt, test, timeline } from './fixtures'

test('routine editor: add, edit, delete blocks; snapshots protect history', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T12:00:00')
  // Lock yesterday with the original template
  await page.keyboard.press('ArrowLeft')
  await modeTile(page, 'Ceiling').click()
  await page.keyboard.press('t')

  await nav(page, 'Routine').click()
  await page.getByRole('button', { name: 'Add block' }).click()
  const dlg = page.getByRole('dialog', { name: 'New block' })
  // Smart default: a full day falls back to a 1-hour 7–8 AM slot
  await expect(dlg.getByLabel('Start')).toHaveValue('07:00')
  await expect(dlg.getByLabel('End')).toHaveValue('08:00')
  await dlg.getByLabel('Start').fill('23:00')
  await dlg.getByLabel('End').fill('23:30')
  await dlg.getByLabel(/^Title/).fill('Stretch Break')
  await dlg.getByLabel(/^Details/).fill('Neck • Back')
  await dlg.getByRole('button', { name: 'Fitness' }).click()
  await dlg.getByRole('button', { name: 'Save block' }).click()
  await expect(page.getByText('Weekday Ceiling • 15 blocks')).toBeVisible()

  // Invalid time range blocked
  await page.getByRole('button', { name: 'Edit Stretch Break' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit block' })
  await edit.getByLabel('End').fill('22:00')
  await expect(edit.getByText('End must be after start')).toBeVisible()
  await expect(edit.getByRole('button', { name: 'Save block' })).toBeDisabled()
  await edit.getByLabel('End').fill('23:45')
  await edit.getByRole('button', { name: 'Save block' }).click()

  // Today (no mode yet) previews the new block; yesterday keeps its snapshot
  await nav(page, 'Today').click()
  await expect(timeline(page)).toContainText('Stretch Break')
  await page.keyboard.press('ArrowLeft')
  await expect(timeline(page)).not.toContainText('Stretch Break')
  await expect(page.getByText('Ceiling day • 14/14 blocks done')).toBeVisible()

  // Delete (two-step)
  await nav(page, 'Routine').click()
  await page.getByRole('button', { name: 'Delete Stretch Break' }).click()
  await page.getByRole('button', { name: 'Confirm delete Stretch Break' }).click()
  await expect(page.getByText('Weekday Ceiling • 14 blocks')).toBeVisible()
})

test('habits editor: add habit linked to an area; appears on Today', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T12:00:00')
  await nav(page, 'Routine').click()
  await page.getByRole('tab', { name: 'Habits' }).click()
  await page.getByRole('button', { name: 'Add Daily Essentials habit' }).click()
  const dlg = page.getByRole('dialog', { name: 'New habit' })
  await dlg.getByLabel(/^Label/).fill('Water')
  await dlg.getByRole('radiogroup', { name: 'Counts toward' }).getByRole('radio', { name: 'Nutrition' }).click()
  await dlg.getByRole('button', { name: 'Save habit' }).click()
  await expect(page.getByText('Water')).toBeVisible()
  await nav(page, 'Today').click()
  await essentials(page).getByRole('button', { name: 'Water' }).click()
  await expect(essentials(page).getByRole('button', { name: 'Water' })).toHaveAttribute('aria-pressed', 'true')
  await expect(essentials(page).locator('..')).toContainText('1/7')
})

test('settings: budget targets, facet targets, theme', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T12:00:00')
  await nav(page, 'Settings').click()
  await page.getByRole('button', { name: 'Decrease Ceiling target' }).click()
  await page.getByRole('button', { name: 'Increase Deep Work target' }).click()
  await expect(page.getByRole('button', { name: /Reset to auto/ })).toBeVisible()
  await page.getByRole('main').getByRole('radio', { name: 'Dark' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.getByRole('main').getByRole('radio', { name: 'Light' }).click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await nav(page, 'Today').click()
  await expect(budget(page)).toContainText('0/4')
})

test('backup: export, clear, import, invalid file', async ({ page, errors: _ }, testInfo) => {
  await openAt(page, '2026-11-18T12:00:00')
  await modeTile(page, 'Floor').click()
  await nav(page, 'Settings').click()

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Export JSON/ }).click()])
  const file = testInfo.outputPath('backup.json')
  await download.saveAs(file)
  const json = JSON.parse(readFileSync(file, 'utf8'))
  expect(json.version).toBe(2)
  expect(json.days['2026-11-18'].mode).toBe('floor')

  await page.getByRole('button', { name: /Clear All Data/ }).click()
  await page.getByRole('button', { name: /Tap again to confirm/ }).click()
  await expect(page.getByText('0 logged days • Stored on device')).toBeVisible()

  await page.locator('input[type=file]').setInputFiles(file)
  await expect(page.getByText('Replace all data?')).toBeVisible()
  await page.getByRole('button', { name: 'Replace' }).click()
  await expect(page.getByText('1 logged days • Stored on device')).toBeVisible()

  const bad = testInfo.outputPath('bad.json')
  writeFileSync(bad, '"not a backup"')
  await page.locator('input[type=file]').setInputFiles(bad)
  await expect(page.getByRole('status')).toContainText('Invalid backup file')

  await nav(page, 'Today').click()
  await expect(modeTile(page, 'Floor')).toHaveAttribute('aria-checked', 'true')
})

test('old v1 data migrates on load', async ({ page, errors: _ }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('cfm:data:v1')) return
    localStorage.setItem(
      'cfm:data:v1',
      JSON.stringify({
        version: 1,
        settings: { theme: 'light', targets: { ceiling: 5, floor: 2, miss: 0 } },
        habits: [{ id: 'meds', label: 'Meds', kind: 'daily', evening: true }],
        templates: {},
        days: {},
        weeks: {},
      }),
    )
  })
  await openAt(page, '2026-11-18T12:00:00')
  await expect(essentials(page).getByRole('button', { name: 'Eat Right' })).toBeVisible()
  await expect(timeline(page).locator('li', { hasText: 'Reading' })).toContainText('Reading')
})

test('meal plan editor: change options and water target, reset to chart', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T15:00:00')
  await nav(page, 'Routine').click()
  await page.getByRole('tab', { name: 'Meals' }).click()
  await expect(page.getByRole('button', { name: 'Saved' })).toBeDisabled()
  await page.getByRole('button', { name: 'Increase Water target' }).click()
  await expect(page.getByText('13 glasses × 250 ml = 3.25 L')).toBeVisible()
  await page.locator('input[value="Classic thali"]').fill('Home thali')
  await page.getByRole('button', { name: 'Save meal plan' }).click()
  await expect(page.getByRole('status')).toContainText('Meal plan saved')

  await nav(page, 'Today').click()
  const diet = page.getByRole('region', { name: 'Diet' })
  await expect(diet).toContainText('Water 0/13 glasses')
  await diet.getByRole('button', { name: 'Choose Lunch' }).click()
  await expect(page.getByRole('group', { name: 'Lunch options' }).getByRole('checkbox', { name: /Home thali/ })).toBeVisible()
  await page.keyboard.press('Escape')

  await nav(page, 'Routine').click()
  await page.getByRole('tab', { name: 'Meals' }).click()
  await page.getByRole('button', { name: 'Reset to my chart' }).click()
  await page.getByRole('button', { name: 'Tap to confirm' }).click()
  await expect(page.locator('input[value="Classic thali"]')).toBeVisible()
})
