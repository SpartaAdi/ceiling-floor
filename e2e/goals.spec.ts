import { expect, modeTile, nav, openAt, test } from './fixtures'

test('goals: starter, auto-tracking, manual count, edit, archive, delete', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T12:00:00')
  await nav(page, 'Goals').click()
  await expect(page.getByText('No goals yet')).toBeVisible()

  // Starter goal auto-tracks hours from Today
  await page.getByRole('button', { name: /Deep work 20h/ }).click()
  await expect(page.getByRole('status')).toContainText('Goal added')
  await nav(page, 'Today').click()
  await modeTile(page, 'Ceiling').click()
  await nav(page, 'Goals').click()
  const deep = page.locator('section', { has: page.getByRole('heading', { name: 'Deep work 20h' }) })
  await expect(deep).toContainText('2.5h')
  await expect(deep).toContainText('/ 20h')

  // New manual monthly goal
  await page.getByRole('button', { name: 'New goal' }).click()
  const dlg = page.getByRole('dialog', { name: 'New goal' })
  await dlg.getByRole('button', { name: 'Reading' }).click()
  await dlg.getByPlaceholder('Deep work 20h').fill('Finish 3 books')
  await dlg.getByRole('button', { name: /^Count/ }).click()
  await dlg.getByLabel(/^Target/).fill('3')
  await dlg.getByRole('button', { name: 'Monthly' }).click()
  await dlg.getByRole('button', { name: 'Save goal' }).click()
  const books = page.locator('section', { has: page.getByRole('heading', { name: 'Finish 3 books' }) })
  await expect(books).toContainText('Reading • Monthly • Count')
  await books.getByRole('button', { name: 'Increase Finish 3 books' }).click()
  await books.getByRole('button', { name: 'Increase Finish 3 books' }).click()
  await expect(books).toContainText(/2\s*\/\s*3/)
  await books.getByRole('button', { name: 'Decrease Finish 3 books' }).click()
  await expect(books).toContainText(/1\s*\/\s*3/)

  // Edit target → done
  await books.getByRole('button', { name: 'Edit Finish 3 books' }).click()
  await page.getByRole('dialog', { name: 'Edit goal' }).getByLabel(/^Target/).fill('1')
  await page.getByRole('button', { name: 'Save goal' }).click()
  await expect(books).toContainText('Done')

  // Habit goal needs a habit
  await page.getByRole('button', { name: 'New goal' }).click()
  const d2 = page.getByRole('dialog', { name: 'New goal' })
  await d2.getByPlaceholder('Deep work 20h').fill('Eat right 6 days')
  await d2.getByRole('button', { name: /^Habit days/ }).click()
  // Smart default: a habit is pre-picked, so the form is never stuck
  const habitPick = d2.getByRole('radiogroup', { name: 'Habit' })
  await expect(habitPick.getByRole('radio', { checked: true })).toHaveCount(1)
  await habitPick.getByRole('radio', { name: 'Eat Right' }).click()
  await expect(habitPick.getByRole('radio', { name: 'Eat Right' })).toHaveAttribute('aria-checked', 'true')
  await d2.getByLabel(/^Target/).fill('6')
  await expect(d2.getByRole('button', { name: 'Save goal' })).toBeEnabled()
  await d2.getByRole('button', { name: 'Save goal' }).click()
  await expect(page.getByRole('heading', { name: 'Eat right 6 days' })).toBeVisible()

  // Summary counts + filter
  await expect(page.getByText('Active', { exact: true }).locator('..')).toContainText('3')
  await page.getByRole('tab', { name: 'Reading' }).click()
  await expect(page.getByRole('heading', { name: 'Deep work 20h' })).toBeHidden()
  await page.getByRole('tab', { name: 'All areas' }).click()

  // Archive + restore
  await deep.getByRole('button', { name: 'Archive Deep work 20h' }).click()
  await expect(page.getByRole('button', { name: /Archived • 1/ })).toBeVisible()
  await page.getByRole('button', { name: /Archived • 1/ }).click()
  await page.getByRole('button', { name: 'Restore Deep work 20h' }).click()
  await expect(page.getByRole('button', { name: /Archived/ })).toBeHidden()

  // Two-step delete
  await books.getByRole('button', { name: 'Delete Finish 3 books' }).click()
  await expect(page.getByRole('heading', { name: 'Finish 3 books' })).toBeVisible()
  await books.getByRole('button', { name: 'Confirm delete Finish 3 books' }).click()
  await expect(page.getByRole('heading', { name: 'Finish 3 books' })).toBeHidden()

  // Persisted
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Deep work 20h' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Eat right 6 days' })).toBeVisible()
})
