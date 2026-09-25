import { describe, expect, it } from 'vitest'

import {
  CASCATA_DRE,
  cenarioTemNumero,
  cenariosDaEmpresa,
  contasDaLinha,
  contasDaLinhaDoDre,
  formatarMoeda,
  gruposDoBalanco,
  linhasDaCascata,
  linhasDaConciliacao,
  linhasDaViaDireta,
  linhasDaViaIndireta,
  linhasDoBalanco,
  numerosDaVisaoGeral,
  resumoDaApuracao,
  resumoDaConciliacao,
  rotuloRegime,
  temInconsistencia,
  viasDoDfc,
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

describe('formatarMoeda', () => {
  it('formata em real e devolve — para ausente (nunca R$ 0,00 por engano)', () => {
    expect(formatarMoeda('1234.5')).toContain('1.234,50')
    expect(formatarMoeda(null)).toBe('—')
    expect(formatarMoeda('')).toBe('—')
    expect(formatarMoeda('abc')).toBe('—')
  })
})

describe('gruposDoBalanco', () => {
  const BALANCO = {
    ativo: { circulante: '100.00', nao_circulante: '50.00', total: '150.00', contas: [{ codigo: '1.1.1.01', nome: 'Caixa', saldo: '100.00' }] },
    passivo: { circulante: '30.00', nao_circulante: '0.00', total: '30.00', contas: [] },
    patrimonio_liquido: { total: '120.00', contas: [] },
  }

  it('devolve os três grupos na ordem e com os subtotais', () => {
    const grupos = gruposDoBalanco(BALANCO)
    expect(grupos.map((g) => g.chave)).toEqual(['ativo', 'passivo', 'patrimonio_liquido'])
    expect(grupos[0].total).toBe('150.00')
    expect(grupos[0].subtotais.map((s) => s.valor)).toEqual(['100.00', '50.00'])
    expect(grupos[2].subtotais).toEqual([])
  })

  it('balanço vazio não quebra: totais viram null', () => {
    const grupos = gruposDoBalanco()
    expect(grupos).toHaveLength(3)
    expect(grupos[0].total).toBeNull()
    expect(grupos[0].contas).toEqual([])
  })
})

describe('viasDoDfc', () => {
  const DFC = {
    saldo_inicial: '1000.00',
    saldo_final: '2500.00',
    variacao_do_caixa: '1500.00',
    confere: true,
    diferenca_entre_metodos: '0.00',
    explicacoes: [],
    indireto: {
      linhas: [{ linha: 'Resultado do periodo', valor: '1500.00' }],
      atividades: { operacional: '1500.00', investimento: '0.00', financiamento: '0.00' },
      total: '1500.00',
    },
    direto: {
      atividades: { operacional: '1500.00' },
      total: '1500.00',
    },
  }

  it('traz as linhas do indireto com o rótulo do documento e as atividades com nome de negócio', () => {
    const via = viasDoDfc(DFC)
    expect(via.linhasIndiretas[0]).toEqual({ rotulo: 'Resultado do periodo', valor: '1500.00' })
    expect(via.atividadesIndiretas[0]).toEqual({
      chave: 'operacional',
      rotulo: 'Operacional',
      valor: '1500.00',
    })
    expect(via.variacaoDoCaixa).toBe('1500.00')
    expect(via.confere).toBe(true)
  })

  it('DFC vazio não quebra e não inventa zero', () => {
    const via = viasDoDfc()
    expect(via.linhasIndiretas).toEqual([])
    expect(via.totalIndireto).toBeNull()
    expect(via.variacaoDoCaixa).toBeNull()
  })
})

describe('contasDaLinha', () => {
  it('devolve as contas do DRE ou lista vazia', () => {
    expect(contasDaLinha({ linhas: [{ codigo: '3.1.1.01' }] })).toHaveLength(1)
    expect(contasDaLinha({})).toEqual([])
  })
})

describe('contasDaLinhaDoDre', () => {
  const DRE = {
    linhas: [
      { codigo: '3.1.1.01', conta: 'Receita', linha_do_dre: 'receita_bruta', valor: '100.00' },
      { codigo: '3.3.1.01', conta: 'DAS', linha_do_dre: 'impostos_sobre_a_receita', valor: '10.00' },
      { codigo: '3.1.2.01', conta: 'Outra receita', linha_do_dre: 'receita_bruta', valor: '5.00' },
    ],
  }

  it('a origem é filtrada pela linha do DRE que o backend marca', () => {
    expect(contasDaLinhaDoDre(DRE, 'receita_bruta').map((c) => c.codigo)).toEqual(['3.1.1.01', '3.1.2.01'])
    expect(contasDaLinhaDoDre(DRE, 'impostos_sobre_a_receita')).toHaveLength(1)
  })

  it('linha sem conta devolve vazio — a tela não inventa origem', () => {
    expect(contasDaLinhaDoDre(DRE, 'cmv')).toEqual([])
    expect(contasDaLinhaDoDre(DRE, '')).toEqual([])
    expect(contasDaLinhaDoDre({}, 'receita_bruta')).toEqual([])
  })
})

describe('linhasDoBalanco', () => {
  const BALANCO = {
    ativo: {
      circulante: '100.00',
      nao_circulante: '50.00',
      total: '150.00',
      contas: [{ codigo: '1.1.1.01', nome: 'Caixa', saldo: '100.00' }],
    },
    passivo: { circulante: '30.00', nao_circulante: '0.00', total: '30.00', contas: [] },
    patrimonio_liquido: { total: '120.00', contas: [{ codigo: '2.3.1.01', nome: 'Capital', saldo: '120.00' }] },
  }

  it('achata subtotais e total do grupo na ordem de leitura', () => {
    const linhas = linhasDoBalanco(BALANCO)
    expect(linhas.map((l) => l.chave)).toEqual([
      'ativo:circulante',
      'ativo:nao_circulante',
      'ativo:total',
      'passivo:circulante',
      'passivo:nao_circulante',
      'passivo:total',
      'patrimonio_liquido:total',
    ])
    expect(linhas[2]).toMatchObject({
      grupo: 'Ativo',
      rotulo: 'Total Ativo',
      valor: '150.00',
      tipo: 'total',
    })
  })

  it('subtotal não carrega contas (o payload não recorta) e o total carrega', () => {
    const linhas = linhasDoBalanco(BALANCO)
    expect(linhas[0].contas).toEqual([])
    expect(linhas[2].contas).toHaveLength(1)
    expect(linhas[6].contas).toHaveLength(1)
  })

  it('balanço vazio mantém a estrutura e não inventa número', () => {
    const linhas = linhasDoBalanco()
    expect(linhas).toHaveLength(7) // 6 subtotais + o total do PL
    expect(linhas[0].valor).toBeNull()
    expect(linhas[0].contas).toEqual([])
  })
})

describe('linhas das vias do DFC', () => {
  const VIA = {
    linhasIndiretas: [{ rotulo: 'Resultado do periodo', valor: '1500.00' }],
    atividadesIndiretas: [{ chave: 'operacional', rotulo: 'Operacional', valor: '1500.00' }],
    totalIndireto: '1500.00',
    atividadesDiretas: [{ chave: 'operacional', rotulo: 'Operacional', valor: '1500.00' }],
    totalDireto: '1500.00',
  }

  it('a via indireta tem ajuste, atividade e total, nesta ordem', () => {
    const linhas = linhasDaViaIndireta(VIA)
    expect(linhas.map((l) => l.rotulo)).toEqual([
      'Resultado do periodo',
      'Atividade Operacional',
      'Total indireto',
    ])
    expect(linhas.map((l) => l.tipo)).toEqual(['ajuste', 'atividade', 'total'])
  })

  it('a via direta tem atividade e total', () => {
    expect(linhasDaViaDireta(VIA).map((l) => l.rotulo)).toEqual(['Operacional', 'Total direto'])
  })

  it('via vazia vira null — nunca zero por engano', () => {
    expect(linhasDaViaIndireta().map((l) => l.valor)).toEqual([null])
    expect(linhasDaViaDireta().map((l) => l.valor)).toEqual([null])
  })
})

describe('rotuloRegime', () => {
  it('traduz os regimes do comparador e não inventa para chave desconhecida', () => {
    expect(rotuloRegime('hibrido')).toBe('Simples híbrido (2027)')
    expect(rotuloRegime('fora_simples')).toBe('Fora do Simples (2027)')
    expect(rotuloRegime('xpto')).toBe('xpto')
  })
})

describe('cenariosDaEmpresa', () => {
  const EMPRESA_CEN = {
    cenarios: [
      { regime: 'simples_puro', total: '15312.63', total_pct_receita: '9.8798', completo: true, faltantes: [], linhas: [{ tributo: 'DAS', valor: '15312.63' }] },
      { regime: 'hibrido', total: null, completo: false, faltantes: [{ chave: 'cbs' }], observacoes: ['parcial'] },
    ],
  }

  it('traz rótulo, total, completude e as linhas de cada cenário', () => {
    const cenarios = cenariosDaEmpresa(EMPRESA_CEN)
    expect(cenarios[0].rotulo).toBe('Simples puro (2027)')
    expect(cenarios[0].total).toBe('15312.63')
    expect(cenarios[0].linhas).toHaveLength(1)
    expect(cenarios[1].completo).toBe(false)
    expect(cenarios[1].faltantes[0].chave).toBe('cbs')
  })

  it('empresa sem cenários devolve lista vazia', () => {
    expect(cenariosDaEmpresa()).toEqual([])
  })

  it('cenarioTemNumero distingue parcial de zero', () => {
    expect(cenarioTemNumero({ total: '0.00' })).toBe(true)
    expect(cenarioTemNumero({ total: null })).toBe(false)
    expect(cenarioTemNumero({})).toBe(false)
  })
})

describe('resumoDaApuracao', () => {
  it('traz totais e linhas do painel, com fallback para a contagem de linhas', () => {
    const resumo = resumoDaApuracao({
      total_declarado: '100.00',
      total_calculado: '99.98',
      diferenca_total: '0.02',
      divergentes: 1,
      linhas: [{ competencia: '2026-08', classe: 'redistribuicao' }],
    })
    expect(resumo.totalDeclarado).toBe('100.00')
    expect(resumo.diferencaTotal).toBe('0.02')
    expect(resumo.competencias).toBe(1)
    expect(resumo.divergentes).toBe(1)
  })

  it('painel vazio não quebra', () => {
    const resumo = resumoDaApuracao()
    expect(resumo.competencias).toBe(0)
    expect(resumo.totalDeclarado).toBeNull()
  })
})

describe('conciliacao', () => {
  const BLOCO = {
    demonstrativo: 'dre',
    resumo: { confere: 3, de_dado: 1 },
    linhas: [{ chave: 'receita_bruta', sistema: '10.00', contador: '9.00', diferenca: '1.00', classe: 'de_dado' }],
  }

  it('devolve as linhas e o resumo por classe', () => {
    expect(linhasDaConciliacao(BLOCO)).toHaveLength(1)
    expect(resumoDaConciliacao(BLOCO)).toEqual([
      { classe: 'confere', quantidade: 3 },
      { classe: 'de_dado', quantidade: 1 },
    ])
  })

  it('bloco vazio não quebra', () => {
    expect(linhasDaConciliacao()).toEqual([])
    expect(resumoDaConciliacao()).toEqual([])
  })
})
