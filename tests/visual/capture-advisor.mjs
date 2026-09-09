/**
 * Harness de captura visual da página /app/promotions/advisor (PROMO-IA-15).
 *
 * Renderiza a página REAL (frontend dev em :9000 + backend dev em :8001) usando um
 * JWT local mintado por `manage.py shell` (ver README de auditoria), sem gravar
 * credenciais, cookies ou dados sensíveis nos artefatos.
 *
 * Uso:
 *   node tests/visual/capture-advisor.mjs \
 *     --token-file /tmp/dsh_token.txt \
 *     --out /caminho/docs/audits/<auditoria>/before \
 *     --label before
 *
 * Saídas: <out>/desktop-*.png, <out>/mobile-*.png e <out>/states/*.png.
 * Estados (vazio, carregando, erro, sem conta) usam interceptação de rota com
 * payloads representativos — nunca dado real alterado.
 */
import { chromium } from 'playwright'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const argv = process.argv.slice(2)
const arg = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : fallback
}

const BASE_URL = arg('base-url', 'http://127.0.0.1:9000')
const ROUTE = arg('route', '/app/promotions/advisor')
const OUT = arg('out', join(process.cwd(), 'tests/visual/out'))
const LABEL = arg('label', 'shot')
const TOKEN_FILE = arg('token-file')
const ONLY = arg('only') // desktop | mobile | states

if (!TOKEN_FILE) {
  console.error('Faltou --token-file (arquivo com o access token, fora do repositório).')
  process.exit(2)
}

const token = (await readFile(TOKEN_FILE, 'utf8')).trim()
if (!token) {
  console.error('Token vazio.')
  process.exit(2)
}

const VIEWPORTS = {
  tall: { width: 1440, height: 2200, deviceScaleFactor: 2, isMobile: false, hasTouch: false },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 2, isMobile: false, hasTouch: false },
  mobile: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
}

const dir = (name) => join(OUT, name)
await mkdir(dir(''), { recursive: true })
await mkdir(dir('states'), { recursive: true })

// Permite reusar o Chromium já instalado na máquina quando a revisão do
// Playwright não bate com o build em cache (sem baixar browser de novo).
const browser = await chromium.launch(
  process.env.PROMO_CHROME_PATH ? { executablePath: process.env.PROMO_CHROME_PATH } : {},
)

async function newPage(viewportName) {
  const context = await browser.newContext({
    viewport: { width: VIEWPORTS[viewportName].width, height: VIEWPORTS[viewportName].height },
    deviceScaleFactor: VIEWPORTS[viewportName].deviceScaleFactor,
    isMobile: VIEWPORTS[viewportName].isMobile,
    hasTouch: VIEWPORTS[viewportName].hasTouch,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    // NUNCA adicionar header customizado aqui: o preflight do CORS só permite
    // authorization/content-type/x-csrftoken/... e um header extra derruba a
    // chamada com "Network Error" (foi o que invalidou a 1ª rodada de capturas).
  })
  await context.addInitScript(([access, refresh]) => {
    localStorage.setItem('accessToken', access)
    localStorage.setItem('refreshToken', refresh)
    localStorage.setItem('currentUser', JSON.stringify({ id: 1, email: 'dono@local', is_staff: true }))
  }, [token, token])
  return context
}

async function waitForAdvisor(page, { requireRows = true } = {}) {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForResponse(
    (r) => r.url().includes('/mercadolivre/promo-overview/') && r.status() === 200,
    { timeout: 45_000 },
  ).catch(() => {})
  // Tabela com linhas OU estado vazio/erro renderizado.
  await page.waitForFunction(() => {
    const rows = document.querySelectorAll('table tbody tr')
    const empty = document.querySelector('.sb-empty, .q-banner, [role="alert"]')
    const loading = document.querySelector('.q-loading, .q-spinner')
    return (rows.length > 0 || (empty && !loading)) && !document.querySelector('.q-loading-bar')
  }, { timeout: 45_000 }).catch(() => {})
  await page.waitForTimeout(1200) // deixa imagens/badges assentarem

  // Guarda contra a regressão que invalidou a 1ª rodada: capturar sem dados
  // reais (falha de rede/CORS) produz uma "tela de erro" que parece hierarquia.
  if (requireRows) {
    const state = await page.evaluate(() => ({
      rows: document.querySelectorAll('table tbody tr').length,
      error: document.querySelector('.sb-empty')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 120) || '',
      result: document.querySelector('.pv-result')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 120) || '',
    }))
    if (!state.rows || /erro|não foi possível|network/i.test(state.error)) {
      throw new Error(
        `Página sem dados reais (rows=${state.rows}, erro="${state.error}", resultado="${state.result}"). ` +
        'Verifique backend/frontend e o token antes de auditar.',
      )
    }
  }
}

async function shot(page, name, { full = false } = {}) {
  const file = join(OUT, `${name}.png`)
  await page.screenshot({ path: file, fullPage: full })
  // Dump do texto visível: torna auditável o que a LLM de visão realmente viu.
  const text = await page.evaluate(() => (document.body.innerText || '').replace(/\n{3,}/g, '\n\n'))
  await writeFile(join(OUT, `${name}.txt`), text)
  console.log('shot', file)
  return file
}

const captured = []

/**
 * Abre a página até conseguir dados reais. O 1º load após subir o Vite pode
 * recarregar a página sozinho (otimização de dependências) e abortar o GET,
 * deixando a tela em "Network Error" — foi o que invalidou a 1ª rodada.
 */
async function openAdvisorWithData(page, { attempts = 3 } = {}) {
  let last = null
  for (let i = 1; i <= attempts; i += 1) {
    try {
      await page.goto(`${BASE_URL}${ROUTE}`, { waitUntil: 'domcontentloaded' })
      await waitForAdvisor(page)
      return
    } catch (err) {
      last = err
      console.log(`tentativa ${i}/${attempts} sem dados: ${err.message.slice(0, 150)}`)
      await page.waitForTimeout(2500)
    }
  }
  throw last
}

async function warmup() {
  const context = await newPage('desktop')
  const page = await context.newPage()
  await page.goto(`${BASE_URL}${ROUTE}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(6000)
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.waitForTimeout(3000)
  await context.close()
}

async function captureMain(viewportName) {
  const context = await newPage(viewportName)
  const page = await context.newPage()
  await openAdvisorWithData(page)
  captured.push(await shot(page, `${viewportName}-${LABEL}-fold`))
  captured.push(await shot(page, `${viewportName}-${LABEL}-full`, { full: true }))

  // Preset "Assistente" (botão de colunas) — o que o dono vê ao escolher a visão enxuta.
  const preset = page.getByRole('button', { name: 'Assistente' }).first()
  if (await preset.count()) {
    await preset.click().catch(() => {})
    await page.waitForTimeout(900)
    captured.push(await shot(page, `${viewportName}-${LABEL}-preset-assistente`, { full: true }))
  }
  await context.close()
}

async function captureStates() {
  const context = await newPage('desktop')
  const page = await context.newPage()

  // 1) Carregando: segura a resposta por 6s.
  await page.route('**/mercadolivre/promo-overview/**', async (route) => {
    await new Promise((r) => setTimeout(r, 6000))
    await route.continue()
  })
  await page.goto(`${BASE_URL}${ROUTE}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  captured.push(await shot(page, 'states/desktop-loading'))
  await page.unroute('**/mercadolivre/promo-overview/**')
  await context.close()

  // 2) Vazio: resposta 200 sem linhas.
  const emptyCtx = await newPage('desktop')
  const emptyPage = await emptyCtx.newPage()
  await emptyPage.route('**/mercadolivre/promo-overview/**', (route) =>
    route.fulfill({
      json: {
        success: true,
        results: [],
        page: 1,
        page_size: 40,
        total: 0,
        accounts: [{ account_id: 'ACC-1', account_nickname: 'Conta demonstração' }],
        summary: { ads: 0, with_active_promo: 0, below_floor: 0, assistente: 0, agent_history: 0 },
        snapshot: { computed_at: null, stale: false, empty: true },
      },
    }))
  await emptyPage.goto(`${BASE_URL}${ROUTE}`, { waitUntil: 'domcontentloaded' })
  await emptyPage.waitForTimeout(3000)
  captured.push(await shot(emptyPage, 'states/desktop-empty', { full: true }))
  await emptyCtx.close()

  // 3) Erro: 500 do backend.
  const errCtx = await newPage('desktop')
  const errPage = await errCtx.newPage()
  await errPage.route('**/mercadolivre/promo-overview/**', (route) =>
    route.fulfill({ status: 500, json: { detail: 'Falha temporária ao ler o snapshot.' } }))
  await errPage.goto(`${BASE_URL}${ROUTE}`, { waitUntil: 'domcontentloaded' })
  await errPage.waitForTimeout(3000)
  captured.push(await shot(errPage, 'states/desktop-error', { full: true }))
  await errCtx.close()

  // 4) Mobile estreito: estados de primeira classe no celular.
  const mCtx = await newPage('mobile')
  const mPage = await mCtx.newPage()
  await mPage.route('**/mercadolivre/promo-overview/**', (route) =>
    route.fulfill({
      json: {
        success: true, results: [], page: 1, page_size: 40, total: 0,
        accounts: [{ account_id: 'ACC-1', account_nickname: 'Conta demonstração' }],
        summary: { ads: 0, with_active_promo: 0, below_floor: 0, assistente: 0, agent_history: 0 },
        snapshot: { computed_at: null, stale: false, empty: true },
      },
    }))
  await mPage.goto(`${BASE_URL}${ROUTE}`, { waitUntil: 'domcontentloaded' })
  await mPage.waitForTimeout(3000)
  captured.push(await shot(mPage, 'states/mobile-empty', { full: true }))
  await mCtx.close()
}

async function captureDesktopExtras() {
  // 1) Viewport alto: revela o miolo da página (o scroll real é do .q-page-container).
  const context = await newPage('tall')
  const page = await context.newPage()
  await openAdvisorWithData(page)
  captured.push(await shot(page, `desktop-${LABEL}-tall`))

  // 2) Tabela rolada até o fim: prova visual do excesso de colunas.
  await page.evaluate(() => {
    const scroller = Array.from(document.querySelectorAll('*')).find(
      (el) => el.scrollWidth > el.clientWidth + 40 && el.clientWidth > 600,
    )
    if (scroller) scroller.scrollLeft = scroller.scrollWidth
  })
  await page.waitForTimeout(900)
  captured.push(await shot(page, `desktop-${LABEL}-table-right`))
  await context.close()

  // 3) Detalhe em diálogo (consulta o ML ao vivo; tolerante a falha).
  const dCtx = await newPage('desktop')
  const dPage = await dCtx.newPage()
  await openAdvisorWithData(dPage)
  const expand = dPage.locator('table tbody tr button').first()
  if (await expand.count()) {
    await expand.click().catch(() => {})
    await dPage.waitForTimeout(5000)
    captured.push(await shot(dPage, `desktop-${LABEL}-detail`))
  }
  await dCtx.close()

  // 4) Insights abertos (segunda área que compete por atenção).
  const iCtx = await newPage('tall')
  const iPage = await iCtx.newPage()
  await openAdvisorWithData(iPage)
  const insights = iPage.getByText('Insights do assistente').first()
  if (await insights.count()) {
    await insights.click().catch(() => {})
    await iPage.waitForTimeout(2500)
    captured.push(await shot(iPage, `desktop-${LABEL}-insights`))
  }
  await iCtx.close()
}

if (!ONLY || ONLY === 'desktop') await warmup()
if (!ONLY || ONLY === 'desktop') await captureMain('desktop')
if (!ONLY || ONLY === 'desktop') await captureDesktopExtras()
if (!ONLY || ONLY === 'mobile') await captureMain('mobile')
if (!ONLY || ONLY === 'states') await captureStates()

await browser.close()
await writeFile(join(OUT, `${LABEL}-manifest.json`), JSON.stringify({
  label: LABEL, baseUrl: BASE_URL, route: ROUTE, capturedAt: new Date().toISOString(), shots: captured,
}, null, 2))
console.log(`\n${captured.length} capturas em ${OUT}`)
