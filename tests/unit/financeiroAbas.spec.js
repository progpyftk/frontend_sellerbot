import { describe, expect, it } from 'vitest'

import {
  ABAS_FINANCEIRO,
  ABA_PADRAO,
  abaPorId,
  abaValida,
  abasDisponiveis,
} from 'src/utils/financeiro'

describe('ABAS_FINANCEIRO', () => {
  it('não repete id e toda aba aponta para um endpoint do backend', () => {
    const ids = ABAS_FINANCEIRO.map((aba) => aba.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const aba of ABAS_FINANCEIRO) {
      expect(aba.endpoint.startsWith('/api/')).toBe(true)
      expect(aba.label.length).toBeGreaterThan(2)
      // `onda` nomeia a onda que trouxe a aba; o módulo passou do FIN-14 (a Despesas é do FINT-9).
      expect(aba.onda.length).toBeGreaterThan(0)
    }
  })

  it('a aba padrão existe na lista', () => {
    expect(ABAS_FINANCEIRO.some((aba) => aba.id === ABA_PADRAO)).toBe(true)
  })

  it('as abas com tela são todas as do módulo, na ordem de leitura', () => {
    expect(abasDisponiveis()).toEqual([
      'visao-geral',
      'marketplace',
      'dre',
      'balanco',
      'dfc',
      'tributos',
      'cenarios',
      'conciliacao',
      'despesas',
      'livro',
      'extratos',
    ])
  })
})

describe('abaValida', () => {
  it('aceita os ids da lista, normalizando caixa e espaço', () => {
    expect(abaValida('dre')).toBe('dre')
    expect(abaValida('  EXTRATOS ')).toBe('extratos')
  })

  it('devolve null para aba desconhecida ou ausente — a tela decide o destino', () => {
    expect(abaValida('financeiro-geral')).toBeNull()
    expect(abaValida(undefined)).toBeNull()
    expect(abaValida('')).toBeNull()
    expect(abaValida(null)).toBeNull()
  })
})

describe('abaPorId', () => {
  it('devolve a aba inteira (o que a tela usa para dizer o que a preenche)', () => {
    expect(abaPorId('balanco')).toMatchObject({
      id: 'balanco',
      onda: 'FIN-14c',
      endpoint: '/api/financeiro/contabil/balanco/',
    })
    expect(abaPorId('nao-existe')).toBeNull()
  })
})
