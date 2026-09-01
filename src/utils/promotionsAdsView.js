// ============================================================
// PROMO-12 — Lógica pura da visão "Promoções → Por anúncios"
// ============================================================
// Módulo isolado do fluxo legado "Por promoções". Só funções puras:
// normalização do contrato read-only de GET /mercadolivre/promotions-ads/,
// agrupamento hierárquico (conta → SKU → anúncio/variação → promoções),
// regra de seleção (no máximo UMA proposta por anúncio/variação),
// resumo do lote e montagem do payload de POST /promotions-ads/activate/.
//
// Nada aqui importa Vue nem toca em `/mercadolivre/promotions/` legado.

import { getPromotionTypeMeta } from './promotionCapabilities'

// --- Opções de filtro (server-side: status e tipo) -----------------------------

export const STATUS_OPTIONS = [
  { label: 'Candidata', value: 'candidate' },
  { label: 'Em campanha', value: 'started' },
  { label: 'Pendente', value: 'pending' },
]

export const PROMOTION_TYPE_OPTIONS = [
  { label: 'Campanha tradicional (DEAL)', value: 'DEAL' },
  { label: 'Campanha Smart (SMART)', value: 'SMART' },
  { label: 'Oferta relâmpago (LIGHTNING)', value: 'LIGHTNING' },
  { label: 'Desconto individual (PRICE_DISCOUNT)', value: 'PRICE_DISCOUNT' },
  { label: 'Oferta do dia (DOD)', value: 'DOD' },
  { label: 'Campanha do seller (SELLER_CAMPAIGN)', value: 'SELLER_CAMPAIGN' },
]

export const SORT_OPTIONS = [
  { label: 'Ordem padrão (anúncio)', value: null },
  { label: 'Maior margem', value: '-margin' },
  { label: 'Menor margem', value: 'margin' },
  { label: 'Maior lucro/un', value: '-profit' },
  { label: 'Menor lucro/un', value: 'profit' },
  { label: 'Maior desconto', value: '-discount' },
  { label: 'Maior preço', value: '-price' },
  { label: 'Menor preço', value: 'price' },
]

// Status que podem ser removidos (promoção viva, não candidata)
export const LIVE_STATUSES = ['started', 'pending', 'sync_requested']

const MISSING_INPUT_LABELS = {
  fee: 'tarifa ausente',
  shipping: 'frete ausente',
  cmv: 'CMV ausente',
  price: 'preço da promoção indefinido',
}

const STATUS_LABELS = {
  candidate: 'Disponível',
  started: 'Ativa',
  active: 'Ativa',
  pending: 'Processando',
  sync_requested: 'Processando',
}

const ACTIVE_STATUSES = ['started', 'active']
const PROCESSING_STATUSES = ['pending', 'sync_requested']

export function promotionActivity (promo) {
  if (ACTIVE_STATUSES.includes(promo.status)) return 'active'
  if (PROCESSING_STATUSES.includes(promo.status)) return 'processing'
  return 'available'
}

// Separa as promoções de um anúncio: já ativas × disponíveis para ativar.
export function splitPromotions (promotions = []) {
  const active = []
  const available = []
  const processing = []
  for (const p of promotions) {
    const a = promotionActivity(p)
    if (a === 'active') active.push(p)
    else if (a === 'processing') processing.push(p)
    else available.push(p)
  }
  return { active, available, processing }
}

// --- Helpers numéricos --------------------------------------------------------

export function numberOrNull (value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)

export function formatBRL (value) {
  const n = numberOrNull(value)
  if (n === null) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatPct (value, digits = 1) {
  const n = numberOrNull(value)
  if (n === null) return '—'
  return `${n.toFixed(digits).replace('.', ',')}%`
}

export function formatInt (value) {
  const n = numberOrNull(value)
  return n === null ? '0' : Math.round(n).toLocaleString('pt-BR')
}

export function statusLabel (status) {
  return STATUS_LABELS[status] || status || '—'
}

// --- Identidade de linha / proposta -----------------------------------------

export function rowKey (row) {
  return [row.account_id, row.item_id, row.variation_id ?? ''].join('::')
}

export function promotionKey (promo) {
  return (
    promo.promotion_id ||
    promo.offer_id ||
    `${promo.promotion_type || promo.type || 'PROMO'}:${promo.name || ''}`
  )
}

// --- Normalização do contrato ----------------------------------------------------

function normalizePromotion (raw) {
  const fin = raw.financials || {}
  const type = raw.promotion_type || raw.type || ''
  return {
    ...raw,
    _key: promotionKey(raw),
    promotion_id: raw.promotion_id ?? null,
    promotion_type: type,
    name: raw.name || getPromotionTypeMeta(type).label,
    typeLabel: getPromotionTypeMeta(type).label,
    status: raw.status || null,
    discount_pct: numberOrNull(raw.discount_pct ?? fin.discount_pct),
    price: numberOrNull(raw.price ?? fin.proposed_price),
    // capability pode não vir no contrato read-only atual; só bloqueia quando
    // explicitamente `false` — o backend continua sendo a autoridade final.
    can_manual_activate: raw.can_manual_activate ?? null,
    activation_block_reason: raw.activation_block_reason ?? null,
    financials: {
      estimable: Boolean(fin.estimable),
      missing_inputs: Array.isArray(fin.missing_inputs) ? fin.missing_inputs : [],
      reference_price: numberOrNull(fin.reference_price),
      proposed_price: numberOrNull(fin.proposed_price),
      seller_revenue: numberOrNull(fin.seller_revenue),
      discount_pct: numberOrNull(fin.discount_pct),
      coupon_unit: numberOrNull(fin.coupon_unit),
      estimated_sale_fee: numberOrNull(fin.estimated_sale_fee),
      sale_fee_pct: numberOrNull(fin.sale_fee_pct),
      sale_fee_fixed: numberOrNull(fin.sale_fee_fixed),
      estimated_shipping_cost: numberOrNull(fin.estimated_shipping_cost),
      cmv_unit: numberOrNull(fin.cmv_unit),
      cmv_ambiguous: Boolean(fin.cmv_ambiguous),
      total_cost_unit: numberOrNull(fin.total_cost_unit),
      estimated_net_unit: numberOrNull(fin.estimated_net_unit),
      estimated_profit_unit: numberOrNull(fin.estimated_profit_unit),
      estimated_margin_pct: numberOrNull(fin.estimated_margin_pct),
      price_range: fin.price_range || null,
    },
    // objeto financeiro cru, enviado verbatim no payload de ativação — o
    // backend revalida a aritmética contra estas chaves.
    _rawFinancials: raw.financials || null,
  }
}

export function normalizeRow (row, accountNames = {}) {
  const promotions = Array.isArray(row.promotions) ? row.promotions : []
  return {
    ...row,
    account_id: row.account_id,
    account_nickname:
      row.account_nickname || accountNames[row.account_id] || row.account_id,
    item_id: row.item_id,
    title: row.title || row.item_id,
    sku: row.sku || null,
    sku_ambiguous: Boolean(row.sku_ambiguous),
    variation_id: row.variation_id ?? null,
    variation_name: row.variation_name || null,
    current_price: numberOrNull(row.current_price),
    thumbnail: row.thumbnail || null,
    permalink: row.permalink || null,
    promotions: promotions.map(normalizePromotion),
    _key: rowKey(row),
  }
}

// --- Regra de bloqueio / elegibilidade ----------------------------------------

// `subject` = { financials, can_manual_activate, activation_block_reason }
// (serve tanto para uma promoção normalizada quanto para uma entrada de seleção)
export function blockingReasons (subject, thresholds = {}) {
  const fin = subject.financials || {}
  const { minMarginPct = null, minProfit = null } = thresholds
  const reasons = []
  const has = (v) => v !== null && v !== undefined && v !== ''

  if (!fin.estimable) {
    if (fin.missing_inputs && fin.missing_inputs.length) {
      for (const key of fin.missing_inputs) {
        reasons.push(MISSING_INPUT_LABELS[key] || key)
      }
    } else {
      reasons.push('proposta sem dados suficientes para cálculo')
    }
  } else {
    // piso rígido: prejuízo nunca ativa, com ou sem alvo definido.
    if ((isNum(fin.estimated_profit_unit) && fin.estimated_profit_unit < 0) ||
        (isNum(fin.estimated_margin_pct) && fin.estimated_margin_pct < 0)) {
      reasons.push('prejuízo — margem/lucro negativo')
    } else {
      if (has(minMarginPct) && isNum(fin.estimated_margin_pct) && fin.estimated_margin_pct < Number(minMarginPct)) {
        reasons.push('margem abaixo do mínimo')
      }
      if (has(minProfit) && isNum(fin.estimated_profit_unit) && fin.estimated_profit_unit < Number(minProfit)) {
        reasons.push('lucro abaixo do mínimo')
      }
    }
  }

  if (subject.can_manual_activate === false) {
    reasons.push(
      subject.activation_block_reason || 'promoção sem capacidade de ativação',
    )
  }
  return reasons
}

export function isEligible (subject, thresholds = {}) {
  return blockingReasons(subject, thresholds).length === 0
}

// Melhor margem estimável de um anúncio (para a linha-resumo). null se nenhuma.
export function bestMarginPct (row) {
  const margins = row.promotions
    .filter((p) => p.financials.estimable)
    .map((p) => p.financials.estimated_margin_pct)
    .filter(isNum)
  return margins.length ? Math.max(...margins) : null
}

export function rowState (row, thresholds = {}) {
  const hasEstimable = row.promotions.some((p) => p.financials.estimable)
  if (!row.promotions.length) return { label: 'Sem propostas', variant: 'slate' }
  if (!hasEstimable) return { label: 'Não calculável', variant: 'amber' }
  const anyEligible = row.promotions.some((p) => isEligible(p, thresholds))
  return anyEligible
    ? { label: 'Elegível', variant: 'green' }
    : { label: 'Sem proposta elegível', variant: 'amber' }
}

// --- Agrupamento ------------------------------------------------------------------

const byNickname = (a, b) =>
  String(a.account_nickname).localeCompare(String(b.account_nickname), 'pt-BR')

const byTitle = (a, b) => {
  const t = String(a.title).localeCompare(String(b.title), 'pt-BR')
  return t !== 0 ? t : String(a.variation_name || '').localeCompare(String(b.variation_name || ''), 'pt-BR')
}

// "Por SKU": ordena por SKU primeiro (anúncios do mesmo SKU ficam adjacentes),
// depois por título. SKU vazio vai para o fim.
const bySku = (a, b) => {
  const sa = a.sku || '￿'
  const sb = b.sku || '￿'
  const s = sa.localeCompare(sb, 'pt-BR')
  return s !== 0 ? s : byTitle(a, b)
}

function groupBy (rows, sorter) {
  const map = new Map()
  for (const row of rows) {
    if (!map.has(row.account_id)) {
      map.set(row.account_id, {
        key: row.account_id,
        account_id: row.account_id,
        account_nickname: row.account_nickname,
        ads: [],
      })
    }
    map.get(row.account_id).ads.push(row)
  }
  return [...map.values()]
    .map((g) => ({ ...g, ads: [...g.ads].sort(sorter), adCount: g.ads.length }))
    .sort(byNickname)
}

// Visão "Por anúncios": conta → anúncio/variação (ordenado por título).
export function groupByAccount (rows) {
  return groupBy(rows, byTitle)
}

// Visão "Por SKU": mesma estrutura, mas os anúncios são ordenados por SKU —
// o SKU é uma COLUNA, não um cabeçalho que agrupa/colapsa.
export function groupByAccountSku (rows) {
  return groupBy(rows, bySku)
}

// --- Filtros financeiros client-side (sobre linhas já carregadas) --------------
// Mantém propostas NÃO calculáveis visíveis (sinalizadas) — só o toggle
// "somente calculáveis" as remove. minMargin/minProfit descartam apenas
// propostas calculáveis que ficam abaixo do piso.
export function applyClientFilters (rows, { onlyEstimable = false, minMarginPct = null, minProfit = null } = {}) {
  const hasMargin = minMarginPct !== null && minMarginPct !== ''
  const hasProfit = minProfit !== null && minProfit !== ''
  return rows
    .map((row) => {
      let promotions = row.promotions
      if (onlyEstimable) {
        promotions = promotions.filter((p) => p.financials.estimable)
      }
      if (hasMargin) {
        promotions = promotions.filter(
          (p) => !p.financials.estimable ||
            (isNum(p.financials.estimated_margin_pct) &&
              p.financials.estimated_margin_pct >= Number(minMarginPct)),
        )
      }
      if (hasProfit) {
        promotions = promotions.filter(
          (p) => !p.financials.estimable ||
            (isNum(p.financials.estimated_profit_unit) &&
              p.financials.estimated_profit_unit >= Number(minProfit)),
        )
      }
      return { ...row, promotions }
    })
    .filter((row) => row.promotions.length > 0)
}

// --- Seleção (VÁRIAS promoções por anúncio, cada uma com seu desconto) --------

// Tipos cujo desconto é NEGOCIÁVEL pelo vendedor (têm faixa de preço). Nos demais
// (SMART, LIGHTNING, cupom, PRICE_MATCHING…) o ML fixa o preço — o % é read-only.
const NEGOTIABLE_TYPES = new Set(['DEAL', 'SELLER_CAMPAIGN', 'PRICE_DISCOUNT', 'DOD'])
// o ML dita o preço destes — o % é read-only mesmo que venha uma faixa (LIGHTNING
// recusa qualquer preço fora do sugerido com ERROR_CREDIBILITY).
const ML_PRICED_TYPES = new Set(['LIGHTNING', 'SMART', 'PRICE_MATCHING', 'PRICE_MATCHING_MELI_ALL', 'SELLER_COUPON_CAMPAIGN', 'UNHEALTHY_STOCK'])

export function discountEditable (promo) {
  if (ML_PRICED_TYPES.has(promo.promotion_type)) return false
  return NEGOTIABLE_TYPES.has(promo.promotion_type) || !!(promo.financials && promo.financials.price_range)
}

// Tipos cujo desconto de uma instância JÁ ATIVA pode ser editado (aumentado ou
// reduzido) — espelha `EDITABLE_ACTIVE_TYPES` no backend. O ML não tem "update":
// o backend remove a instância atual e reativa com o novo %, então só os tipos
// que o próprio SellerBot ativa diretamente (preço sob nosso controle) entram
// aqui. LIGHTNING fica de fora mesmo sendo ativação direta — o ML dita o preço.
const EDITABLE_ACTIVE_TYPES = new Set(['PRICE_DISCOUNT', 'DOD'])

export function canEditActiveDiscount (promo) {
  return EDITABLE_ACTIVE_TYPES.has(promo.promotion_type)
}

const round1 = (n) => Math.round(n * 10) / 10
const round2 = (n) => Math.round(n * 100) / 100

// % de desconto que o ML pede para entrar nessa promoção (o mínimo, nas faixas;
// o valor fixo, nos tipos que o ML precifica).
export function promotionMinDiscountPct (promo) {
  const fin = promo.financials || {}
  const ref = fin.reference_price
  const range = fin.price_range
  // tipos não editáveis: o % vem do próprio desconto do ML
  if (!discountEditable(promo)) {
    return numberOrNull(fin.discount_pct ?? promo.discount_pct)
  }
  if (range && isNum(range.max) && isNum(ref) && ref > 0) {
    return Math.max(0, round1((1 - range.max / ref) * 100)) // maior preço permitido = menor desconto
  }
  return numberOrNull(promo.discount_pct ?? fin.discount_pct)
}

// Faixa de desconto que o ML aceita para a promoção (só faz sentido nos editáveis).
export function discountBounds (promo) {
  const fin = promo.financials || {}
  const ref = fin.reference_price
  const range = fin.price_range
  const min = promotionMinDiscountPct(promo)
  let max = 90
  if (range && isNum(range.min) && isNum(ref) && ref > 0) {
    max = round1((1 - range.min / ref) * 100)
  }
  return { min: isNum(min) ? Math.max(1, min) : 1, max: Math.min(99, Math.max(max, isNum(min) ? min : 1)) }
}

// Recalcula o financeiro a um desconto arbitrário (preview no cliente; o backend
// revalida na ativação). Co-financiados: aproxima receita = preço.
export function financialsAtDiscount (base, pct) {
  const f = base || {}
  const ref = f.reference_price
  if (!isNum(ref) || !isNum(pct)) return { ...f }
  const price = round2(ref * (1 - pct / 100))
  let fee = null
  if (isNum(f.sale_fee_pct)) {
    fee = round2(price * f.sale_fee_pct / 100 + (isNum(f.sale_fee_fixed) ? f.sale_fee_fixed : 0))
  } else if (isNum(f.estimated_sale_fee) && isNum(f.proposed_price) && f.proposed_price > 0) {
    fee = round2(f.estimated_sale_fee * price / f.proposed_price)
  }
  const shipping = f.estimated_shipping_cost
  const cmv = f.cmv_unit
  const out = { ...f, proposed_price: price, seller_revenue: price, discount_pct: round1(pct) }
  if ([fee, shipping, cmv].every(isNum) && price > 0) {
    const net = round2(price - fee - shipping)
    const profit = round2(net - cmv)
    out.estimated_sale_fee = fee
    out.estimated_net_unit = net
    out.estimated_profit_unit = profit
    out.estimated_margin_pct = round1(profit / price * 100)
    out.total_cost_unit = round2(cmv + fee + shipping)
  }
  return out
}

export function selectionKey (row, promo) {
  return `${row._key}##${promo._key}`
}
export function isSelected (selection, row, promo) {
  return Boolean(selection[selectionKey(row, promo)])
}
export function selectedCountForRow (selection, row) {
  const prefix = `${row._key}##`
  return Object.keys(selection).filter((k) => k.startsWith(prefix)).length
}

function makeEntry (row, promo) {
  const editable = discountEditable(promo)
  const minPct = promotionMinDiscountPct(promo)
  const base = promo.financials
  return {
    key: selectionKey(row, promo),
    row_key: row._key,
    account_id: row.account_id,
    account_nickname: row.account_nickname,
    sku: row.sku,
    item_id: row.item_id,
    title: row.title,
    variation_id: row.variation_id ?? null,
    variation_name: row.variation_name,
    promotion_id: promo.promotion_id ?? null,
    promotion_type: promo.promotion_type,
    promotion_name: promo.name,
    promotion_key: promo._key,
    status: promo.status,
    can_manual_activate: promo.can_manual_activate ?? null,
    activation_block_reason: promo.activation_block_reason ?? null,
    discountEditable: editable,
    minDiscountPct: minPct,
    bounds: discountBounds(promo),
    chosenDiscountPct: minPct ?? null,
    _touched: false,
    _base: base,
    // ao marcar o checkbox NÃO recalcula nada — mostra os números que o backend
    // já devolveu. Só muda se o usuário digitar um % diferente do ofertado.
    financials: { ...base },
    rawFinancials: promo._rawFinancials,
  }
}

// compat: usado por testes antigos e por seleção single em outros pontos.
export const buildSelectionEntry = makeEntry

export function toggleSelection (selection, row, promo) {
  const key = selectionKey(row, promo)
  const next = { ...selection }
  if (next[key]) delete next[key]
  else next[key] = makeEntry(row, promo)
  return next
}

export function setSelectionDiscount (selection, key, pct) {
  const e = selection[key]
  if (!e || !e.discountEditable) return selection
  const p = numberOrNull(pct)
  // no % ofertado pelo ML → volta aos números originais do backend (linha estática);
  // qualquer outro % → simula no cliente (aproximação, sinalizada como "simulado").
  const atOffer = p == null || (isNum(e.minDiscountPct) && Math.abs(p - e.minDiscountPct) < 0.05)
  return {
    ...selection,
    [key]: {
      ...e,
      chosenDiscountPct: p,
      _touched: !atOffer,
      financials: atOffer ? { ...e._base } : financialsAtDiscount(e._base, p),
    },
  }
}

// Aplica um % a todas as entradas editáveis informadas (ação em massa).
export function bulkSetDiscount (selection, keys, pct) {
  let next = selection
  for (const k of keys) next = setSelectionDiscount(next, k, pct)
  return next
}

export function clearSelectionForRow (selection, row) {
  const prefix = `${row._key}##`
  const next = {}
  for (const [k, v] of Object.entries(selection)) if (!k.startsWith(prefix)) next[k] = v
  return next
}

// --- Resumo do lote -----------------------------------------------------------

export function summarizeSelection (entries, thresholds = {}) {
  const withEligibility = entries.map((entry) => {
    const reasons = blockingReasons(entry, thresholds)
    if (entry.discountEligible === false) reasons.unshift('desconto abaixo do mínimo do ML')
    return { ...entry, eligible: reasons.length === 0, reasons }
  })
  const eligible = withEligibility.filter((e) => e.eligible)
  const blocked = withEligibility.filter((e) => !e.eligible)

  const pick = (list, path) => list.map((e) => e.financials[path]).filter(isNum)

  return {
    total: withEligibility.length,
    promotions: withEligibility.length,
    ads: new Set(withEligibility.map((e) => e.row_key)).size,
    skus: new Set(withEligibility.map((e) => e.sku).filter(Boolean)).size,
    accounts: new Set(withEligibility.map((e) => e.account_id)).size,
    avgPrice: avg(pick(eligible, 'proposed_price')),
    avgDiscountPct: avg(pick(eligible, 'discount_pct')),
    avgProfit: avg(pick(eligible, 'estimated_profit_unit')),
    avgMarginPct: avg(pick(eligible, 'estimated_margin_pct')),
    eligibleCount: eligible.length,
    blockedCount: blocked.length,
    eligible,
    blocked,
    entries: withEligibility,
  }
}

// --- Payload de ativação (POST /promotions-ads/activate/) --------------------

export function buildActivatePayload (eligibleEntries, { marginTarget = null } = {}) {
  const candidates = eligibleEntries.map((entry) => {
    const c = {
      account_id: entry.account_id,
      item_id: entry.item_id,
      variation_id: entry.variation_id ?? null,
      promotion_id: entry.promotion_id,
      promotion_type: entry.promotion_type,
      financials: entry.rawFinancials ?? entry.financials,
    }
    const d = numberOrNull(entry.chosenDiscountPct)
    if (d !== null) c.discount_pct = d
    return c
  })
  const payload = { confirmed: true, candidates }
  // trava geral = maior desconto pedido (compat com a validação do backend)
  const maxD = Math.max(0, ...candidates.map((c) => c.discount_pct || 0))
  if (maxD > 0) payload.max_discount_pct = round1(maxD)
  const margin = numberOrNull(marginTarget)
  if (margin !== null) payload.margin_target = margin
  return payload
}

// --- Remoção de promoções ativas (múltiplas por anúncio) ---------------------

export function isRemovable (promo) {
  return LIVE_STATUSES.includes(promo.status)
}

export function removalKey (row, promo) {
  return `${row._key}##${promo._key}`
}

// Alterna uma promoção viva na seleção de remoção (N por anúncio).
export function toggleRemoval (removal, row, promo) {
  const key = removalKey(row, promo)
  const next = { ...removal }
  if (next[key]) {
    delete next[key]
  } else {
    next[key] = {
      key,
      row_key: row._key,
      account_id: row.account_id,
      account_nickname: row.account_nickname,
      sku: row.sku,
      item_id: row.item_id,
      title: row.title,
      variation_name: row.variation_name,
      promotion_id: promo.promotion_id ?? null,
      promotion_type: promo.promotion_type,
      promotion_name: promo.name,
      promotion_key: promo._key,
      status: promo.status,
      discount_pct: promo.financials?.discount_pct ?? promo.discount_pct ?? null,
    }
  }
  return next
}

export function isRemovalSelected (removal, row, promo) {
  return Boolean(removal[removalKey(row, promo)])
}

export function summarizeRemoval (entries) {
  return {
    total: entries.length,
    ads: new Set(entries.map((e) => e.row_key)).size,
    accounts: new Set(entries.map((e) => e.account_id)).size,
    byType: entries.reduce((acc, e) => {
      acc[e.promotion_type] = (acc[e.promotion_type] || 0) + 1
      return acc
    }, {}),
    entries,
  }
}

export function buildRemovePayload (entries) {
  return {
    confirmed: true,
    candidates: entries.map((e) => ({
      account_id: e.account_id,
      item_id: e.item_id,
      promotion_id: e.promotion_id,
      promotion_type: e.promotion_type,
    })),
  }
}

// Contadores do cabeçalho — sobre as linhas efetivamente carregadas.
export function headerMetrics (rows) {
  let promotions = 0
  let estimable = 0
  let active = 0
  let available = 0
  for (const row of rows) {
    for (const promo of row.promotions) {
      promotions += 1
      if (promo.financials.estimable) estimable += 1
      const a = promotionActivity(promo)
      if (a === 'active') active += 1
      else if (a === 'available') available += 1
    }
  }
  return {
    ads: rows.length,
    skus: new Set(rows.map((r) => r.sku).filter(Boolean)).size,
    promotions,
    active,
    available,
    estimable,
    blocked: promotions - estimable,
  }
}
