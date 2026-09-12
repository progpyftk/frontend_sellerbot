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
  await page.route('**/mercadolivre/advisor/catalog/**', (route) => route.fulfill({ json: overviewPayload }))
  await page.route('**/mercadolivre/promo-overview/**', (route) => route.fulfill({ json: overviewPayload }))
  // PROMO-IA-22 F2: a superfície "Anúncios" tem rota e contrato próprios.
  await page.goto(`${BASE_URL}/app/promotions/advisor/anuncios`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.adv-table__table tbody tr:visible, .adv-table__cards li:visible, .adv-empty')
}

test.describe('PROMO-IA-22 · superfície Anúncios', () => {
  test.skip(!BASE_URL, 'Requer E2E_BASE_URL (frontend servido)')

  /** A primeira linha VISÍVEL: tabela no desktop, cartão no celular. */
  const primeiraLinha = (page) => page
    .locator('.adv-table__table tbody tr:visible, .adv-table__cards li:visible').first();

  test('responde o recorte, os números do catálogo e a situação de cada linha', async ({ page }) => {
    await openAdvisor(page)
    await page.waitForSelector('.adv-table__table tbody tr:visible, .adv-table__cards li:visible')

    // Números do catálogo (escopo inteiro), não da página paginada.
    const metrica = (rotulo) => page.locator('.adv-metric').filter({ hasText: rotulo })
    await expect(metrica('anúncios no catálogo')).toContainText('753')
    await expect(metrica('abaixo do piso')).toContainText('56')
    await expect(metrica('com promoção ativa')).toContainText('512')

    // Hierarquia do preset padrão ("Assistente"): o que fazer vem antes de quanto custou.
    const headers = (await page.locator('.adv-table__table thead th').allInnerTexts())
      .map((h) => h.replace(/\s*(unfold_more|arrow_downward|arrow_upward)\s*/g, '').trim().toUpperCase())
    expect(headers).toEqual([
      'ANÚNCIO', 'SITUAÇÃO', 'O QUE FAZER', 'PREÇO-BASE', 'PREÇO PROMO',
      'MARGEM', 'LUCRO/UN.', 'VENDAS 30D', 'ÚLTIMA AÇÃO', 'NO MERCADO LIVRE',
    ])

    // Linha com dado real e estado explicado (cor nunca é a única informação).
    await expect(primeiraLinha(page)).toContainText('Ureia 25kg')
    await expect(primeiraLinha(page)).toContainText('Bloqueado: piso')
    await expect(primeiraLinha(page)).toContainText('Sem ação')
  })

  test('o preset "Completo" traz as colunas financeiras de volta', async ({ page }) => {
    await openAdvisor(page)
    await page.getByRole('button', { name: 'Completo' }).click()
    await expect(page.locator('.adv-table__table thead th').filter({ hasText: 'CMV' })).toHaveCount(1)
    await expect(page.locator('.adv-table__table thead th').filter({ hasText: 'SAÚDE' })).toHaveCount(1)
  })

  test('drill-down mostra a linha inteira sem sair da página e sem popup', async ({ page }) => {
    await openAdvisor(page)
    await primeiraLinha(page).click()

    const detalhe = page.locator('.cat__detalhe')
    await expect(detalhe).toBeVisible()
    await expect(detalhe).toContainText('Lucro por venda')
    await expect(detalhe).toContainText('Última ação do robô')
    await expect(detalhe.getByRole('link')).toHaveCount(0)   // o popup ficou de fora por decisão
  })

  test('estado de erro não parece busca vazia e oferece retry', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'e2e-token')
      localStorage.setItem('refreshToken', 'e2e-token')
      localStorage.setItem('currentUser', JSON.stringify({ id: 1, email: 'dono@local', is_staff: true }))
    })
    await page.route('**/users/me/', (route) => route.fulfill({ json: { id: 1, email: 'dono@local', is_staff: true } }))
    await page.route('**/mercadolivre/advisor/catalog/**', (route) => route.abort('failed'))
    await page.goto(`${BASE_URL}/app/promotions/advisor/anuncios`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.adv-empty')

    await expect(page.getByText('Tentar novamente')).toBeVisible()
    await expect(page.locator('.adv-table__table')).toHaveCount(0)
    await expect(page.locator('.adv-metric')).toHaveCount(0)
  })

  test('mobile: cartões em vez de tabela, sem rolagem horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openAdvisor(page)
    await page.waitForSelector('.adv-table__cards li')

    await expect(page.locator('.adv-table__cards li').first()).toBeVisible()
    await expect(page.locator('.adv-table__cards li').first()).toContainText('Ureia 25kg')
    // a tabela larga fica fora do caminho: no celular ela nem é exibida
    await expect(page.locator('.adv-table__wrap')).toBeHidden()

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
})


/**
 * PROMO-IA-22 — a superfície "Hoje" (rota principal do advisor).
 *
 * Responde, na ordem: está tudo dentro do piso? quanto o robô alterou? o que espera aval?
 * por que não mexeu no resto? E oferece a parada de emergência.
 */
const hoje = {
  write_mode_global: true,
  kill_switch: false,
  day_window: { start: '2026-09-11T03:00:00Z', end: '2026-09-12T03:00:00Z', timezone: 'America/Sao_Paulo' },
  cycle_today: true,
  next_cycle_at: '2026-09-12T12:00:00Z',
  last_cycle: {
    started_at: '2026-09-11T12:00:00Z', status: 'partial', duration_seconds: 513,
    items_processed: 3, errors_count: 0, reconciled: 23, unreconciled: 2,
  },
  by_account: {
    'ACC-1': {
      account_nickname: 'MOGIVITTA', auto_write: true, wave_size: 10, paused: false,
      canary_pending: false, margin_alerts: [],
      today: {
        alterados: 3, ja_no_alvo: 17, nao_confirmados: 2, recusados: 0, bloqueados: 96,
        no_plano: 106, anuncios_ativos: 406, aguardando_aval: 17, sem_dado_de_custo: 12,
        motivos: { SMART_READ_ONLY: { label: 'o preço é do Mercado Livre (SMART)', anuncios: 37 } },
      },
      protection: { aplicadas: 3, abaixo_do_piso: 0, menor_margem_pct: 30.2, menor_lucro_brl: 12.32,
                    ultima_escrita_at: '2026-09-11T13:36:00Z' },
      last_writes: [{
        item_id: 'MLB3795974187', title: 'Basacote 12m', price_before: '47.00', price_after: '39.00',
        margin_pct: '31.3', profit_unit: '12.19', state: 'executed_verified', origin: 'automation',
        at: '2026-09-11T12:05:00Z',
      }],
    },
  },
};

test.describe('PROMO-IA-22 · superfície Hoje', () => {
  test.skip(!BASE_URL, 'Requer E2E_BASE_URL (frontend servido)')

  test('responde piso, alterados, espera de aval e motivos', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'e2e-token')
      localStorage.setItem('refreshToken', 'e2e-token')
      localStorage.setItem('currentUser', JSON.stringify({ id: 1, email: 'dono@local', is_staff: true }))
    })
    await page.route('**/users/me/', (r) => r.fulfill({ json: { id: 1, email: 'dono@local', is_staff: true } }))
    await page.route(/\/mercadolivre\/advisor\/today\/?/, (r) => r.fulfill({ json: hoje }))
    await page.route(/\/mercadolivre\/advisor\/automation\/?/, (r) => r.fulfill({ json: hoje }))
    await page.goto(`${BASE_URL}/app/promotions/advisor`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.adv-metric')

    // navegação por superfície
    await expect(page.getByRole('link', { name: 'Hoje' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Anúncios' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Automação' })).toBeVisible()

    // a resposta que dá paz vem antes de tudo
    await expect(page.getByText('Nenhum preço saiu abaixo do piso').first()).toBeVisible()
    await expect(page.getByText(/R\$\s*12,32/).first()).toBeVisible()

    // métricas com unidade
    await expect(page.getByText('anúncios alterados hoje', { exact: true })).toBeVisible()
    await expect(page.getByText('já estavam no preço-alvo', { exact: true })).toBeVisible()
    await expect(page.getByText('Esperando você')).toBeVisible()

    // lista antes → depois
    await expect(page.getByText('MLB3795974187', { exact: true })).toBeVisible()
    await expect(page.getByText(/R\$\s*47,00/).first()).toBeVisible()

    // motivos como proteção
    await expect(
      page.locator('.today__motivos li').filter({ hasText: 'o preço é do Mercado Livre (SMART)' }),
    ).toBeVisible()
  })

  test('mobile: a primeira dobra traz piso, métricas e o botão de parada', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'e2e-token')
      localStorage.setItem('refreshToken', 'e2e-token')
      localStorage.setItem('currentUser', JSON.stringify({ id: 1, email: 'dono@local', is_staff: true }))
    })
    await page.route('**/users/me/', (r) => r.fulfill({ json: { id: 1, email: 'dono@local', is_staff: true } }))
    await page.route(/\/mercadolivre\/advisor\/today\/?/, (r) => r.fulfill({ json: hoje }))
    await page.goto(`${BASE_URL}/app/promotions/advisor`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.adv-metric')

    const shield = await page.locator('.today__shield').boundingBox()
    expect(shield.y).toBeLessThan(844)
    await expect(page.getByRole('button', { name: /Pausar toda a escrita/ })).toBeVisible()
    const metrica = await page.locator('.adv-metric').first().boundingBox()
    expect(metrica.y).toBeLessThan(844)
  })
})


/**
 * PROMO-IA-22 — a superfície "Automação" (rota /automacao).
 *
 * É a única que ESCREVE (política). O que precisa ficar travado aqui: quem escreve agora, a régua
 * ao lado do controle, a pausa de emergência com confirmação e o aval da primeira leva.
 */
const automacao = {
  write_mode_global: true,
  kill_switch: false,
  cycle_today: true,
  next_cycle_at: '2026-09-13T12:00:00Z',
  by_account: {
    'ACC-1': {
      account_nickname: 'MOGIVITTA', auto_write: true, wave_size: 10, paused: false,
      pause_reason: '', canary_pending: false, writes_today: 3,
      margin_alerts: [{
        kind: 'smart_low_margin', item_id: 'MLB3796050843', title: 'Adubo 2kg SMART',
        margin_pct: '23.2', profit_unit: 28.47, price: 119.14, threshold_pct: '25', at: null,
      }],
    },
    'ACC-2': {
      // conta nova: escrita LIGADA e parada no portão da primeira leva (estado real de onboarding)
      account_nickname: 'AGF_ORGANICS', auto_write: true, wave_size: 50, paused: false,
      pause_reason: '', canary_pending: true, writes_today: 0, margin_alerts: [],
    },
  },
};

async function abrirAutomacao(page, payload = automacao) {
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'e2e-token')
    localStorage.setItem('refreshToken', 'e2e-token')
    localStorage.setItem('currentUser', JSON.stringify({ id: 1, email: 'dono@local', is_staff: true }))
  })
  await page.route('**/users/me/', (r) => r.fulfill({ json: { id: 1, email: 'dono@local', is_staff: true } }))
  await page.route('**/mercadolivre/advisor/automation/**', (route) => {
    if (route.request().method() === 'PATCH') return route.fulfill({ json: { success: true } })
    return route.fulfill({ json: payload })
  })
  await page.goto(`${BASE_URL}/app/promotions/advisor/automacao`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.aut__contas')
}

test.describe('PROMO-IA-22 · superfície Automação', () => {
  test.skip(!BASE_URL, 'Requer E2E_BASE_URL (frontend servido)')

  test('diz quem escreve, mostra a régua ao lado do controle e o glossário', async ({ page }) => {
    await abrirAutomacao(page)

    // MOGIVITTA escreve; a AGF está autorizada mas parada no portão — não conta como escrita
    await expect(page.locator('.aut__estado')).toContainText('1 conta(s) escrevendo agora: MOGIVITTA')
    await expect(page.locator('.aut__estado')).toContainText('esperam o seu aval')
    await expect(page.locator('.aut__contas')).toContainText('MOGIVITTA')
    await expect(page.locator('.aut__contas')).toContainText('AGF_ORGANICS')
    // conta em canário: o dono vê o portão e o botão de aprovar
    await expect(page.locator('.aut__canario')).toContainText('Primeira leva esperando o seu aval')
    // alerta SMART é sinalização, não escrita
    await expect(page.locator('.aut__alertas')).toContainText('abaixo do limite de 25,0%')

    const corpo = page.locator('.adv-shell__body')
    await expect(corpo).toContainText('Margem-alvo por saúde de vendas')
    await expect(corpo).toContainText('Pisos que nunca são cruzados')
    await expect(corpo).toContainText('Uma escrita por anúncio por dia')
    await expect(corpo).toContainText('09:00 (Brasília)')
    await expect(corpo).toContainText('Glossário')
    await expect(corpo).toContainText('Portão')
  })

  test('a pausa de emergência pede confirmação antes de agir', async ({ page }) => {
    await abrirAutomacao(page)

    await page.getByRole('button', { name: 'Pausar toda a escrita' }).click()
    // a confirmação explica a consequência ANTES de qualquer PATCH
    await expect(page.locator('.aut__confirmar')).toContainText('já aplicadas continuam no ar')

    let patch = 0
    page.on('request', (r) => { if (r.method() === 'PATCH') patch += 1 })
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.locator('.aut__confirmar')).toHaveCount(0)
    expect(patch).toBe(0)

    await page.getByRole('button', { name: 'Pausar toda a escrita' }).click()
    await page.getByRole('button', { name: 'Confirmar pausa' }).click()
    await expect(page.locator('.aut__aviso')).toContainText('continuam no ar')
  })

  test('com o kill switch ligado, nenhuma conta aparece como ativa', async ({ page }) => {
    await abrirAutomacao(page, { ...automacao, kill_switch: true })

    await expect(page.locator('.aut__estado')).toContainText('interruptor de emergência')
    await expect(page.locator('.aut__contas')).toContainText('Autorizada, mas travada')
    // sem conta escrevendo, o botão de pausa total sai de cena
    await expect(page.getByRole('button', { name: 'Pausar toda a escrita' })).toHaveCount(0)
  })

  test('mobile: controle e régua legíveis, sem rolagem horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await abrirAutomacao(page)

    await expect(page.locator('.aut__estado')).toBeVisible()
    await expect(page.locator('.aut__contas li').first()).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })
})
