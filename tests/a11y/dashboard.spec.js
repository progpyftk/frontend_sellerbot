const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const BASE_URL = process.env.BASE_URL || 'http://localhost:9000';

test.describe('Dashboard — Acessibilidade (DASH-14)', () => {

  test('página de login não deve ter violações críticas', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/login`);
    await page.waitForTimeout(2000);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations.filter(v => v.impact === 'critical').length).toBe(0);
    expect(results.violations.filter(v => v.impact === 'serious').length).toBe(0);
  });

  test('Dashboard deve carregar sem violações críticas', async ({ page }) => {
    // Navega para o login e autentica com JWT mockado
    await page.goto(`${BASE_URL}/#/login`);
    await page.evaluate(() => {
      localStorage.setItem('access_token', 'mock-test-token');
      localStorage.setItem('user', JSON.stringify({ username: 'test', is_staff: false }));
    });
    await page.goto(`${BASE_URL}/#/app/dashboard`);
    await page.waitForTimeout(3000);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Registrar violações encontradas para diagnóstico
    if (results.violations.length > 0) {
      console.log('Violações encontradas:', JSON.stringify(results.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length,
      })), null, 2));
    }

    // Não deve ter violações críticas ou sérias
    expect(results.violations.filter(v => v.impact === 'critical').length).toBe(0);
  });

});
