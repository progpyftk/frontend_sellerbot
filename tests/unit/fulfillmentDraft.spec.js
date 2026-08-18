import { describe, expect, it } from 'vitest'
import {
  apiErrorMessage,
  canReviewLines,
  createDefaultDates,
  decisionMeta,
  primaryDecisionReason,
  queueMeta,
  reasonLabel,
  sourceMeta,
} from 'src/utils/fulfillmentDraft'

describe('fulfillment draft UI helpers', () => {
  it('keeps official, SellerBot and manual sources visibly distinct', () => {
    expect(sourceMeta('official_ml_report').tone).toBe('official')
    expect(sourceMeta('sellerbot_observed_sales').tone).toBe('sellerbot')
    expect(sourceMeta('manual').tone).toBe('manual')
    expect(sourceMeta(null).label).toContain('não confirmada')
  })

  it('never presents a blocked line as reviewable', () => {
    const lines = [
      { decision_status: 'blocked', effective_quantity: 20 },
      { decision_status: 'review', effective_quantity: 0 },
    ]
    expect(canReviewLines(lines)).toBe(false)
    expect(canReviewLines([...lines, { decision_status: 'ready', effective_quantity: 6 }])).toBe(true)
  })

  it('translates operational blockers instead of exposing backend codes', () => {
    expect(reasonLabel('blocked_identity_package')).toBe('Embalagem incompleta')
    expect(reasonLabel('review_local_stock_missing')).toBe('Informe o estoque local')
    expect(decisionMeta('blocked').label).toBe('Bloqueado')
  })

  it('labels the automatic recommendation queues for the operator', () => {
    expect(queueMeta('send_now').label).toBe('Enviar agora')
    expect(queueMeta('prepare').label).toBe('Preparar')
    expect(reasonLabel('target_coverage_gap')).toContain('cobertura')
  })

  it('shows a warning when the blockers array exists but is empty', () => {
    const line = { blockers: [], warnings: ['review_local_stock_missing'] }
    expect(primaryDecisionReason(line)).toBe('review_local_stock_missing')
  })

  it('creates local calendar dates without UTC drift', () => {
    const dates = createDefaultDates(new Date(2026, 7, 18, 23, 30))
    expect(dates).toEqual({ dispatchDate: '2026-08-19', receiptDate: '2026-08-23' })
  })

  it('surfaces shadow mode as an actionable API message', () => {
    const error = { response: { data: { code: 'shadow_mode', detail: 'Exportação em validação.' } } }
    expect(apiErrorMessage(error)).toBe('Exportação em validação.')
  })
})
