import { describe, expect, it } from 'vitest'

import { aplicarPatch, lerEstado, somenteRecorte } from 'src/utils/urlDoRecorte'

describe('lerEstado', () => {
  it('lê o recorte e a visão da query', () => {
    const estado = lerEstado({
      empresa: '41641514000103',
      de: '2026-08',
      ate: '2026-08',
      ordenar: 'valor',
      dir: 'desc',
      busca: 'das',
    })
    expect(estado).toEqual({
      empresa: '41641514000103',
      de: '2026-08',
      ate: '2026-08',
      ordenar: 'valor',
      dir: 'desc',
      busca: 'das',
    })
  })

  it('query vazia não quebra e empresa ausente vira null (o seletor espera isso)', () => {
    expect(lerEstado()).toEqual({
      empresa: null,
      de: '',
      ate: '',
      ordenar: '',
      dir: '',
      busca: '',
    })
    expect(lerEstado({ empresa: '' }).empresa).toBeNull()
  })

  it('número na query vira texto — a URL não guarda tipo', () => {
    expect(lerEstado({ empresa: 123 }).empresa).toBe('123')
  })
})

describe('aplicarPatch', () => {
  it('grava o que tem valor e preserva o que não foi tocado', () => {
    const resultado = aplicarPatch(
      { aba: 'dre', outra: ['x'] },
      { empresa: '41641514000103', ordenar: 'valor' },
    )
    expect(resultado).toEqual({ aba: 'dre', outra: ['x'], empresa: '41641514000103', ordenar: 'valor' })
  })

  it('valor vazio sai da URL — `?busca=` sujaria o link sem dizer nada', () => {
    const resultado = aplicarPatch({ busca: 'das', dir: 'asc' }, { busca: '', dir: '   ' })
    expect(resultado).toEqual({})
  })

  it('null e undefined também saem', () => {
    expect(aplicarPatch({ empresa: 'x', de: 'y' }, { empresa: null, de: undefined })).toEqual({})
  })

  it('não muta a query original', () => {
    const original = { aba: 'dre' }
    aplicarPatch(original, { empresa: 'x' })
    expect(original).toEqual({ aba: 'dre' })
  })
})

describe('somenteRecorte', () => {
  it('leva o recorte e descarta a visão', () => {
    const resultado = somenteRecorte({
      empresa: '41641514000103',
      de: '2026-08',
      ate: '2026-09',
      ordenar: 'valor',
      dir: 'desc',
      busca: 'das',
    })
    expect(resultado).toEqual({ empresa: '41641514000103', de: '2026-08', ate: '2026-09' })
  })

  it('chave desconhecida também fica de fora — a troca de aba não arrasta lixo', () => {
    expect(somenteRecorte({ empresa: 'x', estranho: 'y' })).toEqual({ empresa: 'x' })
  })

  it('query vazia devolve objeto vazio', () => {
    expect(somenteRecorte()).toEqual({})
  })
})
