import { expect, test } from '@playwright/test'

// IDV-13: landing pública da Krivus na rota "/".
// Requer dev server rodando (baseURL do playwright.config.js, padrão
// http://127.0.0.1:9000) SEM backend — a landing não pode chamar API.

/** Limpa sessão e instala um accessToken falso (token expirado/inválido). */
async function seedExpiredToken(page) {
  await page.addInitScript(() => {
    localStorage.clear()
    localStorage.setItem('accessToken', 'token-falso-expirado')
  })
}

/** Instala sessão logada mockada (token + currentUser com id). */
async function seedLoggedUser(page) {
  await page.addInitScript(() => {
    localStorage.clear()
    localStorage.setItem('accessToken', 'mock-test-token')
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ id: 1, username: 'test', is_staff: false }),
    )
  })
}

test.describe('Landing pública Krivus (IDV-13)', () => {
  test('visitante anônimo vê a landing sem hidratar sessão', async ({ page }) => {
    const userRequests = []
    page.on('request', (req) => {
      if (req.url().includes('/users/me')) userRequests.push(req.url())
    })
    await page.addInitScript(() => localStorage.clear())

    await page.goto('/')

    await expect(page.locator('#hero-title')).toContainText('IA na operação')
    expect(new URL(page.url()).pathname).toBe('/')
    expect(userRequests).toEqual([])
  })

  test('token expirado não sequestra o visitante para o login', async ({ page }) => {
    const userRequests = []
    page.on('request', (req) => {
      if (req.url().includes('/users/me')) userRequests.push(req.url())
    })
    await seedExpiredToken(page)

    await page.goto('/')

    await expect(page.locator('#hero-title')).toBeVisible()
    expect(new URL(page.url()).pathname).toBe('/')
    expect(userRequests).toEqual([])
  })

  test('metadata: título, description e robots noindex,nofollow', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/')

    await expect(page).toHaveTitle(
      'Krivus — Mentoria e consultoria para e-commerce e marketplaces',
    )
    const robots = await page.locator('meta[name="robots"]').getAttribute('content')
    expect(robots).toBe('noindex,nofollow')
    // o index.html traz um <meta name="description"> estático do template; o
    // useMeta da landing injeta o seu com data-qmeta — é esse que se confere
    const description = await page
      .locator('meta[name="description"][data-qmeta]')
      .getAttribute('content')
    expect(description).toContain('Mentoria e consultoria para empresas')
  })

  test('"Entrar no SellerBot" leva ao login (anônimo)', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/')

    await page.locator('.header-contact').click()

    await expect(page).toHaveURL(/\/login$/)
  })

  test('âncora "Mentoria" rola até a seção e registra o hash', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/')

    await page.locator('header nav a[href="#mentoria"]').click()

    await expect(page).toHaveURL(/#mentoria$/)
    // scroll suave: aguarda assentar em vez de medir no primeiro frame
    await expect
      .poll(async () => (await page.locator('#mentoria').boundingBox())?.y ?? 9999, {
        timeout: 5000,
      })
      .toBeLessThan(200)
  })

  test('deep-link /#consultoria funciona em reload', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/#consultoria')

    await expect
      .poll(async () => (await page.locator('#consultoria').boundingBox())?.y ?? 9999, {
        timeout: 5000,
      })
      .toBeLessThan(200)
  })

  test('quatro chamadas contextuais de WhatsApp com data-offer', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/')

    const waLinks = page.locator('a[href*="wa.me/5511998180409"][data-offer]')
    await expect(waLinks).toHaveCount(4)
    await expect(page.locator('a[data-offer="mentoria"]')).toHaveCount(1)
    await expect(page.locator('a[data-offer="consultoria"]')).toHaveCount(1)
  })

  test('usuário logado vê a landing e "Entrar" leva ao app', async ({ page }) => {
    await seedLoggedUser(page)
    await page.goto('/')

    await expect(page.locator('#hero-title')).toBeVisible()
    expect(new URL(page.url()).pathname).toBe('/')

    await page.locator('.header-contact').click()
    await expect(page).toHaveURL(/\/app/)
  })

  test('sair da landing restaura o título do template (revisão A2)', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/')
    await expect(page).toHaveTitle(/Krivus/)

    await page.locator('.header-contact').click()

    await expect(page).toHaveURL(/\/login$/)
    await expect(page).toHaveTitle('SellerBot Frontend')
  })

  test('regressão: anônimo em /app continua caindo no login', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/app/dashboard')

    await expect(page).toHaveURL(/\/login$/)
  })

  test('sem transbordamento horizontal', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/')

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
  test('calculadora relaciona custos, impostos e margem de contribuição', async ({ page }) => {
    await page.goto('/');
    const result = page.locator('.calculator-result');
    await expect(result).toContainText('R$ 5,00');
    await expect(result).toContainText('5,0%');
    await page.locator('#margin-tax').fill('10');
    await expect(result).toContainText('R$ 6,00');
    await expect(result).toContainText('6,0%');
    await page.locator('#margin-price').fill('200');
    await expect(result).toContainText('R$ 82,00');
    await expect(result).toContainText('41,0%');
    await page.locator('#margin-other').fill('100');
    await expect(result).toContainText('-R$ 18,00');
    await expect(result).toContainText('-9,0%');
    await expect(result).toContainText('superam o preço');
  });

  test('sliders mostram valores, respondem ao teclado e respeitam limites', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('input[type="range"]')).toHaveCount(7);
    const tax = page.locator('#margin-tax');
    await expect(tax).toHaveValue('11');
    await tax.focus();
    await page.keyboard.press('ArrowRight');
    await expect(tax).toHaveValue('11.5');
    await expect(page.locator('label[for="margin-tax"] output')).toHaveText('11,5%');
    await expect(page.locator('.calculator-result')).toContainText('R$ 4,50');
    await page.locator('#margin-price').focus();
    await page.keyboard.press('Home');
    await expect(page.locator('#margin-price')).toHaveValue('1');
    await expect(page.locator('.calculator-result')).not.toContainText('NaN');
    await page.keyboard.press('End');
    await expect(page.locator('#margin-price')).toHaveValue('1000');
    await expect(page.locator('.calculator-result')).not.toContainText('Infinity');
  });

  test('tributário conecta à calculadora e os quatro cases são apresentados', async ({ page }) => {
    await page.goto('/');
    await page.locator('#tributario a[href="#margin-tax"]').click();
    await expect(page.locator('#margin-tax')).toBeFocused();
    for (const name of ['Doseverde', 'Livpro', 'Casadossuportes', 'GrampoFix']) {
      await expect(page.locator('#cases')).toContainText(name);
    }
    await expect(page.locator('#tax-title')).toContainText('quem ganha');
  });

  test('ferramentas do SellerBot mudam ao selecionar e cases aparecem na abertura', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#inicio #cases')).toBeAttached();
    const selected = page.locator('#tool-detail');
    await expect(selected).toContainText('Campanhas com diagnóstico');
    const choices = [
      ['Promoções', 'Desconto com critério'],
      ['Precificação', 'O preço começa nos custos'],
      ['Criação de anúncios', 'Da ficha à publicação'],
    ];
    for (const [label, title] of choices) {
      const button = page.getByRole('group', { name: 'Explorar ferramentas do SellerBot' }).getByRole('button', { name: new RegExp(label) });
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(selected).toContainText(title);
    }
    await expect(page.getByText('A venda entrou.', { exact: false })).toHaveCount(0);
  });

  test('capturas do produto carregam e ampliam com retorno de foco', async ({ page }) => {
    await page.goto('/');
    const open = page.getByRole('button', { name: 'Ampliar Publicidade e evolução diária' });
    await open.scrollIntoViewIfNeeded();
    const image = open.locator('img');
    await expect.poll(() => image.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
    await open.click();
    await expect(page.getByRole('region', { name: 'Publicidade e evolução diária em tamanho ampliado' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(open).toBeFocused();
    for (const label of ['IA em Ads', 'Promoções', 'Precificação', 'Criação de anúncios']) {
      await page.getByRole('group', { name: 'Explorar ferramentas do SellerBot' }).getByRole('button', { name: new RegExp(label) }).click();
      const screenshot = page.locator('#tool-detail img');
      await screenshot.scrollIntoViewIfNeeded();
      await expect.poll(() => screenshot.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
    }
  });

  test('skip link transfere foco e reduced motion desativa animação', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    expect(await page.locator('.hero-copy').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  });

})
