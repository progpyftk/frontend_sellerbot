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
  // Bloco do acionamento automático (PROMO-IA-21): alimenta o "Hoje" e o "Como funciona".
  automation: {
    write_mode_global: true,
    kill_switch: false,
    day_window: { start: '2026-09-11T03:00:00Z', end: '2026-09-12T03:00:00Z', timezone: 'America/Sao_Paulo' },
    cycle_today: true,
    next_cycle_at: '2026-09-12T12:00:00Z',
    last_cycle: {
      started_at: '2026-09-11T12:00:00Z', finished_at: '2026-09-11T12:08:33Z',
      status: 'partial', duration_seconds: 513, items_processed: 3, errors_count: 0,
      reconciled: 23, unreconciled: 2, margin_alerts_total: 13,
    },
    by_account: {
      'ACC-1': {
        account_nickname: 'Conta demonstração', auto_write: true, wave_size: 10,
        paused: false, canary_pending: false, margin_alerts: [], writes_today: 3,
        today: {
          alterados: 3, ja_no_alvo: 17, nao_confirmados: 2, recusados: 0, bloqueados: 96,
          no_plano: 106, anuncios_ativos: 406, aguardando_aval: 0, sem_dado_de_custo: 12,
          motivos: {
            SMART_READ_ONLY: { label: 'o preço é do Mercado Livre (SMART)', anuncios: 37 },
            ALREADY_WRITTEN_TODAY_ITEM: { label: 'já tinham sido alterados hoje (não escreve 2× no mesmo dia)', anuncios: 46 },
          },
        },
        protection: {
          aplicadas: 3, abaixo_do_piso: 0, menor_margem_pct: 30.2, menor_lucro_brl: 12.32,
          ultima_escrita_at: '2026-09-11T12:05:00Z',
        },
        last_writes: [{
          item_id: 'MLB3795974187', title: 'Basacote 12m', action: 'aprofundar',
          price_before: '47.00', price_after: '39.00', margin_pct: '31.3', profit_unit: '12.19',
          state: 'executed_verified', origin: 'automation', at: '2026-09-11T12:05:00Z',
        }],
      },
    },
  },
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

    // PROMO-IA-21: a primeira leitura é o TRABALHO DO ROBÔ (bloco "Hoje"), antes da faixa
    // de decisão. A faixa continua respondendo atenção/sugestão/bloqueio logo abaixo.
    await expect(page.locator('.atw__top')).toBeVisible()
    await expect(page.getByText('anúncios alterados hoje', { exact: true })).toBeVisible()
    await expect(page.locator('.atw__protection')).toContainText('nenhum preço saiu abaixo do piso')
    // No desktop a faixa de decisão tem títulos; no celular ela é compacta (três linhas).
    const largo = (page.viewportSize()?.width || 1280) >= 600
    if (largo) {
      await expect(page.getByRole('heading', { name: 'Requer atenção hoje' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Sugestões nesta página' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Bloqueios nesta página' })).toBeVisible()
    } else {
      await expect(page.locator('.adb-compact__row--alert')).toContainText('abaixo do piso')
      await expect(page.locator('.adb-compact__row--assistant')).toContainText('Sugere')
      await expect(page.locator('.adb-compact__row--safe')).toContainText('Escrita barrada')
    }

    // Números do escopo, não da página filtrada.
    await expect(page.locator('.pv-scope__kpi').first()).toContainText('753')

    // Bloqueio explicado com a regra, não só com cor (no celular, dentro do bloco compacto).
    const escopo = largo ? '.adb-card--safe' : '.adb-compact__row--safe'
    await expect(page.locator(escopo)).toContainText(/margem/ )
    if (largo) {
      await expect(page.getByText('Sugestão da régua — nada é alterado no Mercado Livre').first()).toBeVisible()
    }

    // Tabela responde na ordem pedida.
    const headers = (await page.locator('.sb-table-wrap table thead th').allInnerTexts())
      .map((h) => h.replace(/\s*(unfold_more|arrow_downward|arrow_upward)\s*/g, '').trim().toUpperCase())
    expect(headers.slice(1, 8)).toEqual(['ANÚNCIO', 'SITUAÇÃO', 'SUGESTÃO', 'PREÇO-BASE', 'PREÇO PROMO', 'MARGEM', 'LUCRO'])

    // Estado honesto + sugestão da régua por linha.
    await expect(page.locator('.sb-table-wrap table tbody .sb-badge').filter({ hasText: 'Bloqueado: piso' }).first()).toBeVisible()
    await expect(page.locator('.sb-table-wrap table tbody .sb-badge').filter({ hasText: 'Sem ação' }).first()).toBeVisible()
    await expect(page.locator('.sb-table-wrap table tbody .sb-badge').filter({ hasText: 'Revisar anúncio' }).first()).toBeVisible()

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

    // A primeira dobra do celular é o TRABALHO DO ROBÔ (PROMO-IA-21): o dono precisa ver
    // "mexeu em quê / nada a fazer" antes de qualquer outra coisa.
    const topo = await page.locator('.atw__top').boundingBox()
    expect(topo.y).toBeLessThan(844)
    await expect(page.locator('.atw__protection')).toBeVisible()
    const protecao = await page.locator('.atw__protection').boundingBox()
    expect(protecao.y).toBeLessThan(844)

    // A faixa de decisão continua existindo (agora depois do bloco do robô).
    await expect(page.locator('.adb-compact__row--assistant')).toContainText('Sugere')
    await expect(page.locator('.adb-compact__row--safe')).toContainText('Escrita barrada')

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
