import { expect, test } from '@playwright/test'

/** Página real com API simulada; comprova tabela, filtros e erros sem dados de cliente. */
test('histórico mantém tabela e envia filtros ao servidor', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'mobile') await page.setViewportSize({ width: 390, height: 844 })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'history-test-token')
    localStorage.setItem('currentUser', JSON.stringify({ id: 1, username: 'teste', is_staff: true }))
  })
  const stamp = '2026-10-18T15:00:00Z'
  const entry = value => ({ value, observed_at: stamp, source: 'sync' })
  const base = { base_price: entry('100.00'), promotion_price: entry('80.00'),
    promotions: entry([{ id: 'P1', name: 'Oferta Primavera', price: '80.00' }, { id: 'P2', name: 'Oferta da loja', price: '85.00' }]),
    status: entry('active'), logistics: entry({ logistic_type: 'cross_docking', is_flex: false }) }
  const common = { account_id: 1, account_name: 'Conta demonstração', title: 'Substrato para orquídeas',
    item_id: 'MLB123456', permalink: 'https://produto.mercadolivre.com.br/MLB-123456', detected_at: stamp,
    before: base, occurred_at: null }
  const events = [
    { ...common, id: 2, after: { ...base, base_price: entry('110.00') }, changed_fields: ['base_price'] },
    { ...common, id: 1, after: { ...base, logistics: entry({ logistic_type: 'fulfillment', is_full: true }) }, changed_fields: ['logistics'] },
  ]
  const requests = []
  let fail = false
  await page.route('http://127.0.0.1:8001/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/item-changes/')) {
      requests.push(Object.fromEntries(url.searchParams))
      if (fail) return route.fulfill({ status: 500, json: { detail: 'Falha de teste' } })
      const fields = url.searchParams.get('changed_fields')?.split(',') || []
      const results = fields.length ? events.filter(e => e.changed_fields.some(f => fields.includes(f))) : events
      return route.fulfill({ json: { results, count: results.length, next: null, previous: null,
        coverage: { accounts: [{ account_id: 1, account_name: 'Conta demonstração', observed_items: 1,
          first_observed_at: stamp, fields: { base_price: { last_observed_at: stamp } } }] } } })
    }
    if (url.pathname.includes('/mercadolivre/accounts/')) return route.fulfill({ json: [{ id: 1, account_nickname: 'Conta demonstração' }] })
    return route.fulfill({ json: {} })
  })
  await page.goto('/app/items/historico?date_from=2026-10-18&date_to=2026-10-18')
  await expect(page.getByRole('heading', { name: 'Histórico de alterações' })).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await expect(page.getByText('R$ 110,00', { exact: true })).toBeVisible()
  await expect(page.locator('table')).toHaveCount(1)
  await page.screenshot({ path: `/tmp/hist-ml-${testInfo.project.name}.png`, fullPage: true })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  expect(overflow).toBe(false)
  await page.getByRole('button', { name: 'Ontem', exact: true }).click()
  await expect.poll(() => requests.at(-1)?.date_from === requests.at(-1)?.date_to).toBe(true)
  await page.getByLabel('O que mudou', { exact: true }).click()
  await page.getByRole('option', { name: 'Logística', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect.poll(() => requests.at(-1)?.changed_fields).toBe('logistics')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await page.getByRole('button', { name: 'Limpar', exact: true }).click()
  await expect(page.locator('tbody tr')).toHaveCount(2)
  fail = true
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Falha de teste' })).toBeVisible()
  await expect(page.locator('table')).toHaveCount(0)
  expect(errors).toEqual([])
})
