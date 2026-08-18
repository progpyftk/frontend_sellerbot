export const ACTIONS = {
  replenish_full: { label: 'Repor no Full', short: 'Reposição', icon: 'inventory', tone: 'urgent' },
  start_full: { label: 'Começar no Full', short: 'Novo no Full', icon: 'rocket_launch', tone: 'growth' },
  next_cycle: { label: 'Próximo ciclo', short: 'Próximo ciclo', icon: 'event_repeat', tone: 'next' },
  do_not_send: { label: 'Não enviar', short: 'Não enviar', icon: 'pause_circle', tone: 'hold' },
  reduce_exposure: { label: 'Reduzir exposição', short: 'Reduzir', icon: 'inventory_2', tone: 'reduce' },
  data_review: { label: 'Revisar dados', short: 'Revisar', icon: 'warning_amber', tone: 'review' },
}

export const STRATEGIES = {
  availability_defense: { label: 'Proteção de disponibilidade', icon: 'shield', tone: 'urgent' },
  balanced: { label: 'Equilíbrio', icon: 'balance', tone: 'balanced' },
  growth: { label: 'Crescimento controlado', icon: 'trending_up', tone: 'growth' },
  space_efficiency: { label: 'Eficiência de espaço', icon: 'warehouse', tone: 'reduce' },
  cautious: { label: 'Cautela por dados', icon: 'fact_check', tone: 'review' },
}

const REASONS = {
  below_protection_horizon: 'O estoque termina antes do próximo ciclo seguro.',
  controlled_first_full_lot: 'Bom sinal econômico para testar um primeiro lote no Full.',
  coverage_until_next_cycle: 'A cobertura atual permite aguardar a próxima onda.',
  coverage_sufficient: 'O estoque já cobre o horizonte planejado.',
  no_observed_demand: 'Não há demanda recente suficiente para enviar.',
  non_positive_contribution_margin: 'A margem de contribuição não sustenta novo estoque no Full.',
  contribution_margin_unavailable: 'A margem de contribuição ainda não está completa para esta decisão.',
  excess_full_coverage: 'Há estoque demais para o ritmo atual de vendas.',
  sku_missing: 'SKU ausente; não é possível confirmar o estoque físico.',
  full_inventory_missing_or_stale: 'O saldo Full está ausente ou desatualizado.',
  erp_stock_missing_or_stale: 'Confirme o saldo físico no ERP antes de separar.',
  erp_stock_unavailable: 'O ERP não possui saldo disponível para a necessidade.',
  full_uplift_not_assumed: 'O cálculo não presume aumento de venda por entrar no Full.',
}

export function actionMeta(action) {
  return ACTIONS[action] || { label: action || 'Sem ação', short: action || 'Sem ação', icon: 'help', tone: 'hold' }
}

export function strategyMeta(strategy) {
  return STRATEGIES[strategy] || STRATEGIES.balanced
}

export function reasonText(reason) {
  return REASONS[reason] || String(reason || 'Sem justificativa').replaceAll('_', ' ')
}

export function formatNumber(value, digits = 1) {
  if (value == null || value === '') return '—'
  return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: digits })
}

export function formatMoney(value) {
  if (value == null || value === '') return '—'
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
}

export function localISODate(value = new Date()) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function apiErrorMessage(error) {
  const payload = error?.response?.data
  if (typeof payload?.detail === 'string') return payload.detail
  if (payload && typeof payload === 'object') {
    const first = Object.values(payload).flat().find(Boolean)
    if (first) return String(first)
  }
  return 'Não foi possível concluir. Tente novamente em instantes.'
}

export function downloadPlanCsv(content, filename) {
  const blob = new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
