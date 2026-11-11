import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke tests against an ALREADY RUNNING deployment (staging tunnel or the public site).
 * Read-only by default. Nothing is started, seeded or reset.
 *
 *   SMOKE_BASE_URL=http://localhost:4320 npx playwright test -c playwright.smoke.config.ts      # staging via SSH tunnel
 *   SMOKE_BASE_URL=https://zdu.elivateict.com npx playwright test -c playwright.smoke.config.ts # public site
 *   SMOKE_WRITE=1 ... also submits ONE clearly-labelled feedback entry (hide it afterwards in Admin → Feedback).
 */
const BASE = process.env.SMOKE_BASE_URL;
if (!BASE) throw new Error('Set SMOKE_BASE_URL, e.g. http://localhost:4320 or https://zdu.elivateict.com');

export default defineConfig({
  testDir: 'tests/smoke',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 90_000,
  reporter: [['list']],
  use: {
    baseURL: BASE,
    channel: process.env.PW_CHANNEL ?? 'msedge',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } }, grepInvert: /@mobile/ },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 } }, grep: /@mobile/ },
  ],
});
