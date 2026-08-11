<template>
  <q-page class="fulfillment-page">
    <header class="page-header">
      <div>
        <div class="eyebrow">MERCADO LIVRE · OPERAÇÃO</div>
        <h1>Gestão Full</h1>
        <p>Decida o próximo envio com estoque físico, ritmo de vendas e espaço disponível.</p>
      </div>
      <q-btn outline no-caps icon="refresh" label="Atualizar dados" :loading="loading" @click="load" />
    </header>

    <q-btn-toggle
      v-model="mode"
      class="mode-toggle"
      unelevated
      no-caps
      toggle-color="primary"
      :options="modeOptions"
      @update:model-value="changeMode"
    />

    <section v-if="mode === 'replenishment'" class="queue-grid" aria-label="Resumo das filas">
      <button
        v-for="card in queueCards"
        :key="card.key"
        class="queue-card"
        :class="[`queue-card--${card.tone}`, activeQueue === card.key && 'queue-card--active']"
        @click="setQueue(card.key)"
      >
        <span class="queue-icon"><q-icon :name="card.icon" size="18px" /></span>
        <span class="queue-copy"><strong>{{ overview.queues?.[card.key] ?? 0 }}</strong><span>{{ card.label }}</span></span>
        <q-icon name="arrow_forward" size="16px" class="queue-arrow" />
      </button>
    </section>

    <section v-else class="opportunity-summary" aria-label="Resumo das oportunidades">
      <button
        v-for="card in opportunityCards"
        :key="card.key"
        class="opportunity-card"
        :class="activeOpportunityStatus === card.key && 'opportunity-card--active'"
        @click="setOpportunityStatus(card.key)"
      >
        <strong>{{ overview.statuses?.[card.key] ?? 0 }}</strong>
        <span>{{ card.label }}</span>
      </button>
    </section>

    <div v-if="overview.partial" class="quality-alert">
      <q-icon name="visibility_off" size="18px" />
       <div><strong>{{ mode === 'opportunities' ? 'Qualidade da oportunidade exige revisão' : 'Saúde dos dados exige revisão' }}</strong><span>{{ mode === 'opportunities' ? 'Há itens sem referência Full, embalagem completa ou dias válidos suficientes.' : 'Há itens com inventário stale, classe de tamanho ausente ou demanda não qualificada.' }}</span></div>
       <q-btn flat dense no-caps label="Ver itens" @click="mode === 'opportunities' ? setOpportunityStatus('full_opportunity_conditional') : setQueue('prepare')" />
    </div>

    <section class="workspace-card">
      <div class="workspace-toolbar">
        <div><div class="section-kicker">{{ mode === 'replenishment' ? 'Fila operacional' : 'Avaliação de entrada' }}</div><h2>{{ workspaceTitle }}</h2></div>
        <q-btn flat dense no-caps icon="file_download" label="Exportar checklist" :disable="!rows.length || (mode === 'opportunities' && !filters.account_id)" @click="exportChecklist" />
      </div>

      <div class="filters">
        <q-input v-model="filters.search" dense outlined clearable label="Buscar anúncio ou SKU" @keyup.enter="resetAndLoad" />
        <q-select v-model="filters.account_id" dense outlined clearable emit-value map-options :options="accountOptions" label="Conta ML" @update:model-value="resetAndLoad" />
        <q-select v-model="filters.size_class" dense outlined clearable emit-value map-options :options="sizeOptions" label="Classe de tamanho" @update:model-value="resetAndLoad" />
        <q-btn unelevated color="primary" no-caps label="Aplicar filtros" :loading="loading" @click="resetAndLoad" />
      </div>

      <div v-if="error" class="state-panel state-panel--error">
        <q-icon name="cloud_off" size="34px" /><strong>Não foi possível carregar a Gestão Full</strong><span>{{ error }}</span>
        <q-btn outline no-caps label="Tentar novamente" @click="load" />
      </div>
      <div v-else-if="loading && !rows.length" class="state-panel"><q-spinner-dots color="primary" size="38px" /><span>Calculando filas com os últimos snapshots...</span></div>
      <div v-else-if="!rows.length" class="state-panel"><q-icon name="inventory_2" size="38px" /><strong>Nenhum anúncio nesta fila</strong><span>Ajuste os filtros ou atualize os dados sincronizados.</span></div>
      <template v-else>
        <div v-if="mode === 'replenishment'" class="desktop-table">
          <table>
            <thead><tr><th>Produto</th><th>Fila / motivo</th><th>Cobertura</th><th>Full disponível</th><th>Sugestão</th><th>Confiança</th><th></th></tr></thead>
            <tbody>
              <tr v-for="row in rows" :key="row.identity.item_id" @click="openDetail(row)">
                <td><div class="product-cell"><div class="product-avatar"><q-icon name="inventory_2" size="17px" /></div><div><strong>{{ row.identity.title || row.identity.item_id }}</strong><span>{{ row.identity.sku || 'Sem SKU' }} · {{ row.identity.account_id }}</span></div></div></td>
                <td><span class="decision-badge" :class="`decision-badge--${row.decision.queue}`">{{ queueLabel(row.decision.queue) }}</span><small>{{ reasonLabel(row.decision.reason) }}</small></td>
                <td><strong>{{ formatCoverage(row.coverage.days) }}</strong><small>{{ row.coverage.lead_time_days ? `${row.coverage.lead_time_days}d lead time` : 'Lead time a investigar' }}</small></td>
                <td><strong>{{ row.inventory.fulfillment_available ?? '—' }}</strong><small>de {{ row.inventory.fulfillment_total ?? '—' }} ocupadas</small></td>
                <td><strong>{{ row.coverage.final_suggestion ?? '—' }}</strong><small>{{ capacityNote(row) }}</small></td>
                <td><span class="confidence" :class="`confidence--${row.quality.confidence}`">{{ row.quality.confidence }}</span></td>
                <td><q-icon name="chevron_right" size="19px" color="grey-5" /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="desktop-table">
          <table>
            <thead><tr><th>Produto / conta</th><th>Demanda</th><th>Conversão / GMV</th><th>Embalagem</th><th>Elegibilidade</th><th>Quantidade</th><th>Status</th><th></th></tr></thead>
            <tbody>
              <tr v-for="row in rows" :key="row.identity.item_id" @click="openDetail(row)">
                <td><div class="product-cell"><div class="product-avatar product-avatar--opportunity"><q-icon name="trending_up" size="17px" /></div><div><strong>{{ row.identity.title || row.identity.item_id }}</strong><span>{{ row.identity.sku || 'Sem SKU' }} · {{ row.identity.account_id }}</span></div></div></td>
                <td><strong>{{ row.demand.units_sold_valid }} un.</strong><small>{{ row.demand.velocity_daily ?? '—' }} un./dia · {{ row.demand.missing_days }} dias ausentes</small></td>
                <td><strong>{{ formatPercent(row.demand.conversion) }}</strong><small>{{ formatMoney(row.demand.gmv_total) }} · tendência {{ formatRatio(row.demand.trend_ratio) }}</small></td>
                <td><strong>{{ row.identity.size_class || 'Desconhecida' }}</strong><small>{{ row.identity.package_confidence }} · {{ row.identity.package_source || 'sem fonte' }}</small></td>
                <td><span class="confidence" :class="eligibilityClass(row.eligibility.status)">{{ eligibilityLabel(row.eligibility.status) }}</span></td>
                <td><strong>{{ row.capacity?.final_units ?? row.capacity?.projected_initial_units ?? '—' }}</strong><small>{{ quantityNote(row) }}</small></td>
                <td><span class="decision-badge" :class="opportunityBadgeClass(row.decision.type)">{{ opportunityStatusLabel(row.decision.type) }}</span><small>{{ opportunityReasonLabel(row.decision.reason) }}</small></td>
                <td><q-icon name="chevron_right" size="19px" color="grey-5" /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="mode === 'replenishment'" class="mobile-list">
          <button v-for="row in rows" :key="row.identity.item_id" class="mobile-row" @click="openDetail(row)">
            <div class="mobile-top"><strong>{{ row.identity.title || row.identity.item_id }}</strong><span class="decision-badge" :class="`decision-badge--${row.decision.queue}`">{{ queueLabel(row.decision.queue) }}</span></div>
            <div class="mobile-meta"><span>{{ row.identity.sku || 'Sem SKU' }}</span><span>{{ formatCoverage(row.coverage.days) }}</span><span>{{ row.coverage.final_suggestion ?? '—' }} un.</span></div>
            <div class="mobile-reason">{{ reasonLabel(row.decision.reason) }} · {{ row.quality.confidence }}</div>
          </button>
        </div>
        <div v-else class="mobile-list">
          <button v-for="row in rows" :key="row.identity.item_id" class="mobile-row" @click="openDetail(row)">
            <div class="mobile-top"><strong>{{ row.identity.title || row.identity.item_id }}</strong><span class="decision-badge" :class="opportunityBadgeClass(row.decision.type)">{{ opportunityStatusLabel(row.decision.type) }}</span></div>
            <div class="mobile-meta"><span>{{ row.identity.account_id }}</span><span>{{ row.demand.velocity_daily ?? '—' }} un./dia</span><span>{{ row.capacity?.final_units ?? row.capacity?.projected_initial_units ?? '—' }} un.</span></div>
            <div class="mobile-reason">{{ opportunityReasonLabel(row.decision.reason) }} · {{ eligibilityLabel(row.eligibility.status) }}</div>
          </button>
        </div>
      </template>
      <div v-if="rows.length" class="results-footer">
        <span>Mostrando {{ rows.length }} de {{ pagination.total || rows.length }}</span>
        <q-btn v-if="rows.length < pagination.total" flat dense no-caps label="Mostrar mais" :loading="loading" @click="loadMore" />
      </div>
    </section>

    <q-dialog v-model="detailOpen" maximized transition-show="slide-left" transition-hide="slide-right">
      <q-card class="detail-card">
        <q-card-section class="detail-header"><div><div class="eyebrow">{{ mode === 'replenishment' ? 'DETALHE DA RECOMENDAÇÃO' : 'DETALHE DA OPORTUNIDADE' }}</div><h2>{{ selected?.identity?.title }}</h2><span>{{ selected?.identity?.item_id }} · {{ selected?.identity?.sku || 'Sem SKU' }} · {{ selected?.identity?.account_id }}</span></div><q-btn flat round icon="close" v-close-popup /></q-card-section>
        <q-card-section v-if="selected && mode === 'replenishment'" class="detail-body">
          <div class="detail-decision" :class="`detail-decision--${selected.decision.queue}`"><div><span>Próxima ação</span><strong>{{ actionLabel(selected.decision.action) }}</strong></div><div><span>Motivo</span><strong>{{ reasonLabel(selected.decision.reason) }}</strong></div><div><span>Quantidade sugerida</span><strong>{{ selected.coverage.final_suggestion ?? 'Indisponível' }}</strong></div></div>
          <div class="detail-grid"><div class="metric-card"><span>Estoque Full físico</span><strong>{{ selected.inventory.fulfillment_available ?? '—' }}</strong><small>Disponível · anunciado: {{ selected.inventory.listing_available ?? '—' }}</small></div><div class="metric-card"><span>Cobertura estimada</span><strong>{{ formatCoverage(selected.coverage.days) }}</strong><small>{{ selected.coverage.band }}</small></div><div class="metric-card"><span>Velocidade válida</span><strong>{{ selected.demand.velocity_daily ?? '—' }}</strong><small>{{ selected.demand.valid_days }} dias observados</small></div><div class="metric-card"><span>Classe / confiança</span><strong>{{ selected.identity.size_class || 'A classificar' }}</strong><small>{{ selected.quality.confidence }}</small></div></div>
          <div v-if="selected.quality.warnings?.length" class="detail-warning"><q-icon name="info" /> {{ selected.quality.warnings.join(' · ') }}</div>
          <div class="detail-section"><div class="section-kicker">Por que esta recomendação?</div><p>{{ selected.decision.explanation }}</p></div>
          <div v-if="timeline?.series?.length" class="detail-section"><div class="section-kicker">Últimos snapshots</div><div class="timeline-list"><div v-for="point in timeline.series.slice(-7).reverse()" :key="point.date"><span>{{ point.date }}</span><strong>{{ point.fulfillment_available_quantity ?? '—' }} un.</strong><span>{{ point.units_sold }} vendidas</span></div></div></div>
           <div v-if="operations?.operations?.length" class="detail-section"><div class="section-kicker">Operações recentes</div><div class="operation-list"><div v-for="operation in operations.operations.slice(0, 6)" :key="operation.id"><span>{{ operation.operation_type }}</span><small>{{ operation.occurred_at }} · {{ operation.quantity ?? '—' }} un.</small></div></div></div>
         </q-card-section>
        <q-card-section v-else-if="selected" class="detail-body">
          <div class="detail-decision detail-decision--prepare"><div><span>Status</span><strong>{{ opportunityStatusLabel(selected.decision.type) }}</strong></div><div><span>Elegibilidade</span><strong>{{ eligibilityLabel(selected.eligibility.status) }}</strong></div><div><span>Quantidade inicial</span><strong>{{ selected.capacity.projected_initial_units ?? 'Indisponível' }}</strong></div></div>
          <div class="detail-grid"><div class="metric-card"><span>Unidades vendidas</span><strong>{{ selected.demand.units_sold_valid }}</strong><small>{{ selected.demand.valid_days }} dias válidos · {{ selected.demand.missing_days }} ausentes</small></div><div class="metric-card"><span>Velocidade diária</span><strong>{{ selected.demand.velocity_daily ?? '—' }}</strong><small>Meta de {{ selected.capacity.target_days }} dias</small></div><div class="metric-card"><span>Conversão / GMV</span><strong>{{ formatPercent(selected.demand.conversion) }}</strong><small>{{ formatMoney(selected.demand.gmv_total) }}</small></div><div class="metric-card"><span>Capacidade restante</span><strong>{{ selected.capacity.remaining_capacity ?? '—' }}</strong><small>{{ selected.identity.size_class }} · {{ selected.quality.confidence }}</small></div></div>
          <div class="detail-section"><div class="section-kicker">Embalagem e fonte</div><p>{{ packageDescription(selected) }}</p></div>
          <div class="detail-section"><div class="section-kicker">Por que esta oportunidade?</div><p>{{ selected.decision.explanation }}</p><ul class="evidence-list"><li v-for="evidence in selected.decision.evidence" :key="evidence.metric"><strong>{{ evidence.metric }}</strong><span>{{ evidence.value ?? '—' }} · {{ evidence.source }}</span></li></ul></div>
          <div v-if="selected.eligibility.limitations?.length" class="detail-warning"><q-icon name="info" /> {{ selected.eligibility.limitations.join(' · ') }}</div>
          <div v-if="timeline?.series?.length" class="detail-section"><div class="section-kicker">Snapshots usados</div><div class="timeline-list"><div v-for="point in timeline.series.slice(-7).reverse()" :key="point.date"><span>{{ point.date }}</span><strong>{{ point.units_sold }} vendidas</strong><span>{{ formatMoney(point.gmv) }}</span></div></div></div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import MercadoLivreService from 'src/services/MercadoLivreService'

const $q = useQuasar()
const loading = ref(false)
const error = ref('')
const overview = ref({ queues: {}, partial: false })
const rows = ref([])
const accounts = ref([])
const mode = ref('replenishment')
const activeQueue = ref('all')
const activeOpportunityStatus = ref('all')
const selected = ref(null)
const detailOpen = ref(false)
const timeline = ref(null)
const operations = ref(null)
const filters = ref({ search: '', account_id: '', size_class: null })
const page = ref(1)
const pagination = ref({ total: 0, pages: 0 })
let loadSequence = 0
let detailSequence = 0
const modeOptions = [
  { label: 'Reposição Full', value: 'replenishment' },
  { label: 'Oportunidades para entrar no Full', value: 'opportunities' },
]
const opportunityCards = [
  { key: 'all', label: 'Todas as oportunidades' },
  { key: 'full_opportunity', label: 'Prontas para avaliar' },
  { key: 'full_opportunity_conditional', label: 'Condicionais' },
  { key: 'full_opportunity_insufficient_data', label: 'Dados insuficientes' },
  { key: 'full_opportunity_not_now', label: 'Não agora' },
]
const queueCards = [
  { key: 'send_now', label: 'Enviar agora', icon: 'local_shipping', tone: 'urgent' },
  { key: 'prepare', label: 'Preparar envio', icon: 'inventory_2', tone: 'prepare' },
  { key: 'do_not_send', label: 'Não enviar agora', icon: 'pause_circle', tone: 'quiet' },
  { key: 'cd_pending', label: 'Pendências do CD', icon: 'report_problem', tone: 'pending' },
]
const sizeOptions = [{ label: 'Pequenos / médios', value: 'small_medium' }, { label: 'Grandes / extragrandes', value: 'large_xlarge' }]

const accountOptions = computed(() => accounts.value.map(account => ({ label: `${account.account_nickname} (${account.account_id})`, value: account.account_id })))
const workspaceTitle = computed(() => {
  if (mode.value === 'opportunities') return activeOpportunityStatus.value === 'all' ? 'Todas as oportunidades' : opportunityStatusLabel(activeOpportunityStatus.value)
  return activeQueue.value === 'all' ? 'Todos os anúncios' : queueLabel(activeQueue.value)
})
function query() {
  const filtersQuery = {
    ...filters.value,
    ...(mode.value === 'replenishment'
      ? { account: filters.value.account_id }
      : { account_id: filters.value.account_id }),
  }
  if (mode.value === 'opportunities' && activeOpportunityStatus.value !== 'all') filtersQuery.status = activeOpportunityStatus.value
  if (mode.value === 'replenishment' && activeQueue.value !== 'all') filtersQuery.queue = activeQueue.value
  if (mode.value === 'replenishment') delete filtersQuery.account_id
  return { ...filtersQuery, page: 1, page_size: 100 }
}
function summaryQuery() {
  const params = { page: 1, page_size: 100 }
  if (filters.value.account_id) {
    params[mode.value === 'replenishment' ? 'account' : 'account_id'] = filters.value.account_id
  }
  return params
}
function resetAndLoad() {
  page.value = 1
  load()
}
async function loadAccounts() {
  try {
    const response = await MercadoLivreService.listAccounts()
    accounts.value = Array.isArray(response.data) ? response.data : response.data?.results || []
  } catch { accounts.value = [] }
}
async function load() {
  const sequence = ++loadSequence
  const append = page.value > 1
  loading.value = true; error.value = ''
  if (!append) {
    rows.value = []
    overview.value = mode.value === 'opportunities' ? { statuses: {}, partial: false } : { queues: {}, partial: false }
  }
  try {
    const opportunity = mode.value === 'opportunities'
    const endpoint = opportunity ? MercadoLivreService.getFulfillmentOpportunities : MercadoLivreService.getFulfillmentRecommendations
    const [summaryResponse, listResponse] = opportunity
      ? await Promise.all([endpoint(summaryQuery()), endpoint(query())])
      : await Promise.all([MercadoLivreService.getFulfillmentOverview(summaryQuery()), endpoint(query())])
    if (sequence !== loadSequence) return
    overview.value = summaryResponse.data || (opportunity ? { statuses: {}, partial: false } : { queues: {}, partial: false })
    const nextRows = listResponse.data?.items || []
    rows.value = append ? [...rows.value, ...nextRows] : nextRows
    pagination.value = listResponse.data?.pagination || { total: rows.value.length, pages: 1 }
  } catch (err) {
    if (sequence !== loadSequence) return
    error.value = err?.response?.data?.detail || 'Verifique a conexão e tente novamente.'
    if (!append) rows.value = []
    if (append) page.value = Math.max(1, page.value - 1)
  } finally {
    if (sequence === loadSequence) loading.value = false
  }
}
function loadMore() { page.value += 1; load() }
function setQueue(queue) { activeQueue.value = queue; resetAndLoad() }
function setOpportunityStatus(status) { activeOpportunityStatus.value = status; resetAndLoad() }
function changeMode() {
  activeQueue.value = 'all'
  activeOpportunityStatus.value = 'all'
  page.value = 1
  detailSequence += 1
  detailOpen.value = false
  selected.value = null
  load()
}
async function openDetail(row) {
  const sequence = ++detailSequence
  const itemId = row.identity.item_id
  selected.value = row; detailOpen.value = true; timeline.value = null; operations.value = null
  try {
    if (mode.value === 'opportunities') {
      const [detailResponse, timelineResponse] = await Promise.all([MercadoLivreService.getFulfillmentOpportunity(row.identity.item_id, { days: 60 }), MercadoLivreService.getFulfillmentOpportunityTimeline(row.identity.item_id, { days: 60 })])
      if (sequence !== detailSequence || selected.value?.identity?.item_id !== itemId) return
      selected.value = detailResponse.data || row; timeline.value = timelineResponse.data
    } else {
      const [timelineResponse, operationsResponse] = await Promise.all([MercadoLivreService.getFulfillmentTimeline(row.identity.item_id, { days: 30 }), MercadoLivreService.getFulfillmentOperations(row.identity.item_id)])
      if (sequence !== detailSequence || selected.value?.identity?.item_id !== itemId) return
      timeline.value = timelineResponse.data; operations.value = operationsResponse.data
    }
  } catch { /* Resumo segue disponível se o histórico falhar. */ }
}
function exportChecklist() {
  const header = ['Conta', 'Tipo', 'SKU', 'Variacao', 'Quantidade projetada', 'Quantidade final', 'Classe', 'Elegibilidade', 'Prioridade', 'Motivo', 'Confianca', 'Calculado em']
  const lines = rows.value.filter(row => Number(mode.value === 'opportunities' ? (row.capacity?.final_units ?? row.capacity?.projected_initial_units) : row.coverage?.final_suggestion) > 0).map(row => [row.identity.account_id, mode.value === 'opportunities' ? row.decision.type : 'full_replenishment', row.identity.sku || row.identity.item_id, row.identity.variation_id || '', mode.value === 'opportunities' ? row.capacity?.projected_initial_units : '', mode.value === 'opportunities' ? row.capacity?.final_units : row.coverage?.final_suggestion, row.identity.size_class || '', mode.value === 'opportunities' ? row.eligibility?.status : '', row.decision.priority, row.decision.reason, row.quality.confidence, new Date().toISOString()].map(csvCell).join(';'))
  const blob = new Blob([[header.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'checklist-full.csv'; link.click(); URL.revokeObjectURL(url); $q.notify({ type: 'positive', message: 'Checklist exportado.' })
}
function csvCell(value) { return `"${String(value ?? '').replaceAll('"', '""')}"` }
function queueLabel(queue) { return { send_now: 'Enviar agora', prepare: 'Preparar envio', do_not_send: 'Não enviar agora', cd_pending: 'Pendências do CD' }[queue] || queue }
function reasonLabel(reason) { return { rupture: 'Ruptura', below_reorder_point: 'Abaixo do ponto de reposição', data_quality: 'Dados para revisar', lead_time_unknown: 'Lead time desconhecido', excess_coverage_estimated: 'Excesso estimado', low_demand: 'Baixa demanda', coverage_trend: 'Queda de cobertura' }[reason] || reason }
function actionLabel(action) { return { agir: 'Agir', monitorar: 'Monitorar', investigar: 'Investigar' }[action] || action }
function formatCoverage(days) { return days == null ? '—' : `${Number(days).toFixed(1)} dias` }
function capacityNote(row) { return row.coverage.capacity_limit_applied ? 'limitada pela capacidade' : row.coverage.remaining_capacity == null ? 'capacidade não configurada' : 'dentro da capacidade' }
function opportunityStatusLabel(status) { return { full_opportunity: 'Pronta para avaliar', full_opportunity_conditional: 'Condicional', full_opportunity_not_now: 'Não agora', full_opportunity_insufficient_data: 'Dados insuficientes' }[status] || status }
function opportunityReasonLabel(reason) { return { operational_signals: 'Sinais operacionais positivos', package_or_capacity_unknown: 'Embalagem ou capacidade pendente', low_demand: 'Baixa demanda', capacity_full: 'Capacidade preenchida', no_valid_days: 'Sem dias válidos' }[reason] || reason }
function eligibilityLabel(status) { return { eligible_estimated: 'Estimada', eligible_unknown: 'Desconhecida', eligible_blocked: 'Bloqueada', eligible_confirmed: 'Confirmada' }[status] || status }
function eligibilityClass(status) { return { eligible_estimated: 'confidence--medium', eligible_unknown: 'confidence--low', eligible_blocked: 'confidence--low', eligible_confirmed: 'confidence--high' }[status] || 'confidence--low' }
function opportunityBadgeClass(status) { return { full_opportunity: 'decision-badge--send_now', full_opportunity_conditional: 'decision-badge--prepare', full_opportunity_not_now: 'decision-badge--do_not_send', full_opportunity_insufficient_data: 'decision-badge--cd_pending' }[status] || 'decision-badge--prepare' }
function quantityNote(row) { return row.capacity?.capacity_limit_applied ? 'limitada pela capacidade' : row.capacity?.final_units == null ? 'projeção sem saldo atribuído' : 'dentro do saldo da conta' }
function formatPercent(value) { return value == null ? '—' : `${(Number(value) * 100).toFixed(1)}%` }
function formatMoney(value) { return value == null ? '—' : `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }
function formatRatio(value) { return value == null ? '—' : `${Number(value).toFixed(2)}x` }
function packageDescription(row) { const pkg = row.package || {}; return `${pkg.size_class || 'Classe desconhecida'} · ${pkg.length_cm ?? '—'} x ${pkg.width_cm ?? '—'} x ${pkg.height_cm ?? '—'} cm · fonte ${pkg.source || 'não informada'} · confiança ${pkg.confidence || 'low'}` }
onMounted(async () => { await loadAccounts(); await load() })
</script>

<style lang="scss" scoped>
@import 'src/css/tokens.scss';
.mode-toggle { display: flex; max-width: 1480px; margin: 0 auto 18px; background: #fff; border: 1px solid #e1e6ee; border-radius: 10px; }
.opportunity-summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; max-width: 1480px; margin: 0 auto 16px; }.opportunity-card { display: grid; gap: 5px; border: 1px solid #e2e7ef; border-radius: 13px; padding: 15px; background: #fff; text-align: left; cursor: pointer; color: #68758b; }.opportunity-card strong { color: #172033; font-size: 23px; }.opportunity-card--active, .opportunity-card:hover { border-color: #9ab3dd; box-shadow: 0 7px 18px #1720330d; }.opportunity-card--active strong { color: #3973cd; }.product-avatar--opportunity { color: #5e5bb7; background: #f0efff; }
.fulfillment-page { background: #f4f6fa; padding: 30px clamp(18px, 3vw, 42px) 54px; color: #172033; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; max-width: 1480px; margin: 0 auto 26px; }.eyebrow, .section-kicker { color: #7d879a; font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; } h1, h2, p { margin: 0; }.page-header h1 { font-size: clamp(28px, 3vw, 40px); letter-spacing: -.04em; line-height: 1.04; margin: 6px 0 8px; }.page-header p { color: #68758b; font-size: 14px; }
.queue-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; max-width: 1480px; margin: 0 auto 16px; }.queue-card { display: flex; align-items: center; gap: 12px; border: 1px solid #e2e7ef; background: #fff; border-radius: 15px; padding: 16px; text-align: left; cursor: pointer; transition: .18s ease; }.queue-card:hover, .queue-card--active { transform: translateY(-2px); border-color: #b8c4dc; box-shadow: 0 8px 22px #1720330d; }.queue-icon { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; }.queue-card--urgent .queue-icon { color: #c24444; background: #fff0f0; }.queue-card--prepare .queue-icon { color: #a16a18; background: #fff7e6; }.queue-card--quiet .queue-icon { color: #52637d; background: #eef2f7; }.queue-card--pending .queue-icon { color: #7658b5; background: #f1edff; }.queue-copy { display: grid; gap: 2px; flex: 1; }.queue-copy strong { font-size: 24px; line-height: 1; }.queue-copy span { color: #718097; font-size: 12px; }.queue-arrow { color: #adb8c8; }
.quality-alert { display: flex; align-items: center; gap: 12px; max-width: 1480px; margin: 0 auto 16px; padding: 12px 16px; border: 1px solid #f0d49a; border-radius: 12px; background: #fffaf0; color: #735a25; }.quality-alert > div { display: grid; gap: 2px; flex: 1; }.quality-alert span { font-size: 12px; }.workspace-card { max-width: 1480px; margin: auto; background: #fff; border: 1px solid #e1e6ee; border-radius: 17px; overflow: hidden; }.workspace-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 22px 24px 16px; }.workspace-toolbar h2 { font-size: 22px; letter-spacing: -.025em; margin-top: 4px; }.filters { display: grid; grid-template-columns: minmax(200px, 1.5fr) minmax(150px, 1fr) 190px auto; gap: 10px; padding: 0 24px 20px; border-bottom: 1px solid #edf0f4; }
.desktop-table { overflow-x: auto; } table { width: 100%; border-collapse: collapse; min-width: 860px; } th { color: #8994a6; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; text-align: left; padding: 14px 18px; font-weight: 800; } td { border-top: 1px solid #eff2f6; padding: 15px 18px; vertical-align: middle; font-size: 13px; } tbody tr { cursor: pointer; transition: background .15s; } tbody tr:hover { background: #f8faff; } td strong { display: block; font-size: 13px; } td small { display: block; color: #8a96a9; font-size: 11px; margin-top: 4px; }.product-cell { display: flex; align-items: center; gap: 10px; min-width: 220px; }.product-avatar { display: grid; place-items: center; flex: 0 0 34px; height: 34px; background: #edf3ff; color: #3973cd; border-radius: 10px; }.product-cell span { display: block; color: #8792a4; font-size: 11px; margin-top: 4px; }.decision-badge { display: inline-flex; border-radius: 6px; padding: 4px 7px; font-size: 10px; font-weight: 800; white-space: nowrap; }.decision-badge + small { margin-top: 5px; }.decision-badge--send_now { color: #b53c3c; background: #fff0f0; }.decision-badge--prepare { color: #976219; background: #fff7e5; }.decision-badge--do_not_send { color: #53617a; background: #edf1f6; }.decision-badge--cd_pending { color: #6d51a2; background: #f1edff; }.confidence { display: inline-block; padding: 4px 7px; border-radius: 5px; font-size: 10px; text-transform: uppercase; font-weight: 800; }.confidence--high { color: #217557; background: #e9f7f0; }.confidence--medium { color: #9a681a; background: #fff6df; }.confidence--low { color: #b14c4c; background: #fff0f0; }
.mobile-list { display: none; }.state-panel { min-height: 240px; display: grid; place-content: center; justify-items: center; gap: 9px; color: #8a96a9; text-align: center; padding: 24px; }.state-panel strong { color: #35425a; }.state-panel--error { color: #b54d4d; }.state-panel--error span { color: #8a96a9; font-size: 13px; }
.detail-card { background: #f5f7fb; }.detail-header { display: flex; align-items: flex-start; justify-content: space-between; max-width: 980px; width: 100%; margin: 0 auto; padding: 30px 24px 18px; }.detail-header h2 { font-size: 27px; margin: 7px 0 5px; letter-spacing: -.035em; }.detail-header span { color: #7e8ba0; font-size: 13px; }.detail-body { max-width: 980px; width: 100%; margin: 0 auto; padding: 10px 24px 42px; }.detail-decision { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; overflow: hidden; border-radius: 13px; background: #dfe5ee; margin-bottom: 16px; }.detail-decision > div { display: grid; gap: 5px; padding: 17px; background: #fff; }.detail-decision span, .metric-card span { color: #8591a4; font-size: 11px; }.detail-decision strong { font-size: 15px; }.detail-decision--send_now { border-left: 4px solid #cf5555; }.detail-decision--prepare { border-left: 4px solid #d9a142; }.detail-decision--do_not_send { border-left: 4px solid #8491a5; }.detail-decision--cd_pending { border-left: 4px solid #8e6bc2; }.detail-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 11px; }.metric-card { display: grid; gap: 7px; padding: 16px; border: 1px solid #e1e6ee; border-radius: 12px; background: #fff; }.metric-card strong { font-size: 21px; }.metric-card small { color: #8a96a9; font-size: 11px; }.detail-warning { margin: 16px 0; padding: 11px 14px; border-radius: 9px; background: #fff7e5; color: #89631e; font-size: 12px; }.detail-section { margin-top: 22px; padding: 18px; border: 1px solid #e1e6ee; border-radius: 12px; background: #fff; }.detail-section p { color: #53617a; font-size: 13px; line-height: 1.6; margin-top: 8px; }.timeline-list, .operation-list { display: grid; gap: 7px; margin-top: 12px; }.timeline-list > div, .operation-list > div { display: flex; align-items: center; gap: 12px; padding: 9px 0; border-bottom: 1px solid #eef1f5; font-size: 12px; }.timeline-list span:last-child, .operation-list small { color: #8792a4; margin-left: auto; }.operation-list span { font-weight: 800; font-size: 11px; }
@media (max-width: 800px) { .fulfillment-page { padding: 20px 13px 40px; }.page-header { align-items: stretch; flex-direction: column; gap: 15px; }.page-header .q-btn { align-self: flex-start; }.queue-grid, .opportunity-summary { grid-template-columns: repeat(2, 1fr); gap: 8px; }.queue-card { padding: 12px; }.opportunity-card { padding: 12px; }.queue-copy strong { font-size: 20px; }.mode-toggle { max-width: 100%; overflow-x: auto; }.workspace-toolbar { padding: 18px 15px 13px; }.workspace-toolbar h2 { font-size: 19px; }.filters { grid-template-columns: 1fr 1fr; padding: 0 15px 15px; }.filters .q-btn { grid-column: 1 / -1; }.desktop-table { display: none; }.mobile-list { display: grid; }.mobile-row { display: grid; gap: 9px; border: 0; border-top: 1px solid #edf0f4; padding: 15px; background: #fff; text-align: left; }.mobile-top, .mobile-meta { display: flex; justify-content: space-between; align-items: center; gap: 8px; }.mobile-top strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.mobile-meta { color: #68758b; font-size: 12px; }.mobile-reason { color: #9a681a; font-size: 11px; }.quality-alert { align-items: flex-start; padding: 12px; }.quality-alert .q-btn { display: none; }.detail-header, .detail-body { padding-left: 16px; padding-right: 16px; }.detail-grid { grid-template-columns: repeat(2, 1fr); }.detail-decision { grid-template-columns: 1fr; }.detail-header h2 { font-size: 22px; } }
@media (max-width: 430px) { .filters { grid-template-columns: 1fr; }.detail-grid { grid-template-columns: 1fr 1fr; }.metric-card { padding: 12px; }.metric-card strong { font-size: 18px; } }
 .results-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 24px; border-top: 1px solid #edf0f4; color: #8792a4; font-size: 12px; }.evidence-list { display: grid; gap: 8px; margin: 14px 0 0; padding: 0; list-style: none; }.evidence-list li { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 8px; border-bottom: 1px solid #eef1f5; color: #53617a; font-size: 12px; }.evidence-list span { color: #8792a4; }
</style>
