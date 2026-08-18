<template>
  <section class="full-panel" aria-labelledby="full-suggestions-title">
    <div class="full-panel__header full-suggestions-header">
      <div>
        <span class="full-kicker">ETAPA 1 · SUGESTÕES AUTOMÁTICAS</span>
        <h2 id="full-suggestions-title">O que vale enviar para o Full?</h2>
        <p>Priorização por vendas, cobertura, estoque atual, prazo de recebimento e rotatividade.</p>
      </div>
      <q-select
        :model-value="accountId"
        :options="accountOptions"
        emit-value
        map-options
        outlined
        dense
        label="Conta Mercado Livre"
        class="full-account-select"
        @update:model-value="$emit('account', $event)"
      />
    </div>

    <div v-if="loading && !lines.length" class="full-state" role="status">
      <q-spinner-dots color="primary" size="36px" />
      <strong>Analisando estoque e vendas desta conta...</strong>
      <span>O SellerBot está calculando cobertura e prioridade por produto.</span>
    </div>
    <div v-else-if="!accountId" class="full-state">
      <q-icon name="storefront" size="34px" />
      <strong>Selecione uma conta conectada</strong>
    </div>
    <template v-else>
      <div class="full-data-strip">
        <span><q-icon name="verified" /> Inventário oficial do Mercado Livre</span>
        <span><q-icon name="insights" /> Demanda calculada com pedidos sincronizados</span>
        <span><q-icon name="schedule" /> {{ freshnessText }}</span>
        <button type="button" @click="$emit('refresh')"><q-icon name="refresh" /> Recalcular</button>
      </div>

      <div class="full-queue-grid" aria-label="Filas de recomendação">
        <button
          v-for="queue in queueCards"
          :key="queue.key"
          type="button"
          class="full-queue-card"
          :class="[`full-queue-card--${queue.tone}`, { 'full-queue-card--active': queueFilter === queue.key }]"
          @click="queueFilter = queueFilter === queue.key ? 'all' : queue.key"
        >
          <span class="full-queue-card__icon"><q-icon :name="queue.icon" /></span>
          <span><strong>{{ queue.count }}</strong><small>{{ queue.label }}</small></span>
          <q-icon name="chevron_right" class="full-queue-card__arrow" />
        </button>
      </div>

      <div class="full-suggestion-toolbar">
        <q-input v-model="search" outlined dense clearable debounce="150" placeholder="Buscar produto, SKU ou inventory ID" class="full-search">
          <template #prepend><q-icon name="search" /></template>
        </q-input>
        <q-select v-model="queueFilter" :options="queueOptions" emit-value map-options outlined dense label="Prioridade" class="full-filter" />
        <q-btn outline color="primary" no-caps icon="tune" label="Critérios" @click="criteriaOpen = true" />
        <q-btn flat color="primary" no-caps :label="allFilteredSelected ? 'Limpar seleção' : 'Selecionar recomendados'" @click="toggleFiltered" />
      </div>

      <div v-if="!filteredLines.length" class="full-state full-state--compact">
        <q-icon name="filter_alt_off" size="32px" />
        <strong>Nenhum produto neste filtro</strong>
        <span>A conta continua sendo analisada; altere a prioridade ou a busca.</span>
      </div>
      <template v-else>
        <div class="full-table-wrap">
          <table class="full-table full-table--suggestions">
            <thead>
              <tr>
                <th aria-label="Selecionar"></th>
                <th>Produto</th>
                <th>Prioridade</th>
                <th>Estoque Full</th>
                <th>Vendas / dia</th>
                <th>Cobertura</th>
                <th>Rotatividade</th>
                <th>Sugestão</th>
                <th>Por quê</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in filteredLines" :key="line.identity.inventory_id" :class="{ 'full-row--selected': isSelected(line) }">
                <td>
                  <q-checkbox
                    :model-value="isSelected(line)"
                    :disable="!isSelectable(line) || !canWrite"
                    :aria-label="`Selecionar ${line.identity.title}`"
                    @update:model-value="toggleLine(line)"
                  />
                </td>
                <td>
                  <div class="full-product">
                    <span class="full-product__icon"><q-icon name="inventory_2" /></span>
                    <span><strong>{{ line.identity.title || line.identity.inventory_id }}</strong><small>{{ line.identity.sku || 'Sem SKU' }} · {{ line.identity.inventory_id }}</small></span>
                  </div>
                </td>
                <td><span class="full-priority" :class="`full-priority--${queueMeta(line).tone}`"><q-icon :name="queueMeta(line).icon" /> {{ queueMeta(line).label }}</span></td>
                <td><strong>{{ line.inventory.available_quantity ?? '—' }} disponíveis</strong><small>{{ line.inventory.total_quantity ?? '—' }} ocupando o Full</small></td>
                <td><strong>{{ formatDecimal(line.demand.weighted, 2) }}</strong><small>7d {{ formatDecimal(line.demand.velocity_7, 2) }} · 30d {{ formatDecimal(line.demand.velocity_30, 2) }}</small></td>
                <td><strong>{{ coverageText(line) }}</strong><small>{{ trendText(line.demand.trend) }}</small></td>
                <td><strong>{{ formatDecimal(line.performance.turnover, 2) }}</strong><small>giro em 30 dias</small></td>
                <td><strong class="full-quantity">{{ line.calculated_quantity ?? '—' }}</strong><small>unidades calculadas</small></td>
                <td><strong>{{ recommendationReason(line) }}</strong><small class="full-reason">{{ attentionText(line) }}</small></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="full-mobile-cards">
          <article v-for="line in filteredLines" :key="`suggestion-${line.identity.inventory_id}`" class="full-line-card" :class="{ 'full-row--selected': isSelected(line) }">
            <div class="full-line-card__head">
              <span><strong>{{ line.identity.title }}</strong><small>{{ line.identity.sku || line.identity.inventory_id }}</small></span>
              <q-checkbox :model-value="isSelected(line)" :disable="!isSelectable(line) || !canWrite" @update:model-value="toggleLine(line)" />
            </div>
            <span class="full-priority" :class="`full-priority--${queueMeta(line).tone}`"><q-icon :name="queueMeta(line).icon" /> {{ queueMeta(line).label }}</span>
            <div class="full-line-card__metrics">
              <span>Full disponível<strong>{{ line.inventory.available_quantity ?? '—' }}</strong></span>
              <span>Cobertura<strong>{{ coverageText(line) }}</strong></span>
              <span>Venda/dia<strong>{{ formatDecimal(line.demand.weighted, 2) }}</strong></span>
              <span>Sugestão<strong>{{ line.calculated_quantity ?? '—' }}</strong></span>
            </div>
            <div class="full-card-reason"><strong>{{ recommendationReason(line) }}</strong><small>{{ attentionText(line) }}</small></div>
          </article>
        </div>
      </template>

      <div class="full-selection-bar">
        <div>
          <strong>{{ selectedIds.length }} produto(s) · {{ selectedUnits }} unidades</strong>
          <span>A quantidade poderá ser ajustada com justificativa na revisão.</span>
        </div>
        <div class="full-actions__right">
          <q-btn-dropdown v-if="drafts.length" flat no-caps icon="history" label="Rascunhos recentes">
            <q-list style="min-width: 270px">
              <q-item v-for="draft in drafts.slice(0, 6)" :key="draft.id" clickable v-close-popup @click="$emit('open-draft', draft.id)">
                <q-item-section><q-item-label>Versão {{ draft.version }} · {{ draft.line_count }} itens</q-item-label><q-item-label caption>{{ draft.dispatch_date }} · {{ draftStatus(draft.status) }}</q-item-label></q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
          <q-btn
            unelevated
            color="primary"
            no-caps
            icon-right="arrow_forward"
            :label="`Revisar envio sugerido (${selectedIds.length})`"
            :loading="saving"
            :disable="!canWrite || !selectedIds.length"
            @click="$emit('create')"
          />
        </div>
      </div>
    </template>

    <q-dialog v-model="criteriaOpen">
      <q-card class="full-dialog">
        <q-card-section>
          <span class="full-kicker">CRITÉRIOS DO CÁLCULO</span>
          <h3>Ajustar horizonte do envio</h3>
          <p>Use apenas quando o próximo recebimento ou a política de cobertura forem diferentes.</p>
        </q-card-section>
        <q-card-section class="full-dialog-grid">
          <q-input :model-value="parameters.dispatchDate" type="date" outlined label="Data de despacho" @update:model-value="updateParameter('dispatchDate', $event)" />
          <q-input :model-value="parameters.receiptDate" type="date" outlined label="Chegada esperada" @update:model-value="updateParameter('receiptDate', $event)" />
          <q-input :model-value="parameters.targetDays" type="number" min="1" max="120" outlined label="Cobertura alvo (dias)" @update:model-value="updateParameter('targetDays', Number($event))" />
          <q-input :model-value="parameters.safetyStockDays" type="number" min="0" max="60" outlined label="Estoque de segurança (dias)" @update:model-value="updateParameter('safetyStockDays', Number($event))" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" v-close-popup />
          <q-btn unelevated color="primary" no-caps label="Aplicar e recalcular" :loading="loading" @click="applyCriteria" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { formatDecimal, queueMeta as getQueueMeta, reasonLabel } from 'src/utils/fulfillmentDraft'

const props = defineProps({
  accountId: { type: String, default: '' },
  accountOptions: { type: Array, default: () => [] },
  health: { type: Object, default: null },
  preview: { type: Object, default: null },
  lines: { type: Array, default: () => [] },
  selectedIds: { type: Array, default: () => [] },
  drafts: { type: Array, default: () => [] },
  parameters: { type: Object, required: true },
  loading: Boolean,
  saving: Boolean,
  canWrite: Boolean,
})
const emit = defineEmits(['account', 'selection', 'parameter', 'refresh', 'create', 'open-draft'])
const search = ref('')
const queueFilter = ref('all')
const criteriaOpen = ref(false)

const queueOptions = [
  { label: 'Todas as prioridades', value: 'all' },
  { label: 'Enviar agora', value: 'send_now' },
  { label: 'Preparar próximo envio', value: 'prepare' },
  { label: 'Não enviar agora', value: 'monitor' },
  { label: 'Dados pendentes', value: 'blocked' },
]
const queueCards = computed(() => [
  { key: 'send_now', label: 'Enviar agora', icon: 'priority_high', tone: 'urgent', count: props.preview?.queues?.send_now || 0 },
  { key: 'prepare', label: 'Preparar', icon: 'schedule_send', tone: 'prepare', count: props.preview?.queues?.prepare || 0 },
  { key: 'monitor', label: 'Não enviar agora', icon: 'visibility', tone: 'monitor', count: props.preview?.queues?.monitor || 0 },
  { key: 'blocked', label: 'Dados pendentes', icon: 'warning_amber', tone: 'blocked', count: props.preview?.queues?.blocked || 0 },
])
const filteredLines = computed(() => {
  const term = search.value?.trim().toLocaleLowerCase('pt-BR') || ''
  return props.lines.filter(line => {
    const queue = line.recommendation?.queue || 'blocked'
    const queueMatches = queueFilter.value === 'all' || queue === queueFilter.value
    const haystack = [line.identity.title, line.identity.sku, line.identity.inventory_id, line.identity.item_id].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR')
    return queueMatches && (!term || haystack.includes(term))
  })
})
const selectableFiltered = computed(() => filteredLines.value.filter(isSelectable))
const allFilteredSelected = computed(() => (
  selectableFiltered.value.length > 0
  && selectableFiltered.value.every(line => props.selectedIds.includes(line.identity.inventory_id))
))
const selectedUnits = computed(() => props.lines.reduce((total, line) => (
  props.selectedIds.includes(line.identity.inventory_id) ? total + Number(line.calculated_quantity || 0) : total
), 0))
const freshnessText = computed(() => {
  const observed = props.health?.sources?.inventory?.observed_at
  return observed ? `Inventário atualizado em ${new Date(observed).toLocaleString('pt-BR')}` : 'Atualização do inventário não informada'
})

function queueMeta(line) { return getQueueMeta(line.recommendation?.queue) }
function isSelected(line) { return props.selectedIds.includes(line.identity.inventory_id) }
function isSelectable(line) { return ['send_now', 'prepare'].includes(line.recommendation?.queue) && Number(line.calculated_quantity) > 0 && line.decision_status !== 'blocked' }
function toggleLine(line) {
  const inventoryId = line.identity.inventory_id
  const next = isSelected(line) ? props.selectedIds.filter(id => id !== inventoryId) : [...props.selectedIds, inventoryId]
  emit('selection', next)
}
function toggleFiltered() {
  const filteredIds = selectableFiltered.value.map(line => line.identity.inventory_id)
  const remaining = props.selectedIds.filter(id => !filteredIds.includes(id))
  emit('selection', allFilteredSelected.value ? remaining : [...new Set([...props.selectedIds, ...filteredIds])])
}
function coverageText(line) {
  const value = line.recommendation?.coverage_days
  return value == null ? '—' : `${formatDecimal(value, 0)} dias`
}
function trendText(value) {
  if (value == null) return 'tendência não disponível'
  const percent = Number(value) * 100
  if (Math.abs(percent) < 5) return 'vendas estáveis'
  return `${percent > 0 ? 'alta' : 'queda'} de ${formatDecimal(Math.abs(percent), 0)}%`
}
function recommendationReason(line) { return reasonLabel(line.recommendation?.reason) }
function attentionText(line) {
  const reason = line.blockers?.[0] || line.warnings?.[0]
  return reason ? reasonLabel(reason) : 'Dados suficientes para decisão.'
}
function draftStatus(status) { return { draft: 'Em revisão', reviewed: 'Revisado', exported: 'Exportado', submitted_manually: 'Criado no ML' }[status] || status }
function updateParameter(key, value) { emit('parameter', { key, value }) }
function applyCriteria() { criteriaOpen.value = false; emit('refresh') }
</script>
