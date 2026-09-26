import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import routes from 'src/router/routes'
import { ABAS_FINANCEIRO } from 'src/utils/financeiro'

// Guarda da estrutura do Financeiro & Contábil (tickets FINT-18 e FINT-19).
//
// Por que existe: o menu lateral chegou a ter **três** itens para o módulo — "Módulo Financeiro",
// "Bancos e Extratos" e "Margem de Contribuição" —, mas os dois últimos não eram destinos: um era
// redirect para a aba `extratos` e o outro era uma página solta (`MargensPage.vue`) que devia ser
// aba. O `FINT-18` derrubou isso, mas deixou um cabeçalho "Financeiro" com um filho dentro — e o
// dono corrigiu: a raiz tem de ser o próprio destino, sem submenu. É o que o `FINT-19` fixa aqui.

const RAIZ = fileURLToPath(new URL('../../src', import.meta.url))
const CAMINHO_LAYOUT = `${RAIZ}/layouts/MainLayout.vue`

/** Achata a árvore de rotas para procurar por `name` sem saber a profundidade. */
function achatar(registros) {
  return registros.flatMap((registro) => [registro, ...achatar(registro.children ?? [])])
}

const TODAS = achatar(routes)
const porNome = (nome) => TODAS.find((registro) => registro.name === nome)

const IDS_DAS_ABAS = ABAS_FINANCEIRO.map((aba) => aba.id)

describe('Financeiro — a raiz é o destino, o resto é aba (FINT-18/FINT-19)', () => {
  it('a guarda está olhando para a árvore de rotas de verdade', () => {
    // Sem isto, um `routes` vazio faria todos os testes abaixo passarem sem verificar nada.
    expect(TODAS.length).toBeGreaterThan(20)
    expect(porNome('financeiro')).toBeTruthy()
    expect(porNome('financeiro-bancos')).toBeTruthy()
    expect(porNome('financeiro-margens')).toBeTruthy()
  })

  it('a raiz do Financeiro é o próprio destino, e não um grupo com filho', () => {
    const layout = readFileSync(CAMINHO_LAYOUT, 'utf8')
    const secao = layout.split('title: "Financeiro & Contábil"')[1]

    expect(secao, 'a raiz Financeiro & Contábil saiu do MainLayout').toBeTruthy()

    // A seção termina na próxima `title:` de mesmo nível.
    const corpo = secao.split(/\n {2}\{\n/)[0]

    expect(corpo).toContain('route: "financeiro"')
    expect(corpo).not.toContain('items:')
    expect(corpo).not.toContain('{ label:')
  })

  it('o menu sabe renderizar uma seção que é destino (senão a raiz vira cabeçalho morto)', () => {
    const layout = readFileSync(CAMINHO_LAYOUT, 'utf8')

    // O ramo existe e é o que decide entre navegar e expandir.
    expect(layout).toContain('v-if="section.route"')
    expect(layout).toContain('v-if="!section.route"')
  })

  it('nenhum item de menu aponta para uma rota que virou aba', () => {
    const layout = readFileSync(CAMINHO_LAYOUT, 'utf8')

    expect(layout).not.toContain('route: "financeiro-bancos"')
    expect(layout).not.toContain('route: "financeiro-margens"')
  })

  it('os caminhos antigos continuam valendo, como redirect para uma aba existente', () => {
    for (const nome of ['financeiro-bancos', 'financeiro-margens']) {
      const registro = porNome(nome)

      expect(registro.redirect, `${nome} deixou de ser redirect`).toBeTruthy()
      expect(registro.redirect.name).toBe('financeiro')
      expect(IDS_DAS_ABAS).toContain(registro.redirect.params?.aba)
    }
  })

  it('a página solta da margem não existe mais como destino próprio', () => {
    const carregaPaginaDeMargem = TODAS.some((registro) =>
      String(registro.component ?? '').includes('MargensPage'),
    )

    expect(carregaPaginaDeMargem).toBe(false)
  })

  it('a margem de contribuição é uma aba do módulo', () => {
    expect(IDS_DAS_ABAS).toContain('margem')
  })
})
