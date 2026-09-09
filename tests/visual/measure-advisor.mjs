/**
 * Métricas objetivas da página /app/promotions/advisor (PROMO-IA-15).
 *
 * Complementa a revisão por LLM de visão com números que a imagem não prova:
 * densidade (linhas/colunas/chips), cores e badges em uso, contraste de texto,
 * hierarquia (o que está acima da dobra) e acessibilidade (foco, aria, alvos).
 *
 * Uso: node tests/visual/measure-advisor.mjs --token-file /tmp/t.txt --out /caminho/metrics.json
 */
import { chromium } from 'playwright'
import { readFile, writeFile } from 'node:fs/promises'

const argv = process.argv.slice(2)
const arg = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : fallback
}

const BASE_URL = arg('base-url', 'http://127.0.0.1:9000')
const ROUTE = arg('route', '/app/promotions/advisor')
const OUT = arg('out', 'metrics.json')
const token = (await readFile(arg('token-file'), 'utf8')).trim()

const browser = await chromium.launch(
  process.env.PROMO_CHROME_PATH ? { executablePath: process.env.PROMO_CHROME_PATH } : {},
)
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' })
await context.addInitScript(([access]) => {
  localStorage.setItem('accessToken', access)
  localStorage.setItem('refreshToken', access)
  localStorage.setItem('currentUser', JSON.stringify({ id: 1, email: 'dono@local', is_staff: true }))
}, [token])
const page = await context.newPage()
await page.goto(`${BASE_URL}${ROUTE}`, { waitUntil: 'domcontentloaded' })
await page.waitForResponse((r) => r.url().includes('/mercadolivre/promo-overview/') && r.status() === 200, { timeout: 45_000 }).catch(() => {})
await page.waitForTimeout(2500)

const metrics = await page.evaluate(() => {
  const q = (sel) => Array.from(document.querySelectorAll(sel))
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom > 0
  }
  const text = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim()

  const parseRgb = (value) => {
    const m = value.match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const [r, g, b] = m[1].split(',').map((n) => parseFloat(n))
    return { r, g, b }
  }
  const lum = ({ r, g, b }) => {
    const f = (c) => {
      const s = c / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const contrast = (fg, bg) => {
    const a = parseRgb(fg)
    const b = parseRgb(bg)
    if (!a || !b) return null
    const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x)
    return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100
  }
  const bgOf = (el) => {
    let node = el
    while (node && node !== document.documentElement) {
      const bg = getComputedStyle(node).backgroundColor
      if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) return bg
      node = node.parentElement
    }
    return getComputedStyle(document.body).backgroundColor
  }

  const rows = q('table tbody tr')
  const headers = q('table thead tr th').map(text).filter(Boolean)
  const filterInputs = q('table thead tr th input, table thead tr th .q-select, table thead tr th .q-field')
  const badges = q('.q-badge, [class*="sb-badge"], .sb-badge')
  const badgeVariants = {}
  for (const b of badges) {
    const key = (b.className || '').split(' ').filter((c) => c.includes('badge') || c.includes('--')).join(' ') || 'plain'
    badgeVariants[key] = (badgeVariants[key] || 0) + 1
  }
  const colorSet = new Set()
  for (const el of q('*')) {
    const cs = getComputedStyle(el)
    if (visible(el)) {
      colorSet.add(cs.color)
      const bg = cs.backgroundColor
      if (bg && !/rgba\(0, 0, 0, 0\)/.test(bg)) colorSet.add(bg)
    }
  }
  const interactive = q('button, a, input, select, [role="button"]')
  const smallTargets = interactive.filter((el) => {
    const r = el.getBoundingClientRect()
    return r.width > 0 && (r.width < 24 || r.height < 24)
  }).length
  const textSamples = q('p, span, td, th, h1, h2, h3, .q-chip, .q-btn')
    .filter((el) => visible(el) && text(el).length > 1)
    .slice(0, 400)
    .map((el) => {
      const cs = getComputedStyle(el)
      return {
        text: text(el).slice(0, 60),
        fontSize: parseFloat(cs.fontSize),
        fontWeight: cs.fontWeight,
        color: cs.color,
        bg: bgOf(el),
        contrast: contrast(cs.color, bgOf(el)),
      }
    })
  const lowContrast = textSamples
    .filter((t) => t.contrast !== null && t.contrast < 4.5 && t.fontSize < 18.66)
    .slice(0, 12)
  const table = document.querySelector('table')
  const tableBox = table ? table.getBoundingClientRect() : null
  const scrollParents = []
  for (const el of q('*')) {
    const cs = getComputedStyle(el)
    if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll' || cs.overflowY === 'auto' || cs.overflowY === 'scroll')
        && el.scrollHeight > el.clientHeight + 4) {
      scrollParents.push({ cls: (el.className || '').toString().slice(0, 80), h: el.clientHeight, scrollH: el.scrollHeight })
    }
  }

  return {
    title: document.title,
    docScrollHeight: document.documentElement.scrollHeight,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    bodyOverflowY: getComputedStyle(document.body).overflowY,
    counts: {
      rows: rows.length,
      headers: headers.length,
      headerLabels: headers,
      filterControlsInHeader: filterInputs.length,
      badges: badges.length,
      badgeVariants,
      buttons: q('button').length,
      chips: q('.q-chip').length,
      selects: q('.q-select').length,
      inputs: q('input').length,
      interactive: interactive.length,
      smallTargets,
      distinctColorsVisible: colorSet.size,
      lowContrastSamples: lowContrast.length,
    },
    table: tableBox ? { top: Math.round(tableBox.top), width: Math.round(tableBox.width) } : null,
    scrollParents,
    aboveFold: q('h1, h2, h3, p, .pv-scope__kpi, .adb-card__title, .q-btn, th').filter(visible).map(text).filter(Boolean).slice(0, 40),
    fold: (() => {
      const box = (sel) => {
        const el = document.querySelector(sel)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }
      }
      const firstRow = document.querySelector('table tbody tr')
      const fr = firstRow ? firstRow.getBoundingClientRect() : null
      return {
        viewportH: window.innerHeight,
        pageHeader: box('.sb-page-header'),
        decisionBand: box('.adb'),
        scope: box('.pv-scope'),
        toolbar: box('.pv-toolbar'),
        table: box('table'),
        firstRowTop: fr ? Math.round(fr.top) : null,
        firstRowVisible: fr ? fr.top < window.innerHeight : false,
      }
    })(),
    scopeChips: q('.pv-scope__kpi').map(text),
    decisionCards: q('.adb-card').map((c) => ({ title: text(c.querySelector('.adb-card__title')), value: text(c.querySelector('.adb-card__value')) })),
    lowContrastSamples: lowContrast,
    colorsVisible: Array.from(colorSet).slice(0, 40),
  }
})

await writeFile(OUT, JSON.stringify(metrics, null, 2))
console.log(JSON.stringify(metrics, null, 2).slice(0, 4000))
await browser.close()
