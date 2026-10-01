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

    await expect(page.locator('#hero-title')).toContainText('Escalar de verdade')
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

  test('cinco chamadas de WhatsApp com data-offer', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/')

    const waLinks = page.locator('a[href*="wa.me/5511998180409"][data-offer]')
    await expect(waLinks).toHaveCount(5)
    await expect(page.locator('a[data-offer="mentoria"]')).toHaveCount(3)
    await expect(page.locator('a[data-offer="consultoria"]')).toHaveCount(2)
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
})
