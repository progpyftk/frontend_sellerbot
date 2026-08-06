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
export const ANALYTICS_MODES = Object.freeze(['traffic', 'price', 'stock', 'combine'])

export const COMBINE_MODE = 'combine'

// Catálogo declarativo de métricas disponíveis no gráfico combinado.
// `axis` define a natureza da unidade: 'y' = contagem/quantidade (esquerda),
// 'y2' = percentual (direita), 'y3' = moeda (direita externa).
// `band: true` indica métrica binária renderizada como faixa de fundo, não como curva.
export const METRIC_CATALOG = [
  { key: 'visits', label: 'Visitas', category: 'traffic', axis: 'y', format: 'count', color: '#0284c7' },
  { key: 'orders_count', label: 'Pedidos', category: 'traffic', axis: 'y', format: 'count', color: '#0f766e' },
  { key: 'units_sold', label: 'Unidades vendidas', category: 'traffic', axis: 'y', format: 'count', color: '#eab308' },
  { key: 'conversion_rate', label: 'Conversão', category: 'traffic', axis: 'y2', format: 'percent', color: '#f59e0b' },
  { key: 'ads_cost', label: 'Ads (custo)', category: 'traffic', axis: 'y', format: 'currency', color: '#7c3aed', disabled: true, disabledHint: 'disponível quando o backend entregar ads_cost/ads_roas' },
  { key: 'price', label: 'Preço', category: 'price', axis: 'y3', format: 'currency', color: '#6366f1' },
  { key: 'original_price', label: 'Preço original', category: 'price', axis: 'y3', format: 'currency', color: '#a78bfa' },
  { key: 'gmv', label: 'GMV', category: 'price', axis: 'y3', format: 'currency', color: '#d97706' },
  { key: 'has_promotion', label: 'Com promoção', category: 'price', axis: null, format: 'boolean', color: '#fb923c', band: true },
  { key: 'available_quantity', label: 'Estoque informado', category: 'stock', axis: 'y', format: 'count', color: '#64748b' },
  { key: 'fulfillment_available_quantity', label: 'Full disponível', category: 'stock', axis: 'y', format: 'count', color: '#16a34a' },
  { key: 'fulfillment_total_quantity', label: 'Full total', category: 'stock', axis: 'y', format: 'count', color: '#94a3b8' },
]

export const COMBINE_CATEGORIES = Object.freeze([
  { value: 'traffic', label: 'Tráfego' },
  { value: 'price', label: 'Preço' },
  { value: 'stock', label: 'Estoque' },
])

export const COMBINE_DEFAULT_METRICS = Object.freeze(['price', 'conversion_rate', 'visits'])

export const metricByKey = (key) => METRIC_CATALOG.find((metric) => metric.key === key)

// Normaliza séries selecionadas para um intervalo comum (default 0–100) por série,
// para comparar formato/tendência entre métricas de unidades diferentes (ex.: preço x conversão).
// Retorna { [key]: number[] } alinhado a `rows`; valores ausentes/não numéricos viram lacuna (null).
export function normalizeForOverlay(rows, keys, { min = 0, max = 100 } = {}) {
  const result = {}
  for (const key of keys) {
    const numbers = rows.map((row) => {
      const raw = row?.[key]
      if (raw === null || raw === undefined) return null
      const number = Number(raw)
      return Number.isFinite(number) ? number : null
    })
    const finite = numbers.filter((value) => value !== null)
    const spread = finite.length ? Math.max(...finite) - Math.min(...finite) : 0
    const floor = finite.length ? Math.min(...finite) : null
    result[key] = numbers.map((value) => {
      if (value === null) return null
      if (floor === null || spread === 0) return min
      return min + ((value - floor) / spread) * (max - min)
    })
  }
  return result
}

// Resolve o range dos eixos: [0, 100] quando o modo combinado está normalizado, senão undefined (auto).
export function axisRangeFor(mode, normalized) {
  return mode === COMBINE_MODE && normalized ? [0, 100] : undefined
}

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
