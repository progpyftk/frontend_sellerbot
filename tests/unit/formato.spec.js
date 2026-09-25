import { describe, expect, it } from 'vitest'

import { formatCnpj, formatCurrency, formatDate, formatDateTime } from 'src/utils/formato'

describe('formatCurrency', () => {
  it('formata em real e trata inválido como zero (é saldo, não ausência)', () => {
    expect(formatCurrency('1234.5')).toContain('1.234,50')
    expect(formatCurrency(null)).toContain('0,00')
    expect(formatCurrency('abc')).toContain('0,00')
  })
})

describe('formatCnpj', () => {
  it('mascara 14 dígitos e aceita o CNPJ já formatado', () => {
    expect(formatCnpj('41641514000103')).toBe('41.641.514/0001-03')
    expect(formatCnpj('41.641.514/0001-03')).toBe('41.641.514/0001-03')
  })

  it('devolve — quando não há documento', () => {
    expect(formatCnpj('')).toBe('—')
    expect(formatCnpj(null)).toBe('—')
  })
})

describe('formatDate e formatDateTime', () => {
  it('data vazia vira — ; data inválida volta como veio', () => {
    expect(formatDate('')).toBe('—')
    expect(formatDate('nao-e-data')).toBe('nao-e-data')
    expect(formatDate('2026-08-31')).toMatch(/31\/08\/2026/)
  })

  it('sem data/hora diz "Nunca sincronizada"', () => {
    expect(formatDateTime(null)).toBe('Nunca sincronizada')
    expect(formatDateTime('')).toBe('Nunca sincronizada')
    expect(formatDateTime('2026-08-31T12:30:00')).toMatch(/31\/08\/2026/)
  })
})
