import { describe, expect, it } from 'vitest'
import {
  formatCurrency,
  normalizeItem,
  normalizeListResponse,
  normalizeTimelineResponse,
} from '../../src/utils/itemAnalytics.js'

describe('item analytics normalizers', () => {
  it('keeps listing stock separate from Full inventory', () => {
    const item = normalizeItem({
      item_id: 'MLB-1',
      title: 'Ureia',
      is_full: true,
      listing_stock: { available_quantity: 2, observed_at: '2026-08-04T10:00:00Z' },
      fulfillment_inventory: { total_quantity: 4, available_quantity: 2, status: 'fresh' },
    })

    expect(item.listing_stock.available_quantity).toBe(2)
    expect(item.fulfillment_inventory.total_quantity).toBe(4)
    expect(item.fulfillment_inventory.available_quantity).toBe(2)
    expect(item.data_quality.inventory_status).toBe('fresh')
  })

  it('preserves null inventory instead of displaying zero', () => {
    const item = normalizeItem({ item_id: 'MLB-2', is_full: true, fulfillment_inventory: { status: 'unknown' } })

    expect(item.fulfillment_inventory.available_quantity).toBeNull()
    expect(item.fulfillment_inventory.total_quantity).toBeNull()
    expect(item.fulfillment_inventory.status).toBe('unknown')
  })

  it('normalizes paginated and legacy list shapes', () => {
    const result = normalizeListResponse({
      results: [{ id: 'MLB-3', title: 'Produto', total_visits: 80, total_orders: 4 }],
      count: 1,
      page: 1,
      page_size: 25,
    })

    expect(result.items[0].item_id).toBe('MLB-3')
    expect(result.items[0].metrics.total_visits).toBe(80)
    expect(result.pagination.total).toBe(1)
  })

  it('normalizes timeline quality and legacy Plotly traces', () => {
    const canonical = normalizeTimelineResponse({
      series: [{ date: '2026-08-01', visits: 10 }],
      quality: { observed_days: 1, missing_days: ['2026-08-02'], partial: true },
    })
    const legacy = normalizeTimelineResponse({ chart: { data: [{ name: 'Visitas', x: ['2026-08-01'], y: [10] }] } })

    expect(canonical.quality.partial).toBe(true)
    expect(canonical.quality.missing_days).toHaveLength(1)
    expect(legacy.series[0]).toMatchObject({ date: '2026-08-01', visits: 10 })
    expect(legacy.legacy).toBe(true)
  })

  it('formats currency for Brazilian users', () => {
    expect(formatCurrency(1234.5)).toContain('1.234,50')
  })
})
