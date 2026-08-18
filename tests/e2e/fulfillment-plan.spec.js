import { expect, test } from '@playwright/test'

const plan = {
  id: 91,
  status: 'ready_with_warnings',
  frequency_days: 7,
  next_dispatch_date: '2026-08-20',
  strategy: {
    regime: 'availability_defense',
    rationale: 'Proteção de disponibilidade: 31% de itens Full próximos de ruptura; 92% do catálogo com saldo ERP fresco.',
    evidence: [
      { metric: 'rupture_pressure', value: 0.31, label: 'itens Full próximos de ruptura' },
      { metric: 'erp_stock_coverage', value: 0.92, label: 'catálogo com saldo ERP fresco' },
    ],
  },
  summary: {
    total_lines: 184,
    replenish_full: 12,
    start_full: 8,
    next_cycle: 17,
    data_review: 4,
    recommended_units: 286,
    estimated_capital: 8430.5,
    actionable_lines: 37,
  },
  source_snapshot: { as_of: '2026-08-18' },
}

const lines = [
  {
    id: 501,
    title: 'Kit Organizador Modular Premium',
    variation_name: 'Cinza · 6 peças',
    sku: 'ORG-MOD-CZ-6',
    item_id_ml: 'MLB1234567890',
    action: 'replenish_full',
    need_quantity: 28,
    recommended_quantity: 24,
    effective_quantity: 24,
    dispatch_by: '2026-08-20',
    forecast: { daily_units: 2.4, trend: 0.18, confidence: 'high', model: 'weighted_trend' },
    inventory: { full_sellable: 7, erp_available: 24, coverage_before_days: 3, coverage_after_days: 13 },
    economics: { average_ticket: 129.9, contribution_60: 2480.2, contribution_margin_rate: 0.27, ads_cost_60: 310 },
    indicators: { conversion_rate: 3.4, performance_score: 92, visits_60: 1840 },
    decision: {
      reasons: ['below_protection_horizon'],
      warnings: [],
      formula: { lead_time_days: 5, frequency_days: 7, safety_days: 7 },
    },
  },
  {
    id: 502,
    title: 'Suporte Articulado para Notebook',
    variation_name: 'Prata',
    sku: 'SUP-NOTE-PR',
    item_id_ml: 'MLB0987654321',
    action: 'start_full',
    need_quantity: 10,
    recommended_quantity: 10,
    effective_quantity: 10,
    dispatch_by: '2026-08-20',
    forecast: { daily_units: 0.9, trend: 0.11, confidence: 'medium', model: 'moving_30' },
    inventory: { full_sellable: 0, erp_available: 34, coverage_before_days: 0, coverage_after_days: 11 },
    economics: { average_ticket: 89.9, contribution_60: 940.4, contribution_margin_rate: 0.22, ads_cost_60: 120 },
    indicators: { conversion_rate: 2.7, performance_score: 86, visits_60: 970 },
    decision: {
      reasons: ['controlled_first_full_lot'],
      warnings: ['full_uplift_not_assumed'],
      formula: { lead_time_days: 5, frequency_days: 7, safety_days: 7 },
    },
  },
]

test.describe('Plano estratégico de fulfillment', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'e2e-token')
      localStorage.setItem('currentUser', JSON.stringify({ id: 7, username: 'operador', is_read_only: false }))
    })
    await page.route('**/mercadolivre/**', async route => {
      const url = new URL(route.request().url())
      if (url.pathname === '/mercadolivre/accounts/') {
        return route.fulfill({ json: [{ account_id: 'ACC-FULL', account_nickname: 'Operação principal', is_connected: true }] })
      }
      if (url.pathname === '/mercadolivre/fulfillment/shipment-plans/') {
        return route.fulfill({ json: { items: [plan] } })
      }
      if (url.pathname === '/mercadolivre/fulfillment/shipment-plans/91/') {
        return route.fulfill({ json: { plan, adjustments: [], exports: [] } })
      }
      if (url.pathname === '/mercadolivre/fulfillment/shipment-plans/91/lines/') {
        return route.fulfill({ json: { items: lines, page: 1, page_size: 100, total: 37, has_next: false } })
      }
      return route.fulfill({ status: 404, json: { detail: 'E2E route not mocked' } })
    })
  })

  test('prioriza a agenda e explica cada recomendação', async ({ page }, testInfo) => {
    await page.goto('/app/fulfillment')
    await expect(page.getByRole('heading', { name: 'O que enviar, quanto e quando' })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)

    expect(await page.evaluate(() => document.fonts.check('20px "Material Icons"'))).toBeTruthy()
    await expect(page.getByText('Proteção de disponibilidade', { exact: true })).toBeVisible()
    const firstProduct = page.locator('strong:visible', { hasText: 'Kit Organizador Modular Premium' }).first()
    await expect(firstProduct).toBeVisible()
    await expect(page.locator('strong:visible', { hasText: 'Suporte Articulado para Notebook' }).first()).toBeVisible()
    await page.screenshot({ path: `/tmp/full9-overview-${testInfo.project.name}.png`, fullPage: true })

    await firstProduct.click()
    await expect(page.getByRole('heading', { name: 'Como chegamos nesta quantidade' })).toBeVisible()
    await expect(page.getByRole('dialog').getByText('24', { exact: true }).first()).toBeVisible()

    await page.screenshot({ path: `/tmp/full9-${testInfo.project.name}.png`, fullPage: true })
  })
})
