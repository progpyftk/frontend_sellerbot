import { describe, expect, it } from 'vitest'

import { mensagemDeErro } from 'src/utils/erros'

// O util nasceu no FINT-20 de três cópias divergentes (Despesas, Livro, Margem). O que se prende
// aqui é a **ordem de preferência**: o texto de regra ganha do texto de campo, o campo nomeado pelo
// chamador ganha do primeiro campo, e o fallback do dono é o último recurso.

const erro = (data) => ({ response: { data } })

describe('mensagemDeErro', () => {
  it('prefere o `detail` — é o texto de regra do Django REST', () => {
    expect(mensagemDeErro(erro({ detail: 'Período fechado.', competencia: '2026-09' }))).toBe(
      'Período fechado.',
    )
  })

  it('aceita corpo que é a própria string', () => {
    expect(mensagemDeErro(erro('Competência inválida.'))).toBe('Competência inválida.')
  })

  it('o campo nomeado pelo chamador ganha do primeiro campo', () => {
    const corpo = { outro: 'primeiro do objeto', competencia: '2026-09' }

    expect(mensagemDeErro(erro(corpo), 'padrão', ['competencia'])).toBe('2026-09')
    expect(mensagemDeErro(erro(corpo), 'padrão')).toBe('primeiro do objeto')
  })

  it('lê o erro de validação de campo, que vem como lista', () => {
    expect(mensagemDeErro(erro({ valor: ['Informe um valor maior que zero.'] }))).toBe(
      'Informe um valor maior que zero.',
    )
  })

  it('junta os valores quando o campo nomeado é lista', () => {
    expect(mensagemDeErro(erro({ competencia: ['inválida', 'fora do período'] }), 'p', ['competencia'])).toBe(
      'inválida fora do período',
    )
  })

  it('cai no texto do dono quando não há nada aproveitável', () => {
    expect(mensagemDeErro(erro({}), 'Não foi possível salvar.')).toBe('Não foi possível salvar.')
    expect(mensagemDeErro(new Error('sem resposta'), 'Não foi possível salvar.')).toBe(
      'Não foi possível salvar.',
    )
    expect(mensagemDeErro(undefined)).toBe('Não foi possível concluir a operação.')
  })

  it('nunca devolve vazio nem o objeto cru', () => {
    const saida = mensagemDeErro(erro({ campo: [] }))

    expect(typeof saida).toBe('string')
    expect(saida.length).toBeGreaterThan(0)
    expect(saida).not.toContain('object')
  })
})
