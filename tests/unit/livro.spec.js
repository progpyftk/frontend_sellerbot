import { describe, expect, it } from 'vitest'

import { filtrarLivro, linhasDoLivro, partidasNormalizadas, somar } from 'src/utils/livro'

const ENTRADA = {
  id: 7,
  competencia: '2026-08',
  historico: 'NFS-e Shopee — comissão',
  origem: 'nfse',
  origem_ref: 'nfse:123',
  is_estorno: false,
  partidas: [
    { id: 1, codigo: '5.3.1.03', conta: 'Comissão de marketplace', debito: '20.50', credito: '0.00' },
    { id: 2, codigo: '2.1.5.01', conta: 'Fornecedores', debito: '0.00', credito: '20.50' },
  ],
}

describe('somar', () => {
  it('soma os valores em texto do backend', () => {
    expect(somar(['10.00', '2.50'])).toBe(12.5)
  })

  it('lista vazia e valor inválido não viram NaN', () => {
    expect(somar([])).toBe(0)
    expect(somar(null)).toBe(0)
    expect(somar(['10.00', 'abc'])).toBe(10)
  })
})

describe('linhasDoLivro', () => {
  it('conta as partidas, soma débito e crédito e confere a partida dobrada', () => {
    const [linha] = linhasDoLivro([ENTRADA])
    expect(linha.quantidade_partidas).toBe(2)
    expect(linha.total_debito).toBe(20.5)
    expect(linha.total_credito).toBe(20.5)
    expect(linha.equilibra).toBe(true)
  })

  it('lançamento que não fecha sai marcado, não silencioso', () => {
    const [linha] = linhasDoLivro([
      { ...ENTRADA, partidas: [{ codigo: '5.3.1.03', debito: '20.50', credito: '0.00' }] },
    ])
    expect(linha.equilibra).toBe(false)
  })

  it('lançamento sem partidas não quebra', () => {
    const [linha] = linhasDoLivro([{ id: 1, historico: 'vazio' }])
    expect(linha.quantidade_partidas).toBe(0)
    expect(linha.total_debito).toBe(0)
  })

  it('lista ausente devolve lista vazia', () => {
    expect(linhasDoLivro()).toEqual([])
  })
})

describe('filtrarLivro', () => {
  const LINHAS = [
    { historico: 'DAS — Simples Nacional', origem: 'das', origem_ref: 'das:2026-08' },
    { historico: 'NFS-e Shopee', origem: 'nfse', origem_ref: 'nfse:123' },
  ]

  it('sem termo devolve tudo', () => {
    expect(filtrarLivro(LINHAS, '', ['historico'])).toHaveLength(2)
    expect(filtrarLivro(LINHAS, '   ', ['historico'])).toHaveLength(2)
  })

  it('casa em qualquer um dos campos, sem diferenciar caixa', () => {
    expect(filtrarLivro(LINHAS, 'shopee', ['historico'])).toHaveLength(1)
    expect(filtrarLivro(LINHAS, 'SHOPEE', ['historico', 'origem'])).toHaveLength(1)
    expect(filtrarLivro(LINHAS, 'nfse:123', ['origem_ref'])).toHaveLength(1)
  })

  it('não encontra o que não existe', () => {
    expect(filtrarLivro(LINHAS, 'icms', ['historico', 'origem'])).toEqual([])
  })
})

describe('partidasNormalizadas', () => {
  it('devolve as partidas com chave estável e os dois lados', () => {
    const partidas = partidasNormalizadas(ENTRADA)
    expect(partidas).toHaveLength(2)
    expect(partidas[0]).toMatchObject({ chave: 1, codigo: '5.3.1.03', debito: '20.50' })
  })

  it('sem id, a chave cai no código e nos valores — nunca fica indefinida', () => {
    const [partida] = partidasNormalizadas({
      partidas: [{ codigo: '5.3.1.03', debito: '1.00', credito: '0.00' }],
    })
    expect(partida.chave).toBe('5.3.1.03-1.00-0.00')
  })
})
