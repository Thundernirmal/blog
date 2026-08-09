import { defineConfig, devices } from '@playwright/test';

const includeWebKit = Boolean(process.env.CI) || process.env.PLAYWRIGHT_ALL_BROWSERS === '1';
const port = Number(process.env.PORT ?? 4321);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    ...(includeWebKit ? [{ name: 'webkit', use: { ...devices['Desktop Safari'] } }] : []),
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'], viewport: { width: 320, height: 800 } } },
  ],
  webServer: {
    command: 'node scripts/serve-dist.mjs',
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
