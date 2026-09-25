import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Guarda de regressão do módulo Financeiro & Contábil (ticket FINT-15).
//
// Por que existe: o módulo inteiro passou a ler por **uma** tabela (`SbTabela`) — a `q-table` e a
// `q-markup-table` do Quasar saíram de todas as abas. Sem guarda, a próxima tela que precisar de uma
// grade reintroduz a `q-table` sem ninguém notar, e o módulo volta a ter duas gramáticas, duas
// ordenações e dois jeitos de mostrar "sem valor".
//
// A comparação é pelo **início da tag** (`<q-table`, `<q-markup-table`): as menções em comentário
// usam crase e continuam permitidas — o que a guarda proíbe é a tag de verdade.

const SRC = fileURLToPath(new URL('../../src', import.meta.url))

const DIRETORIOS_DO_MODULO = [join(SRC, 'components', 'financeiro')]
const ARQUIVOS_DO_MODULO = [
  join(SRC, 'pages', 'FinanceiroPage.vue'),
  join(SRC, 'pages', 'BancosExtratosPage.vue'),
]

const TAGS_PROIBIDAS = ['<q-table', '<q-markup-table']

function arquivosVue(diretorio) {
  return readdirSync(diretorio).flatMap((nome) => {
    const caminho = join(diretorio, nome)
    if (statSync(caminho).isDirectory()) return arquivosVue(caminho)
    return nome.endsWith('.vue') ? [caminho] : []
  })
}

const ARQUIVOS = [...DIRETORIOS_DO_MODULO.flatMap(arquivosVue), ...ARQUIVOS_DO_MODULO]

describe('Financeiro — a tabela do módulo é a SbTabela (FINT-15)', () => {
  it('a guarda está olhando para os arquivos do módulo', () => {
    // Sem isto, um caminho errado faria a guarda passar sem verificar nada.
    expect(ARQUIVOS.length).toBeGreaterThan(10)
    expect(ARQUIVOS.some((caminho) => caminho.endsWith('FinanceiroPage.vue'))).toBe(true)
    expect(ARQUIVOS.some((caminho) => caminho.endsWith('FinanceiroLivro.vue'))).toBe(true)
    expect(ARQUIVOS.some((caminho) => caminho.endsWith('extratos/ExtratosExtratoTab.vue'))).toBe(true)
  })

  it('nenhuma tela do módulo usa q-table nem q-markup-table', () => {
    const infratores = ARQUIVOS.filter((caminho) => {
      const conteudo = readFileSync(caminho, 'utf8')
      return TAGS_PROIBIDAS.some((tag) => conteudo.includes(tag))
    })

    expect(infratores).toEqual([])
  })
})
