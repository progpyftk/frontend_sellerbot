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
  { label: 'Maior markup', value: '-markup' },
  { label: 'Menor markup', value: 'markup' },
  { label: 'Maior margem', value: '-margin' },
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
  candidate: 'Candidata',
  started: 'Em campanha',
  pending: 'Pendente',
  active: 'Ativa',
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
      estimated_shipping_cost: numberOrNull(fin.estimated_shipping_cost),
      cmv_unit: numberOrNull(fin.cmv_unit),
      cmv_ambiguous: Boolean(fin.cmv_ambiguous),
      total_cost_unit: numberOrNull(fin.total_cost_unit),
      estimated_net_unit: numberOrNull(fin.estimated_net_unit),
      estimated_profit_unit: numberOrNull(fin.estimated_profit_unit),
      estimated_margin_pct: numberOrNull(fin.estimated_margin_pct),
      markup_pct: numberOrNull(fin.markup_pct),
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
  const { minMarginPct = null, minProfit = null, minMarkupPct = null } = thresholds
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
    if (has(minMarkupPct) && isNum(fin.markup_pct) && fin.markup_pct < Number(minMarkupPct)) {
      reasons.push('markup abaixo do alvo')
    }
    if (has(minMarginPct) && isNum(fin.estimated_margin_pct) && fin.estimated_margin_pct < Number(minMarginPct)) {
      reasons.push('margem abaixo do mínimo')
    }
    if (has(minProfit) && isNum(fin.estimated_profit_unit) && fin.estimated_profit_unit < Number(minProfit)) {
      reasons.push('lucro abaixo do mínimo')
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

// Melhor markup estimável de um anúncio. null se nenhuma proposta calculável.
export function bestMarkupPct (row) {
  const markups = row.promotions
    .filter((p) => p.financials.estimable)
    .map((p) => p.financials.markup_pct)
    .filter(isNum)
  return markups.length ? Math.max(...markups) : null
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

function sortAds (ads) {
  return [...ads].sort((a, b) => {
    const t = String(a.title).localeCompare(String(b.title), 'pt-BR')
    return t !== 0 ? t : String(a.variation_name || '').localeCompare(String(b.variation_name || ''), 'pt-BR')
  })
}

// Visão "Por anúncios": conta → anúncio/variação → promoções
export function groupByAccount (rows) {
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
    .map((g) => ({ ...g, ads: sortAds(g.ads), adCount: g.ads.length }))
    .sort(byNickname)
}

// Visão "Por SKU": conta → SKU → anúncios/variações → promoções
export function groupByAccountSku (rows) {
  const accounts = new Map()
  for (const row of rows) {
    if (!accounts.has(row.account_id)) accounts.set(row.account_id, new Map())
    const skuMap = accounts.get(row.account_id)
    const skuKey = row.sku || '__none__'
    if (!skuMap.has(skuKey)) skuMap.set(skuKey, [])
    skuMap.get(skuKey).push(row)
  }
  return [...accounts.entries()]
    .map(([accountId, skuMap]) => {
      const firstAd = skuMap.values().next().value[0]
      return {
        key: accountId,
        account_id: accountId,
        account_nickname: firstAd.account_nickname,
        skus: [...skuMap.entries()]
          .map(([skuKey, ads]) => ({
            key: `${accountId}::${skuKey}`,
            sku: skuKey === '__none__' ? null : skuKey,
            skuLabel: skuKey === '__none__' ? 'SKU não mapeado' : skuKey,
            ads: sortAds(ads),
            adCount: ads.length,
          }))
          .sort((a, b) => a.skuLabel.localeCompare(b.skuLabel, 'pt-BR')),
      }
    })
    .sort(byNickname)
}

// --- Filtros financeiros client-side (sobre linhas já carregadas) --------------
// Mantém propostas NÃO calculáveis visíveis (sinalizadas) — só o toggle
// "somente calculáveis" as remove. minMargin/minProfit descartam apenas
// propostas calculáveis que ficam abaixo do piso.
export function applyClientFilters (rows, { onlyEstimable = false, minMarginPct = null, minProfit = null, minMarkupPct = null } = {}) {
  const hasMargin = minMarginPct !== null && minMarginPct !== ''
  const hasProfit = minProfit !== null && minProfit !== ''
  const hasMarkup = minMarkupPct !== null && minMarkupPct !== ''
  return rows
    .map((row) => {
      let promotions = row.promotions
      if (onlyEstimable) {
        promotions = promotions.filter((p) => p.financials.estimable)
      }
      if (hasMarkup) {
        promotions = promotions.filter(
          (p) => !p.financials.estimable ||
            (isNum(p.financials.markup_pct) &&
              p.financials.markup_pct >= Number(minMarkupPct)),
        )
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

// --- Seleção (uma proposta por anúncio/variação) -----------------------------

export function buildSelectionEntry (row, promo) {
  return {
    key: row._key,
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
    financials: promo.financials,
    // objeto cru para o payload (verbatim do backend)
    rawFinancials: promo._rawFinancials,
  }
}

// Substitui (nunca acumula) a proposta escolhida para a mesma linha.
export function choosePromotion (selection, row, promo) {
  return { ...selection, [row._key]: buildSelectionEntry(row, promo) }
}

export function clearRow (selection, row) {
  const next = { ...selection }
  delete next[row._key]
  return next
}

export function selectedPromotionKey (selection, row) {
  return selection[row._key]?.promotion_key ?? null
}

// --- Resumo do lote -----------------------------------------------------------

export function summarizeSelection (entries, thresholds = {}) {
  const withEligibility = entries.map((entry) => {
    const reasons = blockingReasons(entry, thresholds)
    return { ...entry, eligible: reasons.length === 0, reasons }
  })
  const eligible = withEligibility.filter((e) => e.eligible)
  const blocked = withEligibility.filter((e) => !e.eligible)

  const pick = (list, path) => list.map((e) => e.financials[path]).filter(isNum)

  return {
    total: withEligibility.length,
    ads: new Set(withEligibility.map((e) => e.key)).size,
    skus: new Set(withEligibility.map((e) => e.sku).filter(Boolean)).size,
    accounts: new Set(withEligibility.map((e) => e.account_id)).size,
    avgPrice: avg(pick(eligible, 'proposed_price')),
    avgDiscountPct: avg(pick(eligible, 'discount_pct')),
    avgProfit: avg(pick(eligible, 'estimated_profit_unit')),
    avgMarginPct: avg(pick(eligible, 'estimated_margin_pct')),
    avgMarkupPct: avg(pick(eligible, 'markup_pct')),
    eligibleCount: eligible.length,
    blockedCount: blocked.length,
    eligible,
    blocked,
    entries: withEligibility,
  }
}

// --- Payload de ativação (contrato PROMO-11D, intocado) ----------------------

export function buildActivatePayload (eligibleEntries, { maxDiscountPct, fixedDiscountPct = null, markupTarget = null } = {}) {
  const payload = {
    confirmed: true,
    max_discount_pct: numberOrNull(maxDiscountPct),
    candidates: eligibleEntries.map((entry) => ({
      account_id: entry.account_id,
      item_id: entry.item_id,
      variation_id: entry.variation_id ?? null,
      promotion_id: entry.promotion_id,
      promotion_type: entry.promotion_type,
      financials: entry.rawFinancials ?? entry.financials,
    })),
  }
  const fixed = numberOrNull(fixedDiscountPct)
  if (fixed !== null) payload.fixed_discount_pct = fixed
  const markup = numberOrNull(markupTarget)
  if (markup !== null) payload.markup_target = markup
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
  for (const row of rows) {
    for (const promo of row.promotions) {
      promotions += 1
      if (promo.financials.estimable) estimable += 1
    }
  }
  return {
    ads: rows.length,
    skus: new Set(rows.map((r) => r.sku).filter(Boolean)).size,
    promotions,
    estimable,
    blocked: promotions - estimable,
  }
}
