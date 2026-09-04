import { defineConfig } from '@playwright/test';

const basePath = process.env.GITHUB_REPOSITORY ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` : '/';
const baseURL = process.env.QA_BASE_URL || `http://127.0.0.1:4322${basePath}`;
export default defineConfig({
  testDir: './tests/browser',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, browserName: 'chromium', channel: process.env.CI ? undefined : 'chrome', trace: 'retain-on-failure', screenshot: 'only-on-failure', reducedMotion: 'reduce' },
  webServer: process.env.QA_BASE_URL ? undefined : {
    command: 'npm run preview -- --host 127.0.0.1 --port 4322 --strictPort',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
