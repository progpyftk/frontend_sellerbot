export const STEP_OPTIONS = [
  { name: 'health', label: 'Saúde', helper: 'Fontes e relatório', icon: 'health_and_safety' },
  { name: 'parameters', label: 'Parâmetros', helper: 'Datas e estoque local', icon: 'tune' },
  { name: 'review', label: 'Revisão', helper: 'Comparar e ajustar', icon: 'fact_check' },
  { name: 'execution', label: 'Execução', helper: 'Exportar e concluir', icon: 'local_shipping' },
]

const sourceDefinitions = {
  official_ml_inventory: { label: 'Dado oficial ML', tone: 'official', icon: 'verified' },
  official_ml_report: { label: 'Dado oficial ML', tone: 'official', icon: 'verified' },
  sellerbot_observed_sales: { label: 'Dado SellerBot', tone: 'sellerbot', icon: 'insights' },
  sellerbot_proxy: { label: 'Proxy SellerBot', tone: 'proxy', icon: 'query_stats' },
  sellerbot_proxy_low_confidence: { label: 'Proxy de baixa confiança', tone: 'proxy', icon: 'warning_amber' },
  manual: { label: 'Entrada manual', tone: 'manual', icon: 'edit_note' },
  manual_normalized: { label: 'Entrada manual', tone: 'manual', icon: 'edit_note' },
}

export function sourceMeta(source) {
  return sourceDefinitions[source] || { label: 'Fonte não confirmada', tone: 'unknown', icon: 'help_outline' }
}

export function decisionMeta(status) {
  return {
    ready: { label: 'Pronto para revisar', tone: 'ready', icon: 'check_circle' },
    review: { label: 'Requer revisão', tone: 'review', icon: 'rate_review' },
    blocked: { label: 'Bloqueado', tone: 'blocked', icon: 'block' },
  }[status] || { label: 'Sem avaliação', tone: 'unknown', icon: 'help_outline' }
}

export function healthMeta(status) {
  return {
    ready: { label: 'Saudável', tone: 'ready', icon: 'check_circle' },
    review: { label: 'Revisar', tone: 'review', icon: 'rate_review' },
    blocked: { label: 'Bloqueado', tone: 'blocked', icon: 'error' },
  }[status] || { label: 'Não verificado', tone: 'unknown', icon: 'help_outline' }
}

export function reasonLabel(reason) {
  return {
    blocked_identity_inventory: 'Inventory ID ausente',
    blocked_identity_sku: 'SKU ausente',
    blocked_identity_package: 'Embalagem incompleta',
    blocked_identity_variation: 'Variação não identificada',
    blocked_variation_demand_unavailable: 'Demanda ainda não separada por variação',
    blocked_data_inventory_missing: 'Inventário físico ausente',
    blocked_data_inventory_status: 'Inventário indisponível',
    blocked_data_inventory_stale: 'Inventário desatualizado',
    blocked_data_inventory_observed_at: 'Data do inventário ausente',
    blocked_listing_status: 'Anúncio fora de venda',
    blocked_eligibility: 'Produto não elegível',
    blocked_out_of_sale: 'Há unidades fora de venda',
    blocked_stock_age_limit: 'Tempo de estoque acima do limite',
    review_demand_insufficient: 'Menos de 7 dias válidos de demanda',
    review_demand_partial_windows: 'Histórico de 15/30 dias incompleto',
    review_demand_excluded_days: 'Dias sem estoque vendável foram excluídos',
    review_local_stock_missing: 'Informe o estoque local',
    review_capacity_unknown: 'Limite de espaço não informado',
    review_stock_age_unknown: 'Tempo de estoque não informado',
    review_stock_age_proxy: 'Tempo de estoque estimado por recepções',
    review_out_of_sale_unknown: 'Unidades fora de venda não confirmadas',
    review_eligibility_unknown: 'Elegibilidade não confirmada',
    manual_adjustment: 'Quantidade ajustada pelo operador',
  }[reason] || String(reason || 'Motivo não informado').replaceAll('_', ' ')
}

export function primaryDecisionReason(line = {}) {
  return line.blockers?.[0] || line.warnings?.[0] || null
}

export function createDefaultDates(today = new Date()) {
  const dispatch = new Date(today)
  dispatch.setDate(dispatch.getDate() + 1)
  const receipt = new Date(today)
  receipt.setDate(receipt.getDate() + 5)
  return { dispatchDate: localISODate(dispatch), receiptDate: localISODate(receipt) }
}

export function localISODate(value) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function normalizeAccounts(response) {
  const data = response?.data
  return Array.isArray(data) ? data : data?.results || []
}

export function apiErrorMessage(error) {
  const payload = error?.response?.data
  if (payload?.code === 'shadow_mode') return payload.detail
  if (typeof payload?.detail === 'string') return payload.detail
  if (payload && typeof payload === 'object') {
    const first = Object.values(payload).flat().find(Boolean)
    if (first) return String(first)
  }
  return 'Não foi possível concluir. Verifique os dados e tente novamente.'
}

export function canReviewLines(lines = []) {
  return lines.some(line => line.decision_status !== 'blocked' && Number(line.effective_quantity) > 0)
}

export function formatDecimal(value, digits = 1) {
  return value == null || value === '' ? '—' : Number(value).toLocaleString('pt-BR', { maximumFractionDigits: digits })
}

export function downloadCsv(content, filename) {
  const blob = new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
