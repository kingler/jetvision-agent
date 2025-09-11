import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './',
  testMatch: 'test-n8n-ui-verification.js',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Run tests sequentially for better observation
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/test-results.json' }],
    ['list']
  ],
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: false, // Run with visible browser for debugging
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },
  projects: [
    {
      name: 'JetVision Agent Tests',
      use: {
        browserName: 'chromium',
        channel: 'chrome'
      },
    },
  ],
  outputDir: 'test-results/',
  timeout: 300000, // 5 minutes per test
});