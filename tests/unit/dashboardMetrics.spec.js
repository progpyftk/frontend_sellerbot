import { describe, expect, it } from 'vitest'

import { calculateNetMarginPct } from 'src/utils/dashboardMetrics'

// FIN-20: a regua da margem de contribuicao e `MC / faturamento liquido`, nao `MC / GMV`.
// O comportamento antigo (denominador = GMV bruto) era o defeito: inflava o percentual
// porque dividia a margem por um valor que ainda contem impostos e tarifas.
describe('calculateNetMarginPct', () => {
  it('calcula o lucro após ads sobre o faturamento líquido', () => {
    expect(calculateNetMarginPct(100, 30, 10)).toBe(20)
  })

  it('usa a receita líquida como denominador (não o GMV bruto)', () => {
    // 20 de margem sobre 80 de líquido = 25%; sobre o GMV de 100 daria 20%.
    expect(calculateNetMarginPct(80, 30, 10)).toBe(25)
    expect(calculateNetMarginPct(80, 30, 10)).not.toBe(20)
  })

  it('retorna null quando não há receita líquida', () => {
    expect(calculateNetMarginPct(0, 30, 10)).toBeNull()
  })
})
