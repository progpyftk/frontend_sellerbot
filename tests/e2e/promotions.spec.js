import { expect, test } from '@playwright/test'

test.describe('Mercado Livre promotions capability states', () => {
  test.skip(!process.env.E2E_BASE_URL, 'Requires an authenticated E2E_BASE_URL environment')

  test('shows automatic and read-only campaign states without activation actions', async ({ page }) => {
    await page.route('**/mercadolivre/promotions/**', route => route.fulfill({
      json: {
        success: true,
        data: [{
          account_id: 'ACC-E2E',
          account_nickname: 'Conta E2E',
          promotions: [
            {
              id: 'P-AUTO',
              type: 'PRICE_MATCHING_MELI_ALL',
              name: 'Preço competitivo automático',
              status: 'started',
              candidate_count: 0,
              active_count: 2,
              paused_count: 1,
              can_manual_activate: false,
              activation_mode: 'automatic',
              activation_block_reason: 'Esta campanha é ativada automaticamente pelo Mercado Livre.',
              boosted_offer: true,
              boosted_discount_pct: 5,
              boosted_discount_amount: 10,
              buyer_price_after_boost: 90,
            },
          ],
        }],
      },
    }))

    await page.goto('/app/promotions')
    await expect(page.getByText('Gerenciador de Promoções')).toBeVisible()
    await expect(page.getByText('Gerenciada automaticamente pelo ML')).toBeVisible()
    await expect(page.getByText('1 Pausados')).toBeVisible()
    await expect(page.getByText('Ativar', { exact: true })).toHaveCount(0)
  })
})
