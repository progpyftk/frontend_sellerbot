const { defineConfig, devices } = require('@playwright/test')

// Permite reusar um Chromium já presente na máquina (ex.: o build em cache do
// ms-playwright) quando a revisão exigida pelo runner não está instalada:
// PROMO_CHROME_PATH=/caminho/para/Chromium npx playwright test
const launchOptions = process.env.PROMO_CHROME_PATH
  ? { executablePath: process.env.PROMO_CHROME_PATH }
  : {}

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:9000',
    trace: 'retain-on-failure',
    launchOptions,
  },
  projects: [
    { name: 'desktop', testMatch: '**/e2e/**/*.spec.js', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', testMatch: '**/e2e/**/*.spec.js', use: { ...devices['Pixel 7'] } },
    { name: 'a11y', testMatch: '**/a11y/**/*.spec.js', use: { ...devices['Desktop Chrome'] } },
  ],
})
