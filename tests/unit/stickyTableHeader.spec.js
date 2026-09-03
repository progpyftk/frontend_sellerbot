import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Guarda de regressão do cabeçalho fixo das tabelas (DASH-20).
 *
 * Em 2026-09-02 o commit `6e89d73` trocou `top: 0` por `top: $app-header-h` (56px,
 * ou `56 + 65` quando havia barra de página) em TODO `position: sticky` que
 * "parecia estar no topo" — sem perguntar qual é o scrollport. O cabeçalho das
 * tabelas passou a parar 56px (ou 121px) abaixo do topo, cobrindo as primeiras
 * linhas. Corrigido nos DASH-17 (dashboard) e DASH-21 (tabelas QTable).
 *
 * A regra canônica está junto ao token, em `src/css/tokens.scss`:
 *
 *   1. scrollport = a própria página (nenhum ancestral com `overflow`)
 *      -> SOMA `$app-header-h`;
 *   2. wrapper com `max-height` + `overflow-y` (rola dentro dele)
 *      -> `top: 0`;
 *   3. scrollport `overflow: auto` de altura livre, que NUNCA rola
 *      (é o `.q-table__middle` do Quasar, que sempre recebe a classe `scroll`)
 *      -> `top: 0`. Aqui o cabeçalho não fica fixo de verdade: com o scrollport
 *      parado, qualquer `top:` vira empurrão permanente sobre as linhas.
 *
 * A lista de pares (arquivo, seletor) é explícita de propósito — nada de
 * parsear CSS genérico nem adivinhar scrollport. Quem criar um sticky novo fora
 * do scrollport da página deve adicioná-lo em `NAO_E_A_PAGINA`; quem criar um
 * sticky de página deve adicioná-lo em `E_A_PAGINA`.
 */

const PAGES_DIR = path.resolve(__dirname, '../../src/pages')

// Scrollport NÃO é a página -> `top` tem de ser `0`.
const NAO_E_A_PAGINA = [
  {
    file: 'DashboardPage.vue',
    selector: '.data-table th',
    why: 'rola dentro de .table-wrap (max-height: 480px + overflow-y)',
  },
  {
    file: 'DashboardPage.vue',
    selector: '.daily-table thead th',
    why: 'rola dentro de .daily-table-wrap (max-height: 520px + overflow-y)',
  },
  {
    file: 'ShopeeOrdersPage.vue',
    selector: ':deep(.shopee-table thead tr th)',
    why: 'thead sob .q-table__middle (overflow: auto, altura livre -> nunca rola)',
  },
  {
    file: 'ShopeeItemsPage.vue',
    selector: ':deep(.shopee-table thead tr th)',
    why: 'thead sob .q-table__middle (overflow: auto, altura livre -> nunca rola)',
  },
  {
    file: 'TikTokShopOrdersPage.vue',
    selector: ':deep(.tiktok-table thead tr th)',
    why: 'thead sob .q-table__middle (overflow: auto, altura livre -> nunca rola)',
  },
  {
    file: 'TikTokShopItemsPage.vue',
    selector: ':deep(.tiktok-table thead tr th)',
    why: 'thead sob .q-table__middle (overflow: auto, altura livre -> nunca rola)',
  },
]

// Espelho: sticky de página TEM de somar a altura do header do app. Sem esta
// lista, a "correção" natural de quem ler só o caso acima é zerar tudo de novo e
// jogar o header do app por cima do conteúdo (o ganho do PROMO-14b).
const E_A_PAGINA = [
  { file: 'ShopeeOrdersPage.vue', selector: '.page-header' },
  { file: 'TikTokShopOrdersPage.vue', selector: '.page-header' },
  { file: 'TikTokShopItemsPage.vue', selector: '.page-header' },
]

function escapeForRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Conteúdo dos blocos `<style>` do .vue, sem comentários (eles citam seletores). */
function styleOf(file) {
  const source = readFileSync(path.join(PAGES_DIR, file), 'utf8')
  const blocks = [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) =>
    match[1].replace(/\/\*[\s\S]*?\*\//g, ''),
  )
  return blocks.join('\n')
}

/** Corpo da regra do seletor, encontrado por casamento de chaves. */
function ruleBody(style, selector) {
  const match = new RegExp(`${escapeForRegExp(selector)}\\s*\\{`).exec(style)
  if (!match) return null

  const open = match.index + match[0].length - 1
  let depth = 0
  for (let i = open; i < style.length; i += 1) {
    if (style[i] === '{') depth += 1
    else if (style[i] === '}') {
      depth -= 1
      if (depth === 0) return style.slice(open + 1, i)
    }
  }
  return null
}

function declaration(body, property) {
  const found = body
    .split(';')
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .find((part) => part === property || part.startsWith(`${property}:`))

  return found ? found.slice(property.length + 1).trim() : null
}

function ruleFor(entry) {
  const body = ruleBody(styleOf(entry.file), entry.selector)
  if (body === null) {
    throw new Error(
      `Regra "${entry.selector}" não encontrada em src/pages/${entry.file}. ` +
        'Se o seletor mudou, ATUALIZE a lista desta guarda (DASH-20) em vez de ' +
        'removê-la: ela existe justamente para acusar essa mudança.',
    )
  }
  return body
}

function hint(entry) {
  return `src/pages/${entry.file} -> "${entry.selector}". Regra em src/css/tokens.scss; episódio em sprints/2026-09-02-sticky-tabelas-dashboard (repo backend).`
}

describe('sticky cujo scrollport NÃO é a página', () => {
  for (const entry of NAO_E_A_PAGINA) {
    it(`${entry.file} — ${entry.selector} usa top: 0 (${entry.why})`, () => {
      const body = ruleFor(entry)

      expect(declaration(body, 'position'), hint(entry)).toBe('sticky')

      const top = declaration(body, 'top')
      expect(
        top,
        `"${entry.selector}" em ${entry.file} usa top: ${top}. Fora do scrollport da página o offset ` +
          'do header do app é ZERO: somar $app-header-h faz o cabeçalho parar abaixo do topo e cobrir ' +
          `as primeiras linhas (regressão 6e89d73). ${hint(entry)}`,
      ).toBe('0')
    })
  }
})

describe('sticky cujo scrollport É a página', () => {
  for (const entry of E_A_PAGINA) {
    it(`${entry.file} — ${entry.selector} soma a altura do header do app`, () => {
      const body = ruleFor(entry)

      expect(declaration(body, 'position'), hint(entry)).toBe('sticky')

      const top = declaration(body, 'top')
      expect(
        top,
        `"${entry.selector}" em ${entry.file} usa top: ${top}. Aqui o scrollport é a página, então o ` +
          'sticky PRECISA somar $app-header-h — sem isso o header fixo do app cobre o elemento. ' +
          `Use o token, nunca um literal. ${hint(entry)}`,
      ).toContain('$app-header-h')
    })
  }
})
