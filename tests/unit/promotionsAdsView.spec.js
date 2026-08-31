import { describe, expect, it } from 'vitest'
import {
  applyClientFilters,
  bestMarginPct,
  blockingReasons,
  buildActivatePayload,
  choosePromotion,
  clearRow,
  groupByAccount,
  groupByAccountSku,
  headerMetrics,
  normalizeRow,
  rowState,
  summarizeSelection,
} from 'src/utils/promotionsAdsView'

// --- Fixtures -----------------------------------------------------------------

function fin (over = {}) {
  return {
    reference_price: 100,
    proposed_price: 85,
    seller_revenue: 85,
    discount_pct: 15,
    estimated_sale_fee: 12,
    estimated_shipping_cost: 8,
    cmv_unit: 40,
    total_cost_unit: 60,
    estimated_net_unit: 65,
    estimated_profit_unit: 25,
    estimated_margin_pct: 29.4,
    estimable: true,
    missing_inputs: [],
    ...over,
  }
}

function rawRow (over = {}) {
  return {
    account_id: 'ACC-1',
    item_id: 'MLB123',
    title: 'Ureia 25kg',
    sku: 'UREIA-25',
    variation_id: null,
    variation_name: null,
    current_price: 100,
    promotions: [
      { promotion_id: 'P-SMART', promotion_type: 'SMART', status: 'candidate', name: 'SMART', price: 85, discount_pct: 15, financials: fin() },
      { promotion_id: 'P-DEAL', promotion_type: 'DEAL', status: 'candidate', name: 'DEAL', price: 80, discount_pct: 20, financials: fin({ proposed_price: 80, discount_pct: 20, estimated_profit_unit: 20, estimated_margin_pct: 25 }) },
    ],
    ...over,
  }
}

const ACCOUNT_NAMES = { 'ACC-1': 'MOGIVITTA', 'ACC-2': 'DOSEVERDE' }

// --- normalizeRow -----------------------------------------------------------

describe('normalizeRow', () => {
  it('injeta o nome da conta a partir do mapa e mantém o objeto financeiro cru', () => {
    const row = normalizeRow(rawRow(), ACCOUNT_NAMES)
    expect(row.account_nickname).toBe('MOGIVITTA')
    expect(row._key).toBe('ACC-1::MLB123::')
    expect(row.promotions[0]._rawFinancials).toEqual(fin())
    expect(row.promotions[0].typeLabel).toBe('Campanha Smart')
  })

  it('cai para o account_id quando não há nome mapeado', () => {
    const row = normalizeRow(rawRow({ account_id: 'ACC-9' }), ACCOUNT_NAMES)
    expect(row.account_nickname).toBe('ACC-9')
  })
})

// --- blocking / eligibility ------------------------------------------------

describe('blockingReasons', () => {
  it('sem bloqueio quando calculável e sem pisos', () => {
    const promo = normalizeRow(rawRow(), ACCOUNT_NAMES).promotions[0]
    expect(blockingReasons(promo)).toEqual([])
  })

  it('traduz missing_inputs para motivos legíveis', () => {
    const promo = normalizeRow(
      rawRow({ promotions: [{ promotion_id: 'X', promotion_type: 'DEAL', financials: fin({ estimable: false, missing_inputs: ['cmv', 'shipping'] }) }] }),
      ACCOUNT_NAMES,
    ).promotions[0]
    expect(blockingReasons(promo)).toEqual(['CMV ausente', 'frete ausente'])
  })

  it('aplica piso de margem e de lucro', () => {
    const promo = normalizeRow(rawRow(), ACCOUNT_NAMES).promotions[1] // margem 25, lucro 20
    expect(blockingReasons(promo, { minMarginPct: 27 })).toContain('margem abaixo do mínimo')
    expect(blockingReasons(promo, { minProfit: 22 })).toContain('lucro abaixo do mínimo')
    expect(blockingReasons(promo, { minMarginPct: 20, minProfit: 10 })).toEqual([])
  })

  it('aplica a margem alvo', () => {
    const promo = normalizeRow(rawRow({ promotions: [
      { promotion_id: 'X', promotion_type: 'DEAL', financials: fin({ estimated_margin_pct: 18 }) },
    ] }), ACCOUNT_NAMES).promotions[0]
    expect(blockingReasons(promo, { minMarginPct: 30 })).toContain('margem abaixo do mínimo')
    expect(blockingReasons(promo, { minMarginPct: 15 })).toEqual([])
  })

  it('bloqueia quando o backend marca can_manual_activate=false', () => {
    const promo = { financials: fin(), can_manual_activate: false, activation_block_reason: 'Conta não autorizada.' }
    expect(blockingReasons(promo)).toEqual(['Conta não autorizada.'])
  })
})

describe('bestMarginPct / rowState', () => {
  it('retorna a melhor margem estimável', () => {
    expect(bestMarginPct(normalizeRow(rawRow(), ACCOUNT_NAMES))).toBe(29.4)
  })

  it('marca não calculável quando nenhuma proposta é estimável', () => {
    const row = normalizeRow(rawRow({ promotions: [{ promotion_id: 'X', promotion_type: 'DEAL', financials: fin({ estimable: false, missing_inputs: ['cmv'] }) }] }), ACCOUNT_NAMES)
    expect(rowState(row).label).toBe('Não calculável')
    expect(bestMarginPct(row)).toBeNull()
  })
})

// --- agrupamento ---------------------------------------------------------------

describe('groupByAccount / groupByAccountSku', () => {
  const rows = [
    normalizeRow(rawRow({ item_id: 'MLB100', title: 'Zinco', sku: 'ZN-1' }), ACCOUNT_NAMES),
    normalizeRow(rawRow(), ACCOUNT_NAMES), // title 'Ureia 25kg', sku 'UREIA-25'
    normalizeRow(rawRow({ item_id: 'MLB456', title: 'Ureia Combo', sku: 'UREIA-25' }), ACCOUNT_NAMES),
    normalizeRow(rawRow({ account_id: 'ACC-2', item_id: 'MLB999', title: 'Cal', sku: 'CAL-10' }), ACCOUNT_NAMES),
  ]

  it('agrupa por conta', () => {
    const groups = groupByAccount(rows)
    expect(groups.map((g) => g.account_nickname)).toEqual(['DOSEVERDE', 'MOGIVITTA'])
    expect(groups.find((g) => g.account_id === 'ACC-1').adCount).toBe(3)
  })

  it('mesma estrutura da visão por anúncios, ordenada por SKU', () => {
    const groups = groupByAccountSku(rows)
    const mogi = groups.find((g) => g.account_id === 'ACC-1')
    expect(mogi.skus).toBeUndefined()
    expect(mogi.adCount).toBe(3)
    // SKU UREIA-25 (2 anúncios) vem antes de ZN-1
    expect(mogi.ads.map((a) => a.sku)).toEqual(['UREIA-25', 'UREIA-25', 'ZN-1'])
  })

  it('anúncio sem SKU vai para o fim', () => {
    const groups = groupByAccountSku([
      normalizeRow(rawRow({ item_id: 'MLB-A', sku: null }), ACCOUNT_NAMES),
      normalizeRow(rawRow({ item_id: 'MLB-B', sku: 'AAA-1' }), ACCOUNT_NAMES),
    ])
    expect(groups[0].ads.map((a) => a.sku)).toEqual(['AAA-1', null])
  })
})

// --- filtros client-side -----------------------------------------------------

describe('applyClientFilters', () => {
  const rows = [
    normalizeRow(rawRow({
      promotions: [
        { promotion_id: 'A', promotion_type: 'SMART', financials: fin({ estimated_margin_pct: 30, estimated_profit_unit: 25 }) },
        { promotion_id: 'B', promotion_type: 'DEAL', financials: fin({ estimated_margin_pct: 10, estimated_profit_unit: 5 }) },
        { promotion_id: 'C', promotion_type: 'DOD', financials: fin({ estimable: false, missing_inputs: ['cmv'] }) },
      ],
    }), ACCOUNT_NAMES),
  ]

  it('onlyEstimable remove propostas não calculáveis', () => {
    const out = applyClientFilters(rows, { onlyEstimable: true })
    expect(out[0].promotions.map((p) => p.promotion_id)).toEqual(['A', 'B'])
  })

  it('minMargin mantém não calculáveis mas corta calculáveis abaixo do piso', () => {
    const out = applyClientFilters(rows, { minMarginPct: 20 })
    expect(out[0].promotions.map((p) => p.promotion_id)).toEqual(['A', 'C'])
  })

  it('remove a linha inteira quando nenhuma proposta sobra', () => {
    const out = applyClientFilters(rows, { onlyEstimable: true, minMarginPct: 90 })
    expect(out).toEqual([])
  })
})

// --- seleção ----------------------------------------------------------------

describe('seleção exclusiva por anúncio', () => {
  const row = normalizeRow(rawRow(), ACCOUNT_NAMES)

  it('escolher outra proposta da mesma linha substitui, não acumula', () => {
    let sel = {}
    sel = choosePromotion(sel, row, row.promotions[0])
    sel = choosePromotion(sel, row, row.promotions[1])
    expect(Object.keys(sel)).toHaveLength(1)
    expect(sel[row._key].promotion_id).toBe('P-DEAL')
  })

  it('clearRow remove a seleção da linha', () => {
    let sel = choosePromotion({}, row, row.promotions[0])
    sel = clearRow(sel, row)
    expect(sel[row._key]).toBeUndefined()
  })

  it('variações do mesmo item_id são linhas independentes', () => {
    const v1 = normalizeRow(rawRow({ variation_id: 'V1', variation_name: 'Azul' }), ACCOUNT_NAMES)
    const v2 = normalizeRow(rawRow({ variation_id: 'V2', variation_name: 'Verde' }), ACCOUNT_NAMES)
    let sel = choosePromotion({}, v1, v1.promotions[0])
    sel = choosePromotion(sel, v2, v2.promotions[1])
    expect(Object.keys(sel)).toHaveLength(2)
  })
})

// --- resumo do lote --------------------------------------------------------

describe('summarizeSelection', () => {
  it('separa elegíveis de bloqueados e calcula médias sobre os elegíveis', () => {
    const row = normalizeRow(rawRow(), ACCOUNT_NAMES)
    const rowB = normalizeRow(rawRow({ account_id: 'ACC-2', item_id: 'MLB999', sku: 'CAL-10', promotions: [
      { promotion_id: 'P-X', promotion_type: 'DEAL', financials: fin({ estimable: false, missing_inputs: ['cmv'] }) },
    ] }), ACCOUNT_NAMES)
    let sel = choosePromotion({}, row, row.promotions[0])
    sel = choosePromotion(sel, rowB, rowB.promotions[0])

    const summary = summarizeSelection(Object.values(sel))
    expect(summary.total).toBe(2)
    expect(summary.eligibleCount).toBe(1)
    expect(summary.blockedCount).toBe(1)
    expect(summary.accounts).toBe(2)
    expect(summary.skus).toBe(2)
    expect(summary.avgMarginPct).toBeCloseTo(29.4)
    expect(summary.blocked[0].reasons).toEqual(['CMV ausente'])
  })

  it('reavalia elegibilidade quando o piso de margem muda', () => {
    const row = normalizeRow(rawRow(), ACCOUNT_NAMES)
    const sel = choosePromotion({}, row, row.promotions[1]) // margem 25
    expect(summarizeSelection(Object.values(sel), { minMarginPct: 30 }).eligibleCount).toBe(0)
    expect(summarizeSelection(Object.values(sel), { minMarginPct: 20 }).eligibleCount).toBe(1)
  })
})

// --- payload de ativação -------------------------------------------------------

describe('buildActivatePayload', () => {
  it('monta o contrato PROMO-11D só com os elegíveis e envia financials cru', () => {
    const row = normalizeRow(rawRow({ variation_id: 'V1', variation_name: 'Azul' }), ACCOUNT_NAMES)
    const sel = choosePromotion({}, row, row.promotions[0])
    const summary = summarizeSelection(Object.values(sel))
    const payload = buildActivatePayload(summary.eligible, { maxDiscountPct: 15 })

    expect(payload).toEqual({
      confirmed: true,
      max_discount_pct: 15,
      candidates: [{
        account_id: 'ACC-1',
        item_id: 'MLB123',
        variation_id: 'V1',
        promotion_id: 'P-SMART',
        promotion_type: 'SMART',
        financials: fin(),
      }],
    })
  })

  it('inclui fixed_discount_pct só quando informado', () => {
    expect(buildActivatePayload([], { maxDiscountPct: 20 })).not.toHaveProperty('fixed_discount_pct')
    expect(buildActivatePayload([], { maxDiscountPct: 20, fixedDiscountPct: 10 }).fixed_discount_pct).toBe(10)
  })

  it('inclui margin_target só quando informado', () => {
    expect(buildActivatePayload([], { maxDiscountPct: 20 })).not.toHaveProperty('margin_target')
    expect(buildActivatePayload([], { maxDiscountPct: 20, marginTarget: 30 }).margin_target).toBe(30)
  })
})

describe('margem no lote', () => {
  it('bestMarginPct pega a maior margem estimável', () => {
    const row = normalizeRow(rawRow({ promotions: [
      { promotion_id: 'A', promotion_type: 'DEAL', financials: fin({ estimated_margin_pct: 22 }) },
      { promotion_id: 'B', promotion_type: 'SMART', financials: fin({ estimated_margin_pct: 51 }) },
      { promotion_id: 'C', promotion_type: 'DOD', financials: fin({ estimable: false, missing_inputs: ['fee'] }) },
    ] }), ACCOUNT_NAMES)
    expect(bestMarginPct(row)).toBe(51)
  })

  it('summarizeSelection calcula avgMarginPct sobre os elegíveis', () => {
    const row = normalizeRow(rawRow(), ACCOUNT_NAMES)
    const sel = choosePromotion({}, row, row.promotions[0]) // margem 29.4 (fixture)
    expect(summarizeSelection(Object.values(sel)).avgMarginPct).toBeCloseTo(29.4)
  })
})

// --- métricas de cabeçalho ---------------------------------------------------

describe('headerMetrics', () => {
  it('conta anúncios, SKUs, promoções e quantas são calculáveis', () => {
    const rows = [
      normalizeRow(rawRow(), ACCOUNT_NAMES),
      normalizeRow(rawRow({ item_id: 'MLB456', sku: null, promotions: [
        { promotion_id: 'Z', promotion_type: 'DEAL', financials: fin({ estimable: false, missing_inputs: ['cmv'] }) },
      ] }), ACCOUNT_NAMES),
    ]
    expect(headerMetrics(rows)).toMatchObject({ ads: 2, skus: 1, promotions: 3, estimable: 2, blocked: 1 })
  })
})

// --- remoção de promoções --------------------------------------------------

import {
  buildRemovePayload,
  isRemovable,
  summarizeRemoval,
  toggleRemoval,
} from 'src/utils/promotionsAdsView'

describe('seleção de remoção (N por anúncio)', () => {
  const row = normalizeRow(rawRow({ promotions: [
    { promotion_id: 'P-ON1', promotion_type: 'DEAL', status: 'started', name: 'Ativa 1', financials: fin() },
    { promotion_id: 'P-ON2', promotion_type: 'SMART', status: 'started', name: 'Ativa 2', financials: fin() },
    { promotion_id: 'P-CAND', promotion_type: 'DOD', status: 'candidate', name: 'Candidata', financials: fin() },
  ] }), ACCOUNT_NAMES)

  it('isRemovable só para status vivo', () => {
    expect(isRemovable(row.promotions[0])).toBe(true)   // started
    expect(isRemovable(row.promotions[2])).toBe(false)  // candidate
  })

  it('toggleRemoval acumula e alterna várias promoções do mesmo anúncio', () => {
    let rem = {}
    rem = toggleRemoval(rem, row, row.promotions[0])
    rem = toggleRemoval(rem, row, row.promotions[1])
    expect(Object.keys(rem)).toHaveLength(2)
    rem = toggleRemoval(rem, row, row.promotions[0]) // desmarca
    expect(Object.keys(rem)).toHaveLength(1)
    expect(Object.values(rem)[0].promotion_id).toBe('P-ON2')
  })

  it('summarizeRemoval e buildRemovePayload', () => {
    let rem = toggleRemoval({}, row, row.promotions[0])
    rem = toggleRemoval(rem, row, row.promotions[1])
    const s = summarizeRemoval(Object.values(rem))
    expect(s).toMatchObject({ total: 2, ads: 1, accounts: 1, byType: { DEAL: 1, SMART: 1 } })
    expect(buildRemovePayload(Object.values(rem))).toEqual({
      confirmed: true,
      candidates: [
        { account_id: 'ACC-1', item_id: 'MLB123', promotion_id: 'P-ON1', promotion_type: 'DEAL' },
        { account_id: 'ACC-1', item_id: 'MLB123', promotion_id: 'P-ON2', promotion_type: 'SMART' },
      ],
    })
  })
})

// --- ativas × a ativar ----------------------------------------------------

import { promotionActivity, splitPromotions } from 'src/utils/promotionsAdsView'

describe('separação ativas / disponíveis', () => {
  const row = normalizeRow(rawRow({ promotions: [
    { promotion_id: 'ON', promotion_type: 'DEAL', status: 'started', financials: fin() },
    { promotion_id: 'AV1', promotion_type: 'SMART', status: 'candidate', financials: fin() },
    { promotion_id: 'AV2', promotion_type: 'LIGHTNING', status: 'candidate', financials: fin() },
    { promotion_id: 'PR', promotion_type: 'DOD', status: 'pending', financials: fin() },
  ] }), ACCOUNT_NAMES)

  it('promotionActivity classifica por status', () => {
    expect(promotionActivity(row.promotions[0])).toBe('active')
    expect(promotionActivity(row.promotions[1])).toBe('available')
    expect(promotionActivity(row.promotions[3])).toBe('processing')
  })

  it('splitPromotions separa os três grupos', () => {
    const s = splitPromotions(row.promotions)
    expect(s.active.map((p) => p.promotion_id)).toEqual(['ON'])
    expect(s.available.map((p) => p.promotion_id)).toEqual(['AV1', 'AV2'])
    expect(s.processing.map((p) => p.promotion_id)).toEqual(['PR'])
  })

  it('headerMetrics conta ativas e a ativar', () => {
    const m = headerMetrics([row])
    expect(m.active).toBe(1)
    expect(m.available).toBe(2)
  })
})
