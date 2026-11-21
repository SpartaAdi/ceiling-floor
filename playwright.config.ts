import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 45_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    channel: 'chrome', // uses the installed Google Chrome — no browser download
    headless: true,
    viewport: { width: 1440, height: 900 },
    timezoneId: 'Asia/Kolkata',
    locale: 'en-IN',
    serviceWorkers: 'block',
    acceptDownloads: true,
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
