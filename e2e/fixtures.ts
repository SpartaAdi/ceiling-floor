import { test as base, expect, type Page } from '@playwright/test'

/** Fails any test that throws a page error or logs console.error. */
export const test = base.extend<{ errors: string[] }>({
  errors: async ({ page }, use) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
    page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`))
    await use(errors)
    expect(errors, 'no runtime errors').toEqual([])
  },
})
export { expect }

/** Freeze the clock at a local IST time, then open the app. */
export async function openAt(page: Page, isoLocal: string, path = '/') {
  await page.clock.install({ time: new Date(`${isoLocal}+05:30`) })
  await page.goto(path)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}

export async function moveClock(page: Page, isoLocal: string) {
  await page.clock.setSystemTime(new Date(`${isoLocal}+05:30`))
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}

export const nav = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).first().getByRole('button', { name: new RegExp(`^${name}`) })
export const modeTile = (page: Page, mode: 'Ceiling' | 'Floor' | 'Miss') =>
  page.getByRole('radiogroup', { name: 'Day mode' }).getByRole('radio', { name: new RegExp(`^(Plan )?${mode}`) })
export const timeline = (page: Page) => page.getByRole('list', { name: 'Timeline' })
export const budget = (page: Page) => page.getByRole('region', { name: 'Weekly budget' })
export const essentials = (page: Page) => page.getByRole('group', { name: 'Daily essentials' })

export async function loadDemo(page: Page) {
  await nav(page, 'Settings').click()
  await page.getByRole('button', { name: /Load 6-Week Demo Data/ }).click()
  await expect(page.getByRole('status')).toContainText('6 weeks of demo data loaded')
}

/** iPhone 15 Pro emulation (393×852 CSS px) for multi-device tests */
export const IPHONE = {
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
}

/** Phone navigation: bottom tabs for main pages; Routine and Settings live under More. */
export async function phoneNav(page: Page, name: string) {
  const bar = page.getByRole('navigation', { name: 'Main' })
  if (name === 'Routine' || name === 'Settings') {
    await bar.getByRole('button', { name: 'More' }).click()
    await page.getByRole('dialog', { name: 'More' }).getByRole('button', { name: new RegExp(`^${name}`) }).click()
    await expect(page.getByRole('dialog', { name: 'More' })).toBeHidden()
  } else {
    await bar.getByRole('button', { name: new RegExp(`^${name}`) }).click()
  }
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name === 'Review' ? 'Weekly Review' : name)
}

/** Collect runtime errors for pages made outside the default fixture. */
export function watchErrors(page: Page, into: string[]) {
  page.on('pageerror', (e) => into.push(`pageerror: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && into.push(`console: ${m.text()}`))
}
