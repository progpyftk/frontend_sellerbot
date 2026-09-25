import { describe, expect, it } from 'vitest'

import {
  ORDEM_ASC,
  ORDEM_DESC,
  estadoDaColuna,
  ordenacaoInicial,
  ordenarLinhas,
  paraData,
  paraNumero,
  proximaOrdenacao,
  valorDaChave,
} from 'src/composables/useOrdenacao'

describe('proximaOrdenacao', () => {
  it('cicla asc → desc → ordem de origem', () => {
    const primeira = proximaOrdenacao(ordenacaoInicial(), 'nome')
    expect(primeira).toEqual({ chave: 'nome', direcao: ORDEM_ASC })

    const segunda = proximaOrdenacao(primeira, 'nome')
    expect(segunda).toEqual({ chave: 'nome', direcao: ORDEM_DESC })

    expect(proximaOrdenacao(segunda, 'nome')).toEqual(ordenacaoInicial())
  })

  it('trocar de coluna começa em asc', () => {
    const atual = { chave: 'nome', direcao: ORDEM_DESC }
    expect(proximaOrdenacao(atual, 'valor')).toEqual({ chave: 'valor', direcao: ORDEM_ASC })
  })

  it('sem chave volta à ordem de origem', () => {
    expect(proximaOrdenacao({ chave: 'nome', direcao: ORDEM_ASC }, '')).toEqual(ordenacaoInicial())
  })
})

describe('estadoDaColuna', () => {
  it('traduz o estado para o aria-sort', () => {
    expect(estadoDaColuna(ordenacaoInicial(), 'nome')).toBe('none')
    expect(estadoDaColuna({ chave: 'nome', direcao: ORDEM_ASC }, 'nome')).toBe('ascending')
    expect(estadoDaColuna({ chave: 'nome', direcao: ORDEM_DESC }, 'nome')).toBe('descending')
    expect(estadoDaColuna({ chave: 'outra', direcao: ORDEM_ASC }, 'nome')).toBe('none')
  })
})

describe('paraNumero', () => {
  it('lê o decimal que o backend manda como string', () => {
    expect(paraNumero('1234.56')).toBe(1234.56)
    expect(paraNumero(42)).toBe(42)
  })

  it('lê também o valor já formatado em pt-BR', () => {
    expect(paraNumero('1.234,56')).toBe(1234.56)
  })

  it('vazio e texto que não é número viram null', () => {
    expect(paraNumero('')).toBeNull()
    expect(paraNumero(null)).toBeNull()
    expect(paraNumero('abc')).toBeNull()
  })
})

describe('paraData', () => {
  it('aceita ISO, AAAA-MM-DD e AAAA-MM', () => {
    expect(paraData('2026-08-15')).toBe(Date.UTC(2026, 7, 15))
    expect(paraData('2026-08')).toBe(Date.UTC(2026, 7, 1))
    expect(paraData('2026-08-01T00:00:00Z')).toBe(Date.UTC(2026, 7, 1))
  })

  it('inválido vira null', () => {
    expect(paraData('ontem')).toBeNull()
    expect(paraData('')).toBeNull()
  })
})

describe('valorDaChave', () => {
  it('lê caminho com ponto', () => {
    expect(valorDaChave({ conta: { codigo: '3.3.1.01' } }, 'conta.codigo')).toBe('3.3.1.01')
  })

  it('não quebra quando o caminho não existe', () => {
    expect(valorDaChave({}, 'conta.codigo')).toBeUndefined()
  })

  it('devolve o valor real quando ele existe (zero não é ausência)', () => {
    expect(valorDaChave({ valor: 0 }, 'valor')).toBe(0)
  })
})

describe('ordenarLinhas', () => {
  it('ordena número como número, não como texto', () => {
    const linhas = [{ valor: '9' }, { valor: '10' }, { valor: '2' }]
    expect(ordenarLinhas(linhas, { chave: 'valor', tipo: 'numero' }, ORDEM_ASC).map((l) => l.valor)).toEqual([
      '2',
      '9',
      '10',
    ])
  })

  it('ordena moeda formatada em pt-BR', () => {
    const linhas = [{ valor: '1.234,56' }, { valor: '900,00' }, { valor: '2.000,00' }]
    expect(ordenarLinhas(linhas, { chave: 'valor', tipo: 'moeda' }, ORDEM_ASC).map((l) => l.valor)).toEqual([
      '900,00',
      '1.234,56',
      '2.000,00',
    ])
  })

  it('ordena data por instante', () => {
    const linhas = [{ d: '2026-08' }, { d: '2025-12' }, { d: '2026-01' }]
    expect(ordenarLinhas(linhas, { chave: 'd', tipo: 'data' }, ORDEM_ASC).map((l) => l.d)).toEqual([
      '2025-12',
      '2026-01',
      '2026-08',
    ])
  })

  it('ordena texto com acento e caixa pelo colador pt-BR', () => {
    const linhas = [{ nome: 'Zebra' }, { nome: 'água' }, { nome: 'Abacaxi' }]
    expect(ordenarLinhas(linhas, { chave: 'nome', tipo: 'texto' }, ORDEM_ASC).map((l) => l.nome)).toEqual([
      'Abacaxi',
      'água',
      'Zebra',
    ])
  })

  it('empate preserva a ordem anterior (estável)', () => {
    const linhas = [
      { id: 'a', v: 1 },
      { id: 'b', v: 1 },
      { id: 'c', v: 0 },
    ]
    expect(ordenarLinhas(linhas, { chave: 'v', tipo: 'numero' }, ORDEM_ASC).map((l) => l.id)).toEqual(['c', 'a', 'b'])
  })

  it('nulos vão para o fim nos dois sentidos', () => {
    const linhas = [{ v: 1 }, { v: null }, { v: 3 }, { v: '' }]
    expect(ordenarLinhas(linhas, { chave: 'v', tipo: 'numero' }, ORDEM_ASC).map((l) => l.v)).toEqual([
      1, 3, null, '',
    ])
    expect(ordenarLinhas(linhas, { chave: 'v', tipo: 'numero' }, ORDEM_DESC).map((l) => l.v)).toEqual([
      3, 1, null, '',
    ])
  })

  it('não toca na lista original', () => {
    const linhas = [{ v: 2 }, { v: 1 }]
    const ordenadas = ordenarLinhas(linhas, { chave: 'v', tipo: 'numero' }, ORDEM_ASC)
    expect(linhas.map((l) => l.v)).toEqual([2, 1])
    expect(ordenadas).not.toBe(linhas)
  })

  it('sem coluna ou sem direção mantém a ordem de origem', () => {
    const linhas = [{ v: 2 }, { v: 1 }]
    expect(ordenarLinhas(linhas, { chave: 'v', tipo: 'numero' }, '').map((l) => l.v)).toEqual([2, 1])
    expect(ordenarLinhas(linhas, null, ORDEM_ASC).map((l) => l.v)).toEqual([2, 1])
  })

  it('lista ausente não quebra', () => {
    expect(ordenarLinhas(null, { chave: 'v' }, ORDEM_ASC)).toEqual([])
  })
})
