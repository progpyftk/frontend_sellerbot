const { test, expect } = require('playwright/test')

const BASE_URL = process.env.BASE_URL || 'http://localhost:9000'

const dashboardOperation = {
  operation: {
    gmv: 1000,
    net_revenue: 800,
    gross_profit: 200,
    ads_cost: 50,
    lucro_liquido: 150,
    lucro_liquido_pct: 18.75,
    gross_margin_pct: 25,
    tacos: 5,
    orders_count: 5,
    units_sold: 5,
    avg_ticket: 200,
  },
  daily: [{
    date: '2026-08-01',
    gmv: 1000,
    net_revenue: 800,
    gross_profit: 200,
    ads_cost: 50,
    lucro_liquido: 150,
    orders_count: 5,
    units_sold: 5,
  }],
  accounts: [{
    account_id: 'ml-test',
    account_nickname: 'Conta de teste',
    gmv: 1000,
    net_revenue: 800,
    gross_profit: 200,
    ads_cost: 50,
    lucro_liquido: 150,
    orders_count: 5,
    units_sold: 5,
  }],
}

const order = {
  id: 1,
  order_id: 'ML-TEST-1',
  order_sn: 'SH-TEST-1',
  account: { account_nickname: 'Conta de teste' },
  account_nickname: 'Conta de teste',
  status: 'paid',
  buyer_nickname: 'Cliente teste',
  buyer_username: 'cliente-teste',
  total_amount: 200,
  date_created: '2026-08-01T12:00:00Z',
  create_time: '2026-08-01T12:00:00Z',
  items: [{ title: 'Produto teste', item_id_ml: 'ITEM-1', quantity: 1 }],
  total_fee: 20,
  fee_breakdown: { total_sale_fee: 20, seller_shipping_cost: 0, net_received: 180 },
  shipping_cost: 0,
  lucro_apos_cmp: 80,
  custo_medio_produto: 100,
  shipment: null,
  items_count: 1,
}

const shopeeOrder = {
  id: 2,
  order_sn: 'SH-TEST-1',
  shop_name: 'Loja Shopee',
  status: 'COMPLETED',
  buyer_username: 'cliente-teste',
  total_amount: 200,
  create_time: '2026-08-01T12:00:00Z',
  items: [{ item_name: 'Produto teste', quantity: 1 }],
  escrow_amount: 180,
  escrow_synced: true,
  lucro_apos_cmp: 80,
  custo_medio_produto: 100,
}

const tiktokOrder = {
  id: 3,
  order_id: 'TT-TEST-1',
  shop_name: 'Loja TikTok',
  status: 'COMPLETED',
  buyer_username: 'cliente-teste',
  total_amount: 200,
  create_time: '2026-08-01T12:00:00Z',
  items: [{ product_name: 'Produto teste', quantity: 1 }],
  platform_fee: 20,
  settlement_amount: 180,
  lucro_apos_cmp: 80,
  custo_medio_produto: 100,
}

async function json(route, body) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

async function mockBackend(page) {
  await page.route('**/mercadolivre/**', async route => {
    const pathname = new URL(route.request().url()).pathname
    if (pathname.endsWith('/dashboard/operation/')) return json(route, dashboardOperation)
    if (pathname.endsWith('/orders/today-summary/')) return json(route, { count: 1, total_amount: 200, lucro_apos_cmp: 80, avg_lucro_apos_cmp: 80, cmp_count: 1 })
    if (pathname.endsWith('/orders/kpis/')) return json(route, { gmv: 200, orders_count: 1, units_sold: 1, avg_ticket: 200 })
    if (pathname.endsWith('/orders/')) return json(route, { count: 1, results: [order] })
    if (pathname.endsWith('/accounts/')) return json(route, [{ account_id: 'ml-test', account_nickname: 'Conta de teste' }])
    return json(route, {})
  })

  await page.route('http://127.0.0.1:8001/shopee/**', route => {
    const pathname = new URL(route.request().url()).pathname
    if (pathname.endsWith('/accounts/')) return json(route, [{ id: 'sh-test', shop_name: 'Loja Shopee' }])
    if (pathname.endsWith('/today_stats/')) {
      return json(route, {
        count: 1, count_paid: 1, count_cancelled: 0, count_unpaid: 0,
        faturamento: 180, faturamento_note: 'escrow', escrow_count: 1,
        lucro_apos_cmp: 80, margem_pct: 44.4, avg_lucro_apos_cmp: 80, cmp_count: 1,
      })
    }
    if (pathname.endsWith('/orders/')) return json(route, { count: 1, results: [shopeeOrder] })
    return json(route, {})
  })
  await page.route('http://127.0.0.1:8001/tiktokshop/**', route => {
    const pathname = new URL(route.request().url()).pathname
    if (pathname.endsWith('/accounts/')) return json(route, [{ id: 'tt-test', shop_name: 'Loja TikTok' }])
    if (pathname.endsWith('/today_stats/')) return json(route, { count: 1, count_paid: 1, count_cancelled: 0, faturamento: 180, gmv: 200 })
    if (pathname.endsWith('/orders/')) return json(route, { count: 1, results: [tiktokOrder] })
    return json(route, {})
  })
}

async function authenticate(page) {
  await page.goto(`${BASE_URL}/login`)
  await page.evaluate(() => {
    localStorage.setItem('accessToken', 'mock-test-token')
    localStorage.setItem('currentUser', JSON.stringify({ id: 1, username: 'test', is_staff: false }))
  })
  await page.reload()
}

test.describe('Finanças no mobile', () => {
  test('dashboard mantém Pós-Ads visível e expande Ads/TACoS', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await mockBackend(page)
    await authenticate(page)
    await page.goto(`${BASE_URL}/app/dashboard`)

    await expect(page.getByText('Detalhamento Diário')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.daily-table .mobile-only-label')).toBeVisible()
    await expect(page.locator('.daily-table .dt-row .col-ll')).toContainText('R$')

    await page.locator('.daily-table .dt-row').first().click()
    await expect(page.locator('.dt-mobile-detail-row')).toBeVisible()
    await expect(page.locator('.dt-mobile-detail-row')).toContainText('Ads')
    await expect(page.locator('.dt-mobile-detail-row')).toContainText('TACoS')
  })

  test('dashboard desktop mantém as colunas financeiras completas', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await mockBackend(page)
    await authenticate(page)
    await page.goto(`${BASE_URL}/app/dashboard`)

    await expect(page.getByText('Detalhamento Diário')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.daily-table .desktop-only-label')).toBeVisible()
    await expect(page.locator('.daily-table thead .col-ads').first()).toBeVisible()
    await expect(page.locator('.daily-table thead .col-ll')).toBeVisible()
  })

  test('tabela de pedidos exibe lucro após CMV no resumo mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await mockBackend(page)
    await authenticate(page)
    await page.goto(`${BASE_URL}/app/orders`)

    await expect(page.locator('.orders-table')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.mobile-financial-summary')).toContainText('Após CMV')
    await expect(page.locator('.mobile-financial-summary')).toContainText('R$ 80,00')
  })

  test('Shopee e TikTok Shop mantêm o resumo financeiro no mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await mockBackend(page)
    await authenticate(page)

    await page.goto(`${BASE_URL}/app/shopee/orders`)
    await expect(page.locator('.shopee-table')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.mobile-financial-summary')).toContainText('R$ 80,00')

    await page.goto(`${BASE_URL}/app/tiktokshop/orders`)
    await expect(page.locator('.tiktok-table')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.mobile-financial-summary')).toContainText('R$ 80,00')
  })
})
