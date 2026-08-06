import { describe, expect, it } from 'vitest'
import {
  ANALYTICS_MODES,
  COMBINE_MODE,
  METRIC_CATALOG,
  axisRangeFor,
  formatCurrency,
  metricByKey,
  normalizeForOverlay,
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

describe('combine chart catalog', () => {
  it('includes combine mode while preserving existing presets', () => {
    expect(ANALYTICS_MODES).toEqual(['traffic', 'price', 'stock', 'combine'])
    expect(COMBINE_MODE).toBe('combine')
  })

  it('assigns each metric to the axis matching its unit nature', () => {
    expect(metricByKey('available_quantity').axis).toBe('y')
    expect(metricByKey('visits').axis).toBe('y')
    expect(metricByKey('conversion_rate').axis).toBe('y2')
    expect(metricByKey('price').axis).toBe('y3')
    expect(metricByKey('gmv').axis).toBe('y3')
  })

  it('marks unavailable ads metric as disabled with a hint', () => {
    const ads = metricByKey('ads_cost')
    expect(ads.disabled).toBe(true)
    expect(ads.disabledHint).toBeTruthy()
  })

  it('routes every entry to a known category and format', () => {
    const categories = ['traffic', 'price', 'stock']
    const formats = ['count', 'percent', 'currency', 'boolean']
    METRIC_CATALOG.forEach((metric) => {
      expect(categories).toContain(metric.category)
      expect(formats).toContain(metric.format)
    })
  })
})

describe('normalizeForOverlay', () => {
  const rows = [
    { date: '2026-08-01', price: 10, conversion_rate: 5 },
    { date: '2026-08-02', price: 20, conversion_rate: 10 },
    { date: '2026-08-03', price: 30, conversion_rate: null },
  ]

  it('maps a series to the 0..100 range by default', () => {
    const result = normalizeForOverlay(rows, ['price'])
    expect(result.price).toEqual([0, 50, 100])
  })

  it('preserves gaps as null and honors a custom range', () => {
    const result = normalizeForOverlay(rows, ['conversion_rate'], { min: 0, max: 10 })
    expect(result.conversion_rate).toEqual([0, 10, null])
  })

  it('does not produce NaN for a constant series', () => {
    const flat = [{ price: 7 }, { price: 7 }, { price: 7 }]
    const result = normalizeForOverlay(flat, ['price'])
    result.price.forEach((value) => expect(Number.isNaN(value)).toBe(false))
  })
})

describe('axisRangeFor', () => {
  it('returns 0..100 only for normalized combine', () => {
    expect(axisRangeFor('combine', true)).toEqual([0, 100])
    expect(axisRangeFor('combine', false)).toBeUndefined()
    expect(axisRangeFor('traffic', true)).toBeUndefined()
  })
})
