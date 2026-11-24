import { expect, nav, openAt, test } from './fixtures'

test('desktop sidebar collapses to icons, keeps working, remembers the choice', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T12:00:00')
  const sidebar = page.getByRole('complementary', { name: 'Sidebar' })
  expect((await sidebar.boundingBox())!.width).toBeGreaterThan(200)
  await sidebar.getByRole('button', { name: 'Collapse menu' }).click()
  await expect.poll(async () => (await sidebar.boundingBox())!.width).toBeLessThan(100)
  await nav(page, 'Goals').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Goals')
  await page.reload()
  await expect.poll(async () => (await sidebar.boundingBox())!.width).toBeLessThan(100)
  await sidebar.getByRole('button', { name: 'Expand menu' }).click()
  await expect.poll(async () => (await sidebar.boundingBox())!.width).toBeGreaterThan(200)
  // phone bar is hidden on desktop
  await expect(page.getByRole('button', { name: 'Expand menu' })).toHaveCount(0)
})
