/** Formatação e parâmetros do histórico; nunca recalcula valores históricos. */
export const fieldLabels = {
  base_price: 'Preço-base', promotion_price: 'Preço promocional', promotions: 'Promoção',
  status: 'Situação', logistics: 'Logística',
}
export const statusLabels = { active: 'Ativo', paused: 'Pausado', closed: 'Encerrado',
  under_review: 'Em revisão', inactive: 'Inativo', not_yet_active: 'Ainda não ativo', payment_required: 'Pagamento pendente' }
const logisticLabels = { fulfillment: 'Full', self_service: 'Flex', cross_docking: 'Coleta',
  drop_off: 'Postagem', xd_drop_off: 'Ponto de envio', default: 'Padrão' }

export function brazilDay(offset = 0, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const get = type => parts.find(p => p.type === type).value
  const day = new Date(`${get('year')}-${get('month')}-${get('day')}T12:00:00Z`)
  day.setUTCDate(day.getUTCDate() + offset)
  return day.toISOString().slice(0, 10)
}

export function initialFilters(query = {}) {
  const one = value => Array.isArray(value) ? value[0] : value
  const date = value => /^\d{4}-\d{2}-\d{2}$/.test(one(value) || '') ? one(value) : null
  return {
    date_from: date(query.date_from) || brazilDay(-6), date_to: date(query.date_to) || brazilDay(),
    account_id: /^\d+$/.test(one(query.account_id) || '') ? Number(one(query.account_id)) : null,
    search: String(one(query.search) || ''), promotion_name: String(one(query.promotion_name) || ''),
    changed_fields: String(one(query.changed_fields) || '').split(',').filter(f => f in fieldLabels || f === 'price'),
    status: String(one(query.status) || ''), logistics: String(one(query.logistics) || ''),
  }
}

export function requestParams(filters, pagination) {
  const params = { date_from: filters.date_from, date_to: filters.date_to,
    page: pagination.page, page_size: pagination.rowsPerPage,
    ordering: pagination.descending ? '-detected_at' : 'detected_at' }
  for (const key of ['account_id', 'search', 'promotion_name', 'status']) {
    if (filters[key]) params[key] = filters[key]
  }
  if (filters.changed_fields.length) params.changed_fields = [...new Set(filters.changed_fields.flatMap(
    field => field === 'price' ? ['base_price', 'promotion_price'] : [field]))].join(',')
  if (filters.logistics === 'full') params.is_full = true
  else if (filters.logistics === 'flex') params.is_flex = true
  else if (filters.logistics) params.logistic_type = filters.logistics
  return params
}

export function formatDate(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'Não disponível'
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo',
    dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value))
}

export function fieldText(entry, field) {
  if (!entry) return 'Não disponível'
  const value = entry.value
  if (field === 'base_price' || field === 'promotion_price') {
    if (value == null) return field === 'promotion_price' ? 'Sem promoção' : 'Não disponível'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
  }
  if (field === 'status') return statusLabels[value] || value || 'Não disponível'
  if (field === 'logistics') {
    if (!value) return 'Não disponível'
    const labels = [logisticLabels[value.logistic_type] || value.logistic_type]
    if (value.is_flex && value.logistic_type !== 'self_service') labels.push('Flex')
    return labels.filter(Boolean).join(' + ')
  }
  if (field === 'promotions') return value?.length
    ? value.map(p => `${p.name || p.id || p.type}${p.price != null ? ` (${fieldText({ value: p.price }, 'promotion_price')})` : ''}`).join('\n')
    : 'Sem promoção'
  return String(value ?? 'Não disponível')
}

export function safePermalink(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (url.hostname.endsWith('.mercadolivre.com.br') || url.hostname === 'mercadolivre.com.br') ? url.href : null
  } catch { return null }
}
