const { expect, test } = require('@playwright/test')

/**
 * PROMO-IA-15 — a página do advisor responde em 15 segundos.
 *
 * Roda contra um frontend já servido (E2E_BASE_URL) com a API interceptada:
 * nada de backend real, nada de escrita no Mercado Livre. O objetivo é travar
 * por regressão as três perguntas do ticket (atenção / sugestão / bloqueio) e o
 * comportamento dos estados de erro e de mobile.
 */
const BASE_URL = process.env.E2E_BASE_URL

const overview = {
  success: true,
  page: 1,
  page_size: 40,
  total: 2,
  accounts: [{ account_id: 'ACC-1', account_nickname: 'Conta demonstração' }],
  summary: { ads: 753, with_active_promo: 512, below_floor: 56, assistente: 56, agent_history: 83 },
  snapshot: { computed_at: '2026-09-09T17:01:00Z', stale: false, empty: false },
  results: [
    {
      account_id: 'ACC-1', account_nickname: 'Conta demonstração',
      item_id: 'MLB1', title: 'Ureia 25kg', sku: 'U-25', status: 'active',
      price: 100, buyer_price: 70, discount_pct: 30, sales_30d: 5,
      health: 'medio', health_info: { units_per_week: 2 }, cmv_unit: 40,
      missing_inputs: [], has_active_promo: true, origem: 'assistente',
      active_promo: { promotion_type: 'PRICE_DISCOUNT', promotion_name: '', buyer_price: 70, discount_pct: 30, start_date: '2026-09-01T00:00:00Z', finish_date: null },
      margin_pct: 18.4, profit_unit: 8, estimable: true, below_floor: true,
      agent_last: { created_at: '2026-09-06T21:53:00Z', acao: 'aprofundar' },
    },
    {
      account_id: 'ACC-1', account_nickname: 'Conta demonstração',
      item_id: 'MLB2', title: 'Adubo 1kg', sku: 'A-1', status: 'active',
      price: 50, buyer_price: null, discount_pct: null, sales_30d: 0,
      health: 'parado', health_info: { units_per_week: 0 }, cmv_unit: 20,
      missing_inputs: ['shipping'], has_active_promo: false, origem: null, active_promo: null,
      margin_pct: null, profit_unit: null, estimable: false, below_floor: false, agent_last: null,
    },
  ],
}

async function openAdvisor(page, { overviewPayload = overview } = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'e2e-token')
    localStorage.setItem('refreshToken', 'e2e-token')
    localStorage.setItem('currentUser', JSON.stringify({ id: 1, email: 'dono@local', is_staff: true }))
  })
  await page.route('**/users/me/', (route) => route.fulfill({ json: { id: 1, email: 'dono@local', is_staff: true } }))
  await page.route('**/mercadolivre/promotions-advisor/**', (route) => route.fulfill({ json: { success: true, insights: {} } }))
  await page.route('**/mercadolivre/promo-overview/**', (route) => route.fulfill({ json: overviewPayload }))
  await page.goto(`${BASE_URL}/app/promotions/advisor`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('table tbody tr, .sb-empty')
}

test.describe('PROMO-IA-15 · painel do advisor', () => {
  test.skip(!BASE_URL, 'Requer E2E_BASE_URL (frontend servido)')

  test('a primeira dobra responde atenção, sugestão e bloqueio', async ({ page }) => {
    await openAdvisor(page)

    await expect(page.getByRole('heading', { name: 'Requer atenção hoje' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'O que o assistente sugere' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Protegido / bloqueado' })).toBeVisible()

    // Números do escopo, não da página filtrada.
    await expect(page.locator('.pv-scope__kpi').first()).toContainText('753')

    // Bloqueio explicado com a regra, não só com cor.
    await expect(page.getByText(/margem ≥ 30% e lucro ≥ R\$\s*12,00/).first()).toBeVisible()
    await expect(page.getByText('Sugestão da régua — nada é alterado no Mercado Livre')).toBeVisible()

    // Tabela responde na ordem pedida.
    const headers = (await page.locator('table thead th').allInnerTexts())
      .map((h) => h.replace(/\s*(unfold_more|arrow_downward|arrow_upward)\s*/g, '').trim().toUpperCase())
    expect(headers.slice(1, 6)).toEqual(['ANÚNCIO', 'SITUAÇÃO', 'SUGESTÃO', 'MARGEM', 'LUCRO'])

    // Estado honesto + sugestão da régua por linha.
    await expect(page.locator('table tbody .sb-badge').filter({ hasText: 'Bloqueado: piso' }).first()).toBeVisible()
    await expect(page.locator('table tbody .sb-badge').filter({ hasText: 'Sem ação' }).first()).toBeVisible()
    await expect(page.locator('table tbody .sb-badge').filter({ hasText: 'Revisar anúncio' }).first()).toBeVisible()

    // Legenda semântica (cor nunca é a única informação).
    await expect(page.locator('.pv-legend')).toContainText('bloqueado pelo piso')
  })

  test('estado de erro não parece busca vazia e oferece retry', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'e2e-token')
      localStorage.setItem('refreshToken', 'e2e-token')
      localStorage.setItem('currentUser', JSON.stringify({ id: 1, email: 'dono@local', is_staff: true }))
    })
    await page.route('**/users/me/', (route) => route.fulfill({ json: { id: 1, email: 'dono@local', is_staff: true } }))
    await page.route('**/mercadolivre/promotions-advisor/**', (route) => route.fulfill({ json: { insights: {} } }))
    await page.route('**/mercadolivre/promo-overview/**', (route) => route.abort('failed'))
    await page.goto(`${BASE_URL}/app/promotions/advisor`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.sb-empty')

    await expect(page.getByText('Não conseguimos falar com o servidor agora')).toBeVisible()
    await expect(page.getByText('Tentar novamente')).toBeVisible()
    await expect(page.locator('.pv-result')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Requer atenção hoje' })).toHaveCount(0)
  })

  test('mobile: cartões com rótulo e sem rolagem horizontal da tabela', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openAdvisor(page)

    // O cartão de atenção aparece na primeira dobra.
    const band = await page.locator('.adb-card--alert').boundingBox()
    expect(band.y).toBeLessThan(844)

    // Modo cartão: cada célula carrega o rótulo da coluna em data-label, que o
    // CSS imprime via ::before (o <thead> fica oculto no celular).
    await expect(page.locator('td[data-label="Situação"]').first()).toBeVisible()
    await expect(page.locator('td[data-label="Sugestão"]').first()).toBeVisible()
    const labelText = await page.evaluate(() => {
      const td = document.querySelector('td[data-label="Situação"]')
      return td ? getComputedStyle(td, '::before').content : ''
    })
    expect(labelText).toContain('Situação')

    const overflow = await page.evaluate(() => {
      const wrap = document.querySelector('.sb-table-wrap')
      return wrap ? wrap.scrollWidth - wrap.clientWidth : 0
    })
    expect(overflow).toBeLessThanOrEqual(1)
  })
})
