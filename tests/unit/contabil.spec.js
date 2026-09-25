import { describe, expect, it } from 'vitest'

import {
  CASCATA_DRE,
  linhasDaCascata,
  numerosDaVisaoGeral,
  temInconsistencia,
} from 'src/utils/contabil'

const EMPRESA = {
  cnpj: '41641514000103',
  dre: {
    subtotais: {
      receita_bruta: '204362.00',
      deducoes: '15312.62',
      impostos_sobre_a_receita: '15312.62',
      receita_liquida: '189049.38',
      cmv: '0.00',
      resultado_bruto: '189049.38',
      custos_variaveis: '20000.00',
      margem_contribuicao: '169049.38',
      despesas_operacionais: '0.00',
      despesas_financeiras: '0.00',
      receitas_financeiras: '0.00',
      outras_receitas_e_despesas: '0.00',
      depreciacao_e_amortizacao: '0.00',
      resultado_antes_do_imposto: '169049.38',
      imposto_sobre_o_lucro: '0.00',
      resultado_liquido: '169049.38',
      ebitda: '169049.38',
    },
    margem_contribuicao_pct: '89.42',
    ebitda_pct: '89.42',
    confere: true,
  },
  balanco: { ativo: { total: '500000.00' }, equilibra: true, equacao: '0.00' },
  dfc: { variacao_do_caixa: '14860.33', confere: true },
}

describe('CASCATA_DRE', () => {
  it('a margem de contribuição e o resultado líquido são linhas de destaque', () => {
    const destaques = CASCATA_DRE.filter((l) => l.tipo === 'destaque').map((l) => l.chave)
    expect(destaques).toEqual(['margem_contribuicao', 'resultado_liquido'])
  })

  it('a receita líquida vem depois dos impostos e a MC depois dos custos variáveis', () => {
    const ordem = CASCATA_DRE.map((l) => l.chave)
    expect(ordem.indexOf('receita_liquida')).toBeGreaterThan(ordem.indexOf('impostos_sobre_a_receita'))
    expect(ordem.indexOf('margem_contribuicao')).toBeGreaterThan(ordem.indexOf('custos_variaveis'))
  })

  it('não repete chave', () => {
    const chaves = CASCATA_DRE.map((l) => l.chave)
    expect(new Set(chaves).size).toBe(chaves.length)
  })
})

describe('linhasDaCascata', () => {
  it('casa cada linha com o subtotal do backend', () => {
    const linhas = linhasDaCascata(EMPRESA.dre.subtotais)
    const porChave = Object.fromEntries(linhas.map((l) => [l.chave, l.valor]))
    expect(porChave.receita_bruta).toBe('204362.00')
    expect(porChave.margem_contribuicao).toBe('169049.38')
    expect(porChave.ebitda).toBe('169049.38')
  })

  it('chave ausente vira null — a tela mostra — e nunca zero', () => {
    const linhas = linhasDaCascata({ receita_bruta: '10.00' })
    const porChave = Object.fromEntries(linhas.map((l) => [l.chave, l.valor]))
    expect(porChave.receita_bruta).toBe('10.00')
    expect(porChave.resultado_liquido).toBeNull()
  })
})

describe('numerosDaVisaoGeral', () => {
  it('cada número vem do seu demonstrativo e a conferência viaja junto', () => {
    const n = numerosDaVisaoGeral(EMPRESA)
    expect(n.receita_liquida).toBe('189049.38')
    expect(n.margem_contribuicao_pct).toBe('89.42')
    expect(n.ativo).toBe('500000.00')
    expect(n.variacao_do_caixa).toBe('14860.33')
    expect(n.dre_confere).toBe(true)
    expect(n.balanco_equilibra).toBe(true)
    expect(n.dfc_confere).toBe(true)
  })

  it('empresa vazia não quebra a tela', () => {
    const n = numerosDaVisaoGeral()
    expect(n.receita_bruta).toBeNull()
    expect(n.dre_confere).toBeNull()
  })
})

describe('temInconsistencia', () => {
  it('é falso quando os três demonstrativos fecham', () => {
    expect(temInconsistencia(EMPRESA)).toBe(false)
  })

  it('é verdadeiro quando qualquer um não fecha — e null (sem dado) não acusa', () => {
    expect(temInconsistencia({ ...EMPRESA, balanco: { ...EMPRESA.balanco, equilibra: false } })).toBe(true)
    expect(temInconsistencia({ dre: { confere: null } })).toBe(false)
  })
})
