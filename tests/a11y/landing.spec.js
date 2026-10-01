const { test, expect } = require('playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const BASE_URL = process.env.BASE_URL || 'http://localhost:9000';

// IDV-13: acessibilidade da landing pública da Krivus (rota "/"), no padrão
// de tests/a11y/dashboard.spec.js — zero violações critical/serious WCAG 2.x A/AA.
test.describe('Landing Krivus — Acessibilidade (IDV-13)', () => {

  test('landing pública não deve ter violações críticas', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForTimeout(2000);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    if (results.violations.length > 0) {
      console.log('Violações encontradas:', JSON.stringify(results.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length,
      })), null, 2));
    }

    expect(results.violations.filter(v => v.impact === 'critical').length).toBe(0);
    expect(results.violations.filter(v => v.impact === 'serious').length).toBe(0);
  });
});
