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

    await expect(page.locator('#hero-title')).toContainText('Sua empresa')
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
      'Krivus — Consultoria empresarial, marketing e e-commerce',
    )
    const robots = await page.locator('meta[name="robots"]').getAttribute('content')
    expect(robots).toBe('noindex,nofollow')
    // o index.html traz um <meta name="description"> estático do template; o
    // useMeta da landing injeta o seu com data-qmeta — é esse que se confere
    const description = await page
      .locator('meta[name="description"][data-qmeta]')
      .getAttribute('content')
    expect(description).toContain('Consultoria empresarial, identidade visual, sites')
  })

  test('"Entrar no SellerBot" leva ao login (anônimo)', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/')

    await page.locator('.header-contact').click()

    await expect(page).toHaveURL(/\/login$/)
  })

  test('âncora "Tecnologia e IA" rola até a seção e registra o hash', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/')

    await page.locator('header nav a[href="#tecnologia"]').click()

    await expect(page).toHaveURL(/#tecnologia$/)
    // scroll suave: aguarda assentar em vez de medir no primeiro frame
    await expect
      .poll(async () => (await page.locator('#tecnologia').boundingBox())?.y ?? 9999, {
        timeout: 5000,
      })
      .toBeLessThan(200)
  })

  test('links diretos para consultoria e análise funcionam em reload', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    for (const id of ['consultoria', 'analise-precos']) {
      await page.goto(`/#${id}`)
      await page.reload()
      await expect(page.locator(`#${id}`)).toBeVisible()
      await expect
        .poll(async () => (await page.locator(`#${id}`).boundingBox())?.y ?? 9999, {
          timeout: 5000,
        })
        .toBeLessThan(200)
    }
  })

  test('contatos por serviço levam ao WhatsApp com a mensagem correspondente', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/')

    const waLinks = page.locator('a[href*="wa.me/5511998180409"][data-offer]')
    await expect(waLinks).toHaveCount(10)
    for (const [offer, message] of Object.entries({ marketing: 'marketing', tecnologia: 'automação de processos', consultoria: 'consultoria empresarial', operacao: 'operação', projeto: 'projeto', gestao: 'gestão contínua', mentoria: 'mentoria', tributario: 'tributário' })) {
      const href = await page.locator(`a[data-offer="${offer}"]`).getAttribute('href')
      expect(new URL(href).searchParams.get('text')).toContain(message)
    }
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
  test('três frentes, tecnologia e ferramentas de e-commerce acessíveis', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('input[type="range"]')).toHaveCount(0);
    await expect(page.locator('.ecommerce-dashboard img')).toHaveAttribute('src', '/images/sellerbot/dashboard.webp');
    for (const id of ['consultoria', 'marketing', 'ecommerce', 'tecnologia']) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
    await page.locator('a[href="#analises"]').click();
    await expect(page.locator('#analises')).toHaveAttribute('open', '');
    for (const id of ['analise-ads', 'analise-promocoes', 'analise-precos', 'analise-anuncios']) {
      const section = page.locator(`#${id}`);
      await expect(section.getByRole('heading', { level: 2 })).toBeVisible();
      await section.locator('img').scrollIntoViewIfNeeded();
      await expect.poll(() => section.locator('img').evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
    }
    await expect(page.locator('#tributario a[data-offer="tributario"]')).toHaveAttribute('href', /wa\.me/);
    for (const id of ['case-doseverde', 'case-livpro', 'case-casadossuportes', 'case-grampofix']) {
      const story = page.locator(`#${id}`);
      await expect(story.getByRole('heading', { level: 3 })).toBeVisible();
      await expect(story.locator('.story-work')).toContainText('NO TRABALHO');
    }
  });

  test('histórias têm âncoras e capturas ampliam com retorno de foco', async ({ page }) => {
    await page.goto('/');
    await page.locator('.case-links a[href="#case-doseverde"]').click();
    await expect(page.locator('#case-doseverde')).toBeFocused();
    const open = page.getByRole('button', { name: 'Ampliar Dashboard da operação', exact: true });
    await open.scrollIntoViewIfNeeded();
    await expect.poll(() => open.locator('img').evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
    await open.click();
    const close = page.getByRole('button', { name: 'Fechar imagem ampliada' });
    await expect(close).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(open).toBeFocused();
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
