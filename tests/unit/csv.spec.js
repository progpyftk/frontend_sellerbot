import { describe, expect, it } from 'vitest'

import { celulaCsv, paraCsv, valorParaCsv } from 'src/utils/csv'

// O `Intl` usa espaço não-quebrável depois do `R$`; o teste compara com espaço comum.
const semEspacoFino = (texto) => String(texto).replace(/\u00a0/g, ' ')

describe('valorParaCsv', () => {
  it('ausência é — e nunca 0', () => {
    expect(valorParaCsv(null)).toBe('—')
    expect(valorParaCsv(undefined)).toBe('—')
    expect(valorParaCsv('')).toBe('—')
  })

  it('zero é um valor, não ausência', () => {
    expect(semEspacoFino(valorParaCsv(0, 'moeda'))).toBe('R$ 0,00')
    expect(semEspacoFino(valorParaCsv('0.00', 'moeda'))).toBe('R$ 0,00')
  })

  it('moeda e data saem como na tela', () => {
    expect(valorParaCsv('15312.62', 'moeda')).toContain('15.312,62')
    expect(valorParaCsv('2026-08-12', 'data')).toBe('12/08/2026')
  })

  it('texto sai como veio', () => {
    expect(valorParaCsv('nfse')).toBe('nfse')
    expect(valorParaCsv(7)).toBe('7')
  })
})

describe('celulaCsv', () => {
  it('célula simples sai sem aspas', () => {
    expect(celulaCsv('Comissão Shopee')).toBe('Comissão Shopee')
  })

  it('célula com separador, aspas ou quebra vai entre aspas', () => {
    expect(celulaCsv('a;b')).toBe('"a;b"')
    expect(celulaCsv('diz "oi"')).toBe('"diz ""oi"""')
    expect(celulaCsv('linha1\nlinha2')).toBe('"linha1\nlinha2"')
  })

  it('nulo vira string vazia', () => {
    expect(celulaCsv(null)).toBe('')
  })
})

describe('paraCsv', () => {
  const COLUNAS = [
    { chave: 'competencia', rotulo: 'Competência', tipo: 'texto' },
    { chave: 'valor', rotulo: 'Valor (R$)', tipo: 'moeda' },
    { chave: 'data', rotulo: 'Data', tipo: 'data' },
  ]

  it('monta cabeçalho e linhas com o separador do Excel pt-BR', () => {
    const csv = paraCsv({
      colunas: COLUNAS,
      linhas: [{ competencia: '2026-08', valor: '15312.62', data: '2026-08-12' }],
    })
    const linhas = csv.split('\r\n')
    expect(linhas[0]).toBe('Competência;Valor (R$);Data')
    expect(semEspacoFino(linhas[1])).toBe('2026-08;R$ 15.312,62;12/08/2026')
  })

  it('linha com campo ausente exporta — no lugar de zero', () => {
    const csv = paraCsv({ colunas: COLUNAS, linhas: [{ competencia: '2026-08', valor: null }] })
    expect(csv.split('\r\n')[1]).toBe('2026-08;—;—')
  })

  it('a coluna pode trazer o próprio valor (ex.: total calculado)', () => {
    const csv = paraCsv({
      colunas: [{ chave: 'total', rotulo: 'Total', valor: (linha) => linha.a + linha.b }],
      linhas: [{ a: 1, b: 2 }],
    })
    expect(csv.split('\r\n')[1]).toBe('3')
  })

  it('sem linhas, sai só o cabeçalho', () => {
    expect(paraCsv({ colunas: COLUNAS, linhas: [] })).toBe('Competência;Valor (R$);Data')
  })

  it('lista ausente não quebra', () => {
    expect(paraCsv()).toBe('')
  })
})
