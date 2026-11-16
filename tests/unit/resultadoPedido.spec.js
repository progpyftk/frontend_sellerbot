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
    expect(textoMotivo('fora_do_estudo')).toMatch(/fora do estudo/)
    expect(textoMotivo(undefined)).toMatch(/2 horas/)
    const pack = { _isPack: true, _packOrders: [{ resultado: {} }, { resultado: null, resultado_motivo: 'pendente' }] }
    expect(motivoDaLinha(pack)).toBe('pendente')
  })
})
