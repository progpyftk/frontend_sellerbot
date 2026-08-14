const TYPE_META = {
  DEAL: { label: 'Campanha tradicional', color: 'orange-1', textColor: 'orange-9' },
  PRICE_DISCOUNT: { label: 'Desconto individual', color: 'amber-1', textColor: 'amber-9' },
  MARKETPLACE_CAMPAIGN: { label: 'Campanha cofinanciada', color: 'purple-1', textColor: 'purple-9' },
  DOD: { label: 'Oferta do dia', color: 'deep-orange-1', textColor: 'deep-orange-9' },
  LIGHTNING: { label: 'Oferta relâmpago', color: 'red-1', textColor: 'red-9' },
  PRE_NEGOTIATED: { label: 'Desconto pré-acordado', color: 'blue-1', textColor: 'blue-9' },
  UNHEALTHY_STOCK: { label: 'Liquidação Full', color: 'brown-1', textColor: 'brown-9' },
  SMART: { label: 'Campanha Smart', color: 'cyan-1', textColor: 'cyan-9' },
  PRICE_MATCHING: { label: 'Preço competitivo', color: 'teal-1', textColor: 'teal-9' },
  PRICE_MATCHING_MELI_ALL: { label: 'Preço competitivo ML', color: 'green-1', textColor: 'green-9' },
  SELLER_CAMPAIGN: { label: 'Campanha do seller', color: 'indigo-1', textColor: 'indigo-9' },
  SELLER_COUPON_CAMPAIGN: { label: 'Cupom do seller', color: 'pink-1', textColor: 'pink-9' },
  VOLUME: { label: 'Desconto por quantidade', color: 'blue-grey-1', textColor: 'blue-grey-9' },
}

const FALLBACK_CAPABILITIES = {
  DEAL: { activation_mode: 'price', can_manual_activate: true },
  PRICE_DISCOUNT: { activation_mode: 'price', can_manual_activate: true },
  SELLER_CAMPAIGN: { activation_mode: 'price', can_manual_activate: true },
  LIGHTNING: { activation_mode: 'price_stock', can_manual_activate: true },
  SMART: { activation_mode: 'offer_acceptance', can_manual_activate: true },
  PRICE_MATCHING: { activation_mode: 'offer_acceptance', can_manual_activate: true },
}

export function getPromotionTypeMeta(type) {
  return TYPE_META[type] || {
    label: type || 'Tipo não mapeado',
    color: 'grey-2',
    textColor: 'grey-8',
  }
}

export function normalizePromotion(promo = {}) {
  const type = promo.type || promo.promotion_type || ''
  const fallback = FALLBACK_CAPABILITIES[type] || {}
  const candidateCount = Number(promo.candidate_count || 0)
  const activeCount = Number(promo.active_count || 0)
  const pausedCount = Number(promo.paused_count || 0)

  return {
    ...promo,
    type,
    candidate_count: candidateCount,
    active_count: activeCount,
    paused_count: pausedCount,
    total_count: Number(promo.total_count ?? candidateCount + activeCount + pausedCount),
    activation_mode: promo.activation_mode || fallback.activation_mode || 'read_only',
    can_manual_activate: promo.can_manual_activate ?? fallback.can_manual_activate ?? false,
    can_auto_activate: promo.can_auto_activate ?? false,
    activation_block_reason: promo.activation_block_reason || null,
    boosted_offer: Boolean(promo.boosted_offer),
  }
}

export function canSelectPromotion(promo) {
  const normalized = normalizePromotion(promo)
  return normalized.can_manual_activate && normalized.candidate_count > 0 && !normalized.is_processing
}

export function activationStatusMeta(promo) {
  const normalized = normalizePromotion(promo)
  if (normalized.activation_mode === 'automatic') {
    return { label: 'Gerenciada automaticamente pelo ML', color: 'green-1', textColor: 'green-9', icon: 'autorenew' }
  }
  if (!normalized.can_manual_activate) {
    return { label: 'Somente leitura', color: 'blue-grey-1', textColor: 'blue-grey-8', icon: 'visibility' }
  }
  return null
}

export function promotionCountTotal(promo) {
  const normalized = normalizePromotion(promo)
  return normalized.candidate_count + normalized.active_count + normalized.paused_count
}
