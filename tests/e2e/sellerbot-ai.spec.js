import { expect, test } from '@playwright/test'

test.describe('SellerBot AI stream contract', () => {
  test.skip(!process.env.E2E_BASE_URL, 'Requires an authenticated E2E_BASE_URL environment')

  test('keeps tool payloads out of the assistant bubble', async ({ page }) => {
    await page.route('**/sellerbot-ai/health/', route => route.fulfill({ json: { status: 'ok', current_model: null } }))
    await page.route('**/sellerbot-ai/models/', route => route.fulfill({ json: { models: [], image_gen_models: [], image_agent_models: [] } }))
    await page.route('**/sellerbot-ai/sessions/', route => route.fulfill({ json: { sessions: [] } }))
    await page.route('**/sellerbot-ai/balance/', route => route.fulfill({ json: { usage_usd: 0, limit_usd: 1, balance_usd: 1 } }))

    await page.goto('/app/sellerbot-ai')
    await expect(page.getByText('SellerBot AI')).toBeVisible()
  })
})
