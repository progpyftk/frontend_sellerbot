const numberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const numberFormatter = new Intl.NumberFormat('pt-BR')
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const formatNumber = (value, options = {}) => {
  if (value === null || value === undefined || value === '') return '—'
  if (!Object.keys(options).length) return numberFormatter.format(Number(value))
  return new Intl.NumberFormat('pt-BR', options).format(Number(value))
}

export const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '—'
  return currencyFormatter.format(Number(value))
}

// Ads entra quando o endpoint de timeline passar a entregar ads_cost/ads_roas.
export const ANALYTICS_MODES = Object.freeze(['traffic', 'price', 'stock'])

export const formatPercent = (value, digits = 1) => {
  if (value === null || value === undefined || value === '') return '—'
  return `${formatNumber(value, { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`
}

export const normalizeInventory = (inventory = {}, isFull = false) => ({
  inventory_id: inventory.inventory_id || null,
  total_quantity: numberOrNull(inventory.total_quantity),
  available_quantity: numberOrNull(inventory.available_quantity),
  not_available_quantity: numberOrNull(inventory.not_available_quantity),
  status: inventory.status || (isFull ? 'unknown' : 'not_applicable'),
  observed_at: inventory.observed_at || null,
  source: inventory.source || null,
  error_code: inventory.error_code || null,
  error_message: inventory.error_message || null,
  not_available_detail: inventory.not_available_detail || null,
})

export const normalizeItem = (raw = {}) => {
  const isFull = Boolean(raw.is_full || raw.logistic_type === 'fulfillment')
  const listingStock = raw.listing_stock || {
    available_quantity: raw.available_quantity,
    observed_at: raw.last_synced_at || null,
    source: raw.available_quantity !== undefined ? 'mercadolivre_item' : null,
  }
  const inventory = normalizeInventory(raw.fulfillment_inventory || {}, isFull)
  const legacyMetrics = raw.metrics || {}

  return {
    ...raw,
    item_id: raw.item_id || raw.id,
    title: raw.title || raw.item_id || raw.id || 'Anúncio sem título',
    sku: raw.sku || null,
    account: raw.account || { id: raw.account_id, account_id: raw.account_id, nickname: raw.account_nickname },
    status: raw.status || 'unknown',
    logistic_type: raw.logistic_type || 'not_informed',
    is_full: isFull,
    listing_stock: {
      ...listingStock,
      available_quantity: numberOrNull(listingStock.available_quantity),
    },
    fulfillment_inventory: inventory,
    metrics: {
      total_visits: numberOrNull(legacyMetrics.total_visits ?? raw.total_visits) || 0,
      total_orders: numberOrNull(legacyMetrics.total_orders ?? raw.total_orders) || 0,
      total_units: numberOrNull(legacyMetrics.total_units ?? raw.total_units) || 0,
      total_gmv: numberOrNull(legacyMetrics.total_gmv ?? raw.total_gmv),
      avg_price: numberOrNull(legacyMetrics.avg_price ?? raw.avg_price),
      avg_conversion: numberOrNull(legacyMetrics.avg_conversion ?? raw.avg_conversion),
      observed_days: numberOrNull(legacyMetrics.observed_days) || 0,
    },
    data_quality: {
      days: raw.data_quality?.days || null,
      inventory_status: raw.data_quality?.inventory_status || inventory.status,
      partial: Boolean(raw.data_quality?.partial),
      legacy: Boolean(raw.data_quality?.legacy),
      observed_days: raw.data_quality?.observed_days ?? legacyMetrics.observed_days ?? 0,
      missing_days: raw.data_quality?.missing_days || [],
    },
  }
}

export const normalizeListResponse = (payload = {}) => ({
  items: (payload.items || payload.results || []).map(normalizeItem),
  pagination: {
    page: Number(payload.pagination?.page || payload.page || 1),
    page_size: Number(payload.pagination?.page_size || payload.page_size || 25),
    total: Number(payload.pagination?.total ?? payload.count ?? 0),
    pages: Number(payload.pagination?.pages || 1),
  },
  days: Number(payload.days || 30),
  partial: Boolean(payload.partial),
})

const chartValue = (trace, index) => {
  const value = trace?.y?.[index]
  return value === undefined ? null : numberOrNull(value)
}

export const normalizeTimelineResponse = (payload = {}) => {
  if (Array.isArray(payload.series)) {
    return {
      item: normalizeItem(payload.item || {}),
      series: payload.series,
      period: payload.period || {},
      quality: payload.quality || { observed_days: payload.series.length, missing_days: [], partial: false },
    }
  }

  // Adapter temporário para o chart legado, que já entrega séries Plotly.
  const traces = payload.chart?.data || []
  const dates = traces.find((trace) => trace.x?.length)?.x || []
  const byDate = dates.map((date, index) => {
    const point = { date }
    traces.forEach((trace) => {
      const name = String(trace.name || '').toLowerCase()
      if (name.includes('vis')) point.visits = chartValue(trace, index)
      else if (name.includes('pedido') || name.includes('venda')) point.orders_count = chartValue(trace, index)
      else if (name.includes('convers')) point.conversion_rate = chartValue(trace, index)
      else if (name.includes('pre')) point.price = chartValue(trace, index)
      else if (name.includes('estoque')) point.available_quantity = chartValue(trace, index)
    })
    return point
  })
  return {
    item: normalizeItem(payload.item || {}),
    series: byDate,
    period: payload.period || {},
    quality: { observed_days: byDate.length, missing_days: [], partial: false, legacy: true },
    legacy: true,
  }
}

export const normalizeCausalResponse = (payload = {}) => ({
  ...payload,
  resumo: payload.resumo || payload.summary || {},
  top_insights: payload.top_insights || payload.insights || [],
  correlacoes: payload.correlacoes || payload.correlations || {},
})

export const queryValue = (value, fallback = '') => {
  if (Array.isArray(value)) return value[0] || fallback
  return value || fallback
}
