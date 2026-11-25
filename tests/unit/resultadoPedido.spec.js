import { describe, expect, it } from 'vitest'
import {
  COLUNAS_CASCATA, formatAliquota, linhasEmbalagens, linhasFrete, margemPct, resultadoDaLinha, somarResultados,
} from 'src/utils/resultadoPedido'

const bloco = (o = {}) => ({
  gmv: 100, imposto: 8, receita_liquida: 92, taxas: 12, frete: 20, repasse: 68, ads: 5, producao: 1.1,
  embalagens: 1.88, produto: 15, lucro_bruto: 37.02, margem_contribuicao: 0.3702, unidades: 3,
  unidades_sem_custo: 0, custo_incompleto: false, ads_parcial: false, repasse_estimado: false,
  frete_detalhe: { frete_vendedor: '20.00', credito_flex: '0', cupom_vendedor: '0' },
  embalagens_detalhe: { saco: 0.55, etiqueta_identificacao: 0.04, etiqueta_envio: 0.04, stretch: 1.25 },
  ...o,
})

describe('cascata do pedido (CUSTO-14)', () => {
  it('segue a ordem de colunas decidida pelo dono', () => {
    expect(COLUNAS_CASCATA.map((c) => c.chave)).toEqual([
      'gmv', 'imposto', 'receita_liquida', 'taxas', 'frete', 'ads', 'producao', 'embalagens', 'produto', 'lucro_bruto',
    ])
  })

  it('soma os sub-pedidos de um pack e recalcula a margem', () => {
    const r = somarResultados([bloco(), bloco({ gmv: 300, lucro_bruto: 62.98, custo_incompleto: true })])
    expect(r.gmv).toBe(400)
    expect(r.lucro_bruto).toBe(100)
    expect(r.margem_contribuicao).toBeCloseTo(0.25)
    expect(r.custo_incompleto).toBe(true)
    expect(r.embalagens_detalhe.stretch).toBe(2.5)
    expect(r.frete_detalhe.frete_vendedor).toBe(40)
  })

  it('pack com sub-pedido sem resultado fica marcado parcial; tudo nulo vira null', () => {
    expect(somarResultados([bloco(), null]).parcial).toBe(true)
    expect(somarResultados([null, null])).toBeNull()
  })

  it('linha comum usa o próprio bloco; pack soma os _packOrders', () => {
    expect(resultadoDaLinha({ resultado: bloco() }).gmv).toBe(100)
    const pack = { _isPack: true, _packOrders: [{ resultado: bloco() }, { resultado: bloco() }] }
    expect(resultadoDaLinha(pack).gmv).toBe(200)
    expect(resultadoDaLinha({ resultado: null })).toBeNull()
  })

  it('formata margem, alíquota e lista só componentes não zerados', () => {
    expect(margemPct(bloco())).toBe(37)
    expect(formatAliquota('0.094500')).toBe('9,45%')
    expect(linhasFrete(bloco())).toEqual([['Frete pago pelo vendedor', 20]])
    expect(linhasEmbalagens(bloco({ embalagens_detalhe: { saco: 0, stretch: 1.25 } }))).toEqual([['Stretch', 1.25]])
  })
})

describe('motivo do "—" (CUSTO-14)', async () => {
  const { motivoDaLinha, textoMotivo } = await import('src/utils/resultadoPedido')
  it('explica conta fora do estudo e usa o sub-pedido sem resultado do pack', () => {
    expect(textoMotivo('fora_do_estudo')).toMatch(/ainda não configurada/)
    expect(textoMotivo('fora_do_estudo')).not.toMatch(/Dose Verde/)
    expect(textoMotivo(undefined)).toMatch(/2 horas/)
    const pack = { _isPack: true, _packOrders: [{ resultado: {} }, { resultado: null, resultado_motivo: 'pendente' }] }
    expect(motivoDaLinha(pack)).toBe('pendente')
  })
})

describe('agregarCascata (dashboard, CUSTO-14)', async () => {
  const { agregarCascata, variacaoPct } = await import('src/utils/resultadoPedido')
  const linhas = [
    { canal: 'ml', conta: 'ml:A', data: '2026-11-01', pedidos: 2, gmv: 100, ads: 10, lucro_bruto: 20, custo_mao_de_obra: 2, custo_embalagens: 1, custo_produto: 30 },
    { canal: 'ml', conta: 'ml:A', data: '2026-11-02', pedidos: 1, gmv: 50, ads: 5, lucro_bruto: 5, custo_mao_de_obra: 1, custo_embalagens: 1, custo_produto: 20 },
    { canal: 'shopee', conta: 'shopee:7', data: '2026-11-01', pedidos: 1, gmv: 50, ads: 0, lucro_bruto: 15, custo_mao_de_obra: 1, custo_embalagens: 0, custo_produto: 10 },
  ]
  it('soma todas as contas, calcula margem e série diária', () => {
    const t = agregarCascata(linhas)
    expect(t.gmv).toBe(200)
    expect(t.lucro_bruto).toBe(40)
    expect(t.margem_contribuicao).toBeCloseTo(0.2)
    expect(t.preparacao).toBe(6)
    expect(t.diario).toEqual([
      { data: '2026-11-01', gmv: 150, imposto: 0, lucro_bruto: 35, ads: 10, pedidos: 3 },
      { data: '2026-11-02', gmv: 50, imposto: 0, lucro_bruto: 5, ads: 5, pedidos: 1 },
    ])
  })
  it('respeita contas e canais selecionados', () => {
    expect(agregarCascata(linhas, { contas: ['shopee:7'] }).gmv).toBe(50)
    expect(agregarCascata(linhas, { canais: ['ml'] }).pedidos).toBe(3)
    expect(agregarCascata(linhas, { canais: ['tiktokshop'] })).toBeNull()
  })
  it('variação percentual', () => {
    expect(variacaoPct(110, 100)).toBeCloseTo(10)
    expect(variacaoPct(10, 0)).toBeNull()
  })
})

describe('filtro de margem (CUSTO-15)', () => {
  it('converte % em fração e ignora vazio', async () => {
    const { paramsMargem } = await import('src/utils/resultadoPedido')
    expect(paramsMargem(10, 20)).toEqual({ margem_contribuicao__gte: 0.1, margem_contribuicao__lte: 0.2 })
    expect(paramsMargem(null, 0)).toEqual({ margem_contribuicao__lte: 0 })
    expect(paramsMargem('', undefined)).toEqual({})
    expect(paramsMargem(-5.5, null)).toEqual({ margem_contribuicao__gte: -0.055 })
  })
  it('texto e faixa ativa', async () => {
    const { textoFaixaMargem, faixaAtiva } = await import('src/utils/resultadoPedido')
    expect(textoFaixaMargem(10, null)).toBe('10% → ∞')
    expect(textoFaixaMargem(null, 0)).toBe('… → 0%')
    expect(textoFaixaMargem(null, null)).toBe('')
    expect(faixaAtiva(0, 10).label).toBe('0 a 10%')
    expect(faixaAtiva(5, 10)).toBeNull()
  })
})

describe('resultado da operação (CUSTO-11)', () => {
  it('desconta custo fixo e empréstimo da margem de contribuição', async () => {
    const { resultadoOperacao } = await import('src/utils/resultadoPedido')
    const r = resultadoOperacao({ gmv: 1000, lucro_bruto: 150, pedidos: 10 }, { operacional: 70, financeiro: 25 }, 1000)
    expect(r.custo_fixo).toBe(70)
    expect(r.lucro_operacional).toBe(80)
    expect(r.sobra_caixa).toBe(55)
    expect(r.lucro_operacional_pct).toBeCloseTo(0.08)
    expect(r.custo_fixo_por_pedido).toBe(7)
  })
  it('pondera o custo fixo pelo GMV quando a cascata é parte do total', async () => {
    const { resultadoOperacao, gmvTotalResumo } = await import('src/utils/resultadoPedido')
    const total = gmvTotalResumo([{ gmv: 300 }, { gmv: 700 }])
    expect(total).toBe(1000)
    const r = resultadoOperacao({ gmv: 300, lucro_bruto: 45, pedidos: 3 }, { operacional: 100, financeiro: 10 }, total)
    expect(r.peso).toBeCloseTo(0.3)
    expect(r.custo_fixo).toBe(30)
    expect(r.emprestimo).toBe(3)
    expect(r.sobra_caixa).toBe(12)
    expect(resultadoOperacao(null, { operacional: 1 }, 1)).toBeNull()
  })
})

describe('rótulo do período dos cards (CUSTO-16)', () => {
  it('reconhece os atalhos e formata o resto', async () => {
    const { textoPeriodo } = await import('src/utils/resultadoPedido')
    const agora = new Date(2026, 10, 16, 22, 30) // 16/11 22h30 local
    expect(textoPeriodo(null, null, agora)).toBe('Todo o período')
    expect(textoPeriodo('2026-11-16T00:00', '2026-11-16T23:59', agora)).toBe('Hoje')
    expect(textoPeriodo('2026-11-15', '2026-11-15', agora)).toBe('Ontem')
    expect(textoPeriodo('2026-11-09', '2026-11-16', agora)).toBe('Últimos 7 dias')
    expect(textoPeriodo('2026-10-17', '2026-11-16', agora)).toBe('Últimos 30 dias')
    expect(textoPeriodo('2026-11-01', '2026-11-16', agora)).toBe('Este mês')
    expect(textoPeriodo('2026-11-01', '2026-11-10', agora)).toBe('01/11 – 10/11')
    expect(textoPeriodo('2026-11-01', null, agora)).toBe('Desde 01/11')
  })
})

describe('diaLocalIso (CUSTO-16)', () => {
  it('formata a data local em YYYY-MM-DD', async () => {
    const { diaLocalIso } = await import('src/utils/resultadoPedido')
    expect(diaLocalIso(new Date(2026, 10, 7, 23, 50))).toBe('2026-11-07')
  })
})

describe('motivos e origens da margem para todos (MCS-7)', async () => {
  const {
    ROTA_PARAMETROS_MARGEM, motivoPedeConfiguracao, rotuloOrigemCustoPedido, rotuloOrigemImposto, textoMotivo,
  } = await import('src/utils/resultadoPedido')

  it('tem texto próprio para os motivos do MCS-1 e MCS-6', () => {
    expect(textoMotivo('sem_cnpj')).toMatch(/CNPJ/)
    expect(textoMotivo('regime_nao_declarado')).toMatch(/regime/)
    expect(textoMotivo('regime_nao_suportado')).toMatch(/fora do Simples/)
    expect(textoMotivo('sem_aliquota')).toMatch(/alíquota/)
  })

  it('só os motivos que se resolvem configurando levam à aba', () => {
    for (const m of ['fora_do_estudo', 'sem_cnpj', 'regime_nao_declarado', 'sem_aliquota']) {
      expect(motivoPedeConfiguracao(m)).toBe(true)
    }
    for (const m of ['regime_nao_suportado', 'nao_e_venda', 'antes_da_base', 'pendente', null]) {
      expect(motivoPedeConfiguracao(m)).toBe(false)
    }
    expect(ROTA_PARAMETROS_MARGEM).toEqual({ name: 'financeiro', params: { aba: 'parametros-margem' } })
  })

  it('rotula a origem de cada parâmetro do pedido', () => {
    expect(rotuloOrigemImposto('digitada')).toBe('alíquota digitada')
    expect(rotuloOrigemImposto('pgdas')).toBe('PGDAS')
    expect(rotuloOrigemImposto('')).toBe('')
    expect(rotuloOrigemCustoPedido('simples')).toBe('valor por pedido')
    expect(rotuloOrigemCustoPedido('detalhado')).toBe('detalhado')
    expect(rotuloOrigemCustoPedido('sem_valor')).toBe('não informado')
  })
})

describe('retirada dos sócios (MCS-10)', () => {
  it('sai depois da sobra de caixa e dá a sobra final, sem mexer na margem nem no lucro operacional', async () => {
    const { resultadoOperacao } = await import('src/utils/resultadoPedido')
    const r = resultadoOperacao({ gmv: 1000, lucro_bruto: 150, pedidos: 10 }, { operacional: 70, financeiro: 25, retirada: 40 }, 1000)
    expect(r.margem_contribuicao).toBe(150)
    expect(r.lucro_operacional).toBe(80)
    expect(r.sobra_caixa).toBe(55)
    expect(r.retirada).toBe(40)
    expect(r.sobra_final).toBe(15)
    expect(r.sobra_final_pct).toBeCloseTo(0.015)
  })
  it('sem retirada cadastrada, a sobra final é a sobra de caixa', async () => {
    const { resultadoOperacao } = await import('src/utils/resultadoPedido')
    const r = resultadoOperacao({ gmv: 1000, lucro_bruto: 150 }, { operacional: 70, financeiro: 25 }, 1000)
    expect(r.retirada).toBe(0)
    expect(r.sobra_final).toBe(r.sobra_caixa)
  })
  it('é ponderada pelo GMV como o resto do custo fixo', async () => {
    const { resultadoOperacao } = await import('src/utils/resultadoPedido')
    const r = resultadoOperacao({ gmv: 300, lucro_bruto: 45 }, { operacional: 100, financeiro: 10, retirada: 50 }, 1000)
    expect(r.retirada).toBe(15)
    expect(r.sobra_final).toBe(-3)
  })
})
