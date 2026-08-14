import { describe, expect, it } from 'vitest'
import {
  activationStatusMeta,
  canSelectPromotion,
  getPromotionTypeMeta,
  normalizePromotion,
  promotionCountTotal,
} from 'src/utils/promotionCapabilities'

describe('promotion capability helpers', () => {
  it('uses the official campaign names instead of generic labels', () => {
    expect(getPromotionTypeMeta('DEAL').label).toBe('Campanha tradicional')
    expect(getPromotionTypeMeta('DOD').label).toBe('Oferta do dia')
    expect(getPromotionTypeMeta('PRICE_MATCHING_MELI_ALL').label).toBe('Preço competitivo ML')
  })

  it('keeps unknown promotions visible but read-only', () => {
    const promotion = normalizePromotion({ type: 'NEW_ML_TYPE', candidate_count: 3 })

    expect(promotion.can_manual_activate).toBe(false)
    expect(activationStatusMeta(promotion).label).toBe('Somente leitura')
    expect(canSelectPromotion(promotion)).toBe(false)
  })

  it('does not expose an action for automatic campaigns', () => {
    const promotion = normalizePromotion({
      type: 'PRICE_MATCHING_MELI_ALL',
      activation_mode: 'automatic',
      candidate_count: 4,
      can_manual_activate: false,
    })

    expect(activationStatusMeta(promotion).label).toContain('automaticamente')
    expect(canSelectPromotion(promotion)).toBe(false)
  })

  it('normalizes counts and preserves paused items in the total', () => {
    const promotion = normalizePromotion({
      type: 'DEAL',
      candidate_count: 2,
      active_count: 3,
      paused_count: 4,
    })

    expect(promotionCountTotal(promotion)).toBe(9)
    expect(canSelectPromotion(promotion)).toBe(true)
  })
})
