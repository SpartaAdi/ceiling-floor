import { defineConfig } from '@playwright/test'

const vite = 'node node_modules/vite/bin/vite.js'
const shared = {
  channel: 'chrome', // uses the installed Google Chrome — no browser download
  headless: true,
  timezoneId: 'Asia/Kolkata',
  locale: 'en-IN',
  serviceWorkers: 'block' as const,
  acceptDownloads: true,
}
/** iPhone 15 Pro: 393×852 CSS px, 3× display */
export const IPHONE_15_PRO = {
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
}

export default defineConfig({
  testDir: 'e2e',
  timeout: 45_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  projects: [
    { name: 'desktop', testIgnore: /(mobile|sync)\.spec\.ts/, use: { ...shared, baseURL: 'http://127.0.0.1:4173', viewport: { width: 1440, height: 900 } } },
    { name: 'iphone-15-pro', testMatch: /mobile\.spec\.ts/, use: { ...shared, ...IPHONE_15_PRO, baseURL: 'http://127.0.0.1:4173' } },
    { name: 'sync', testMatch: /sync\.spec\.ts/, use: { ...shared, baseURL: 'http://127.0.0.1:4174', viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    { command: `${vite} preview --host 127.0.0.1 --port 4173 --strictPort`, url: 'http://127.0.0.1:4173', reuseExistingServer: false, timeout: 30_000 },
    {
      // Same app built with sync switched on, pointed at a fake Supabase the tests emulate
      command: `${vite} build --outDir dist-e2e-sync --logLevel error && ${vite} preview --outDir dist-e2e-sync --host 127.0.0.1 --port 4174 --strictPort`,
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: false,
      timeout: 120_000,
      env: { VITE_SUPABASE_URL: 'http://sync.test', VITE_SUPABASE_ANON_KEY: 'e2e-anon-key', VITE_VAPID_PUBLIC_KEY: 'BPublicKeyForE2EOnly' },
    },
  ],
})
