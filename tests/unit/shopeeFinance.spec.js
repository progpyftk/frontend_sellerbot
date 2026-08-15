import { describe, expect, it } from 'vitest'

import { isDirectDeliveryCarrier, isEscrowReal, orderRevenue, revenueBasisLabel } from 'src/utils/shopeeFinance'

describe('shopee finance helpers', () => {
  it('requires a real escrow amount before treating an order as audited', () => {
    expect(isEscrowReal({ escrow_synced: true, escrow_amount: null })).toBe(false)
    expect(isEscrowReal({ escrow_sync_status: 'synced', escrow_amount: 0 })).toBe(true)
    expect(isEscrowReal({ escrow_sync_status: 'unavailable', escrow_amount: 50 })).toBe(false)
  })

  it('uses escrow for audited orders and shipping-adjusted estimate otherwise', () => {
    expect(orderRevenue({ escrow_sync_status: 'synced', escrow_amount: 50 })).toBe(50)
    expect(orderRevenue({ escrow_sync_status: 'synced', escrow_amount: 0 })).toBe(0)
    expect(orderRevenue({ total_amount: 70, shipping_fee: 10 })).toBe(60)
  })

  it('labels the revenue basis explicitly', () => {
    expect(revenueBasisLabel({ revenue_basis: 'mixed' })).toBe('período misto: escrow + estimativa')
    expect(revenueBasisLabel({ faturamento_note: 'misto' })).toBe('período misto: escrow + estimativa')
    expect(revenueBasisLabel({ faturamento_note: 'escrow' })).toBe('repasse real (escrow)')
  })

  it('recognizes both Shopee direct-delivery carrier names', () => {
    expect(isDirectDeliveryCarrier('Entrega Direta')).toBe(true)
    expect(isDirectDeliveryCarrier(' SHOPEE  ENTREGA DIRETA ')).toBe(true)
    expect(isDirectDeliveryCarrier('Shopee Xpress')).toBe(false)
  })
})
