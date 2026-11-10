import os from 'node:os';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const PORT = 4100;
const BASE = `http://127.0.0.1:${PORT}`;

/** Single-process production-like server: API + built web app (apps/web/dist) on one origin. */
const serverEnv = {
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: String(PORT),
  MONGODB_URI: process.env.MONGODB_E2E_URI ?? 'mongodb://127.0.0.1:27017/the_reveal_e2e',
  PUBLIC_ORIGIN: BASE,
  ALLOWED_ORIGINS: `${BASE},http://localhost:${PORT}`,
  ANALYTICS_SECRET: 'e2e-only-secret-e2e-only-secret-e2e-only',
  UPLOAD_DIR: path.join(os.tmpdir(), 'reveal-e2e-uploads'),
  SERVE_WEB: 'true',
  WEB_DIST_DIR: path.resolve('apps/web/dist'),
  LOG_LEVEL: 'warn',
  RATE_LIMIT_DISABLED: 'true',
};

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE,
    // Uses an installed browser (Edge/Chrome) so no browser download is needed. Override with PW_CHANNEL.
    channel: process.env.PW_CHANNEL ?? 'msedge',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } }, grepInvert: /@mobile/ },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 360, height: 800 } }, grep: /@mobile/ },
  ],
  webServer: {
    command: 'npx tsx scripts/e2e-reset.ts && npx tsx apps/api/src/server.ts',
    url: `${BASE}/api/v1/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: serverEnv,
    stdout: 'pipe',
  },
});
