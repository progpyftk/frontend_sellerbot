const { expect, test } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const today = {
  success: true, day_window: { timezone: 'America/Sao_Paulo' },
  last_cycle: { status: 'partial', account_ref: 'ACC1', finished_at: '2026-09-28T12:08:00Z', items_processed: 1 },
  by_account: { ACC1: { account_nickname: 'Loja A', today: { alterados: 1, ja_no_alvo: 2, aguardando_aval: 0, bloqueados: 0, recusados: 0, nao_confirmados: 0 } } },
  failures: [], recuperacao: { anuncios_em_recuperacao: 1, cadeias_em_recuperacao: 1, itens: [
    { job_id: 1, item_id: 'MLB-PENDENTE', account_nickname: 'Loja A', status: 'queued', etapa: 'verify' },
  ] },
};
const catalog = {
  success: true, total: 1, results: [{ account_id: 'ACC1', account_nickname: 'Loja A', item_id: 'MLB-PENDENTE', title: 'Adubo', sku: 'A1', status: 'active', price: 100,
    buyer_price: 80, margin_pct: 31, profit_unit: 20, has_active_promo: true, active_promo: { promotion_name: 'Oferta', observed_at: '2026-09-28T12:00:00Z' },
    computed_at: '2026-09-28T12:00:00Z', next_step: { label: 'Recuperação em aberto', chain_count: 1 },
    last_result: { state: 'accepted_unverified', at: '2026-09-28T12:01:00Z' } }],
  summary: { ads: 8, with_active_promo: 3, scheduled_only: 1, without_active_or_scheduled_snapshot: 4 },
  snapshot: { stale: false, by_account: { ACC1: { account_nickname: 'Loja A', computed_at: '2026-09-28T12:00:00Z', stale: false } } },
  accounts: [{ account_id: 'ACC1', account_nickname: 'Loja A' }],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'e2e-token');
    localStorage.setItem('refreshToken', 'e2e-token');
    localStorage.setItem('currentUser', JSON.stringify({ id: 1, email: 'dono@local', is_staff: true }));
  });
  await page.route('**/users/me/', (route) => route.fulfill({ json: { id: 1, email: 'dono@local', is_staff: true } }));
  await page.route('**/mercadolivre/promo-overview/**', (route) => route.fulfill({ json: {
    success: true, item: { item_id: 'MLB-PENDENTE', title: 'Adubo', account_nickname: 'Loja A', status: 'active', price: 100 },
    promotions: { active: [], scheduled: [], candidates: [] }, agent_logs: [],
  } }));
  await page.route('**/mercadolivre/advisor/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/today/')) return route.fulfill({ json: today });
    if (path.endsWith('/catalog/')) return route.fulfill({ json: catalog });
    if (path.endsWith('/automation/')) return route.fulfill({ json: { ...today, write_mode_global: true, kill_switch: false } });
    return route.fulfill({ json: { success: true, results: [], total: 0, scope: { accounts: [{ account_id: 'ACC1', account_nickname: 'Loja A' }] } } });
  });
});

test('visão geral responde execução, cobertura e pendência em desktop e celular', async ({ page }) => {
  await page.goto('/app/promotions/advisor');
  await expect(page.getByRole('heading', { name: 'Promoções nos anúncios ativos' })).toBeVisible();
  await expect(page.getByText('Anúncios alterados e confirmados hoje')).toBeVisible();
  await expect(page.getByText('MLB-PENDENTE')).toBeVisible();
  await expect(page.getByText('Sem promoção ativa ou programada no retrato')).toBeVisible();
  await expect(page.locator('.feedback-fab-container')).toBeHidden();
  if (process.env.PROMO114_SCREENSHOT) await page.screenshot({ path: `/tmp/promo114-overview-${test.info().project.name}.png`, fullPage: true });
  const overflow = await page.evaluate(() => ({ width: window.innerWidth, scroll: document.documentElement.scrollWidth,
    elements: [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 8).map((el) => `${el.tagName}.${el.className}`) }));
  expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width + 1);
});

test('visão geral e catálogo não têm violações graves de acessibilidade', async ({ page }) => {
  test.skip(test.info().project.name.includes('mobile'));
  for (const path of ['/app/promotions/advisor', '/app/promotions/advisor/anuncios']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Assistente de promoções' })).toBeVisible();
    const scan = await new AxeBuilder({ page }).include('.adv-shell').analyze();
    const issues = scan.violations.filter((entry) => ['serious', 'critical'].includes(entry.impact))
      .flatMap((entry) => entry.nodes.map((node) => ({ id: entry.id, target: node.target,
        data: node.any.map((check) => check.data) })));
    expect(issues, path).toEqual([]);
  }
});

test('catálogo distingue retrato, atuação e próximo passo', async ({ page }) => {
  await page.goto('/app/promotions/advisor/anuncios');
  if (!test.info().project.name.includes('mobile')) await expect(page.getByRole('columnheader', { name: 'Próximo passo' })).toBeVisible();
  const list = test.info().project.name.includes('mobile') ? page.locator('.adv-table__cards') : page.locator('.adv-table__table');
  await expect(list.getByText('Recuperação em aberto').first()).toBeVisible();
  await expect(list.getByText('Ativa no retrato: Oferta').first()).toBeVisible();
  if (!test.info().project.name.includes('mobile')) {
    const tableFits = await page.locator('.adv-table__wrap').evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
    expect(tableFits).toBe(true);
  }
  if (process.env.PROMO114_SCREENSHOT) await page.screenshot({ path: `/tmp/promo114-catalog-${test.info().project.name}.png`, fullPage: true });
});

test('link antigo abre o anúncio com foco e Escape fecha', async ({ page }) => {
  await page.goto('/app/promotions/advisor?item=MLB-PENDENTE');
  await expect(page).toHaveURL(/advisor\/anuncios\?item=MLB-PENDENTE/);
  const drawer = page.getByRole('dialog', { name: 'MLB-PENDENTE' });
  await expect(drawer).toBeVisible();
  await expect(drawer).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
});

test('limite por conta só é gravado após Salvar alterações', async ({ page }) => {
  test.skip(test.info().project.name.includes('mobile'));
  const writes = [];
  const automation = { ...today, write_mode_global: true, kill_switch: false,
    by_account: { ACC1: { account_nickname: 'Loja A', auto_write: true, wave_size: 10, paused: false,
      canary_pending: false, margin_alerts: [], today: { aguardando_aval: 0 }, regua_overrides: [],
      regua: { margin_pct: 30, profit_brl: 13, target_parado_pct: 30, target_medio_pct: 40 } } } };
  await page.route('**/mercadolivre/advisor/automation/', (route) => {
    if (route.request().method() === 'PATCH') { writes.push(route.request().postDataJSON()); return route.fulfill({ json: { success: true } }); }
    return route.fulfill({ json: automation });
  });
  await page.goto('/app/promotions/advisor/automacao');
  await page.getByText('Limites desta conta').first().click();
  const margin = page.getByLabel('Margem mínima', { exact: true });
  await margin.fill('35');
  await margin.blur();
  expect(writes).toHaveLength(0);
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  expect(writes).toEqual([{ account_id: 'ACC1', floor_margin_pct: 35 }]);
});
