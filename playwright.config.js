const { defineConfig, devices } = require('@playwright/test')

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:9000',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', testMatch: '**/e2e/**/*.spec.js', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', testMatch: '**/e2e/**/*.spec.js', use: { ...devices['Pixel 7'] } },
    { name: 'a11y', testMatch: '**/a11y/**/*.spec.js', use: { ...devices['Desktop Chrome'] } },
  ],
})
