import { describe, expect, it } from 'vitest'

import {
  formatarCnpj,
  normalizarCompetencia,
  opcoesDeEmpresa,
  periodoValido,
} from 'src/utils/seletores'

const CONTAS = [
  { id: 1, cnpj: '41641514000103', razao_social: 'DOSE VERDE LTDA' },
  { id: 2, cnpj: '55638160000152', razao_social: '' },
]

describe('formatarCnpj', () => {
  it('formata os 14 dígitos', () => {
    expect(formatarCnpj('41641514000103')).toBe('41.641.514/0001-03')
  })

  it('devolve — quando não há documento', () => {
    expect(formatarCnpj('')).toBe('—')
    expect(formatarCnpj(null)).toBe('—')
  })

  it('não mexe no que já não é CNPJ de 14 dígitos', () => {
    expect(formatarCnpj('41.641.514/0001-03')).toBe('41.641.514/0001-03')
  })
})

describe('opcoesDeEmpresa', () => {
  it('usa o CNPJ como valor por padrão e cai no rótulo genérico sem razão social', () => {
    expect(opcoesDeEmpresa(CONTAS)).toEqual([
      { label: '41.641.514/0001-03 — DOSE VERDE LTDA', value: '41641514000103' },
      { label: '55.638.160/0001-52 — CNPJ Fiscal', value: '55638160000152' },
    ])
  })

  it('usa o id quando a tela vincula conta fiscal (conexões bancárias)', () => {
    expect(opcoesDeEmpresa(CONTAS, { valor: 'id' })[0]).toEqual({
      label: '41.641.514/0001-03 — DOSE VERDE LTDA',
      value: 1,
    })
  })

  it('acrescenta a opção nula "Todos os CNPJs" quando pedido', () => {
    const opcoes = opcoesDeEmpresa(CONTAS, { incluirTodos: true })
    expect(opcoes[0]).toEqual({ label: 'Todos os CNPJs', value: null })
    expect(opcoes).toHaveLength(3)
  })

  it('lista vazia ou ausente não quebra a tela', () => {
    expect(opcoesDeEmpresa([])).toEqual([])
    expect(opcoesDeEmpresa(null)).toEqual([])
  })
})

describe('normalizarCompetencia', () => {
  it('aceita AAAA-MM e AAAA-MM-DD e devolve o mês', () => {
    expect(normalizarCompetencia('2026-08')).toBe('2026-08')
    expect(normalizarCompetencia('2026-08-15')).toBe('2026-08')
    expect(normalizarCompetencia(' 2026-12 ')).toBe('2026-12')
  })

  it('recusa mês impossível e formato desconhecido', () => {
    expect(normalizarCompetencia('2026-13')).toBeNull()
    expect(normalizarCompetencia('08/2026')).toBeNull()
    expect(normalizarCompetencia('')).toBeNull()
  })
})

describe('periodoValido', () => {
  it('sem os dois lados é "sem recorte", não erro', () => {
    expect(periodoValido('', '')).toBe(true)
    expect(periodoValido('2026-08', '')).toBe(true)
    expect(periodoValido('', '2026-08')).toBe(true)
  })

  it('mesma competência é válido', () => {
    expect(periodoValido('2026-08', '2026-08')).toBe(true)
  })

  it('período invertido é recusado', () => {
    expect(periodoValido('2026-08', '2026-07')).toBe(false)
  })

  it('formato inválido não vira erro de período (o backend valida o filtro)', () => {
    expect(periodoValido('ontem', 'hoje')).toBe(true)
  })
})
