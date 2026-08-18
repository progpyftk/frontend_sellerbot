<template>
  <q-dialog :model-value="modelValue" position="right" @update:model-value="$emit('update:modelValue', $event)">
    <q-card v-if="line" class="fp-detail">
      <header class="fp-detail__header">
        <div><span class="fp-eyebrow">DECISÃO DO SELLERBOT</span><h2>{{ line.title }}</h2><p>{{ line.variation_name || 'Anúncio sem variação' }} · {{ line.sku || 'Sem SKU' }}</p></div>
        <q-btn flat round dense icon="close" aria-label="Fechar" @click="$emit('update:modelValue', false)" />
      </header>

      <div class="fp-detail__hero">
        <span class="fp-action" :class="`fp-action--${meta.tone}`"><q-icon :name="meta.icon" />{{ meta.label }}</span>
        <div><span>Quantidade<strong>{{ quantityLabel }}</strong></span><span>Despachar até<strong>{{ formatDate(line.dispatch_by) }}</strong></span></div>
        <p>{{ reasonText(line.decision?.reasons?.[0]) }}</p>
      </div>

      <section class="fp-detail__section">
        <h3>Como chegamos nesta quantidade</h3>
        <div class="fp-formula-grid">
          <span>Previsão diária<strong>{{ formatNumber(line.forecast?.daily_units, 2) }}</strong><small>{{ modelLabel(line.forecast?.model) }}</small></span>
          <span>Lead time<strong>{{ line.decision?.formula?.lead_time_days ?? '—' }} dias</strong></span>
          <span>Frequência<strong>{{ line.decision?.formula?.frequency_days ?? '—' }} dias</strong></span>
          <span>Segurança<strong>{{ line.decision?.formula?.safety_days ?? '—' }} dias</strong></span>
          <span>Necessidade bruta<strong>{{ line.need_quantity ?? '—' }}</strong></span>
          <span>Limite ERP<strong>{{ line.inventory?.erp_available ?? '—' }}</strong></span>
        </div>
        <div class="fp-coverage-bar">
          <div><span>Cobertura atual</span><strong>{{ formatNumber(line.inventory?.coverage_before_days, 0) }} dias</strong></div>
          <q-linear-progress rounded size="9px" :value="coverageProgress" color="primary" track-color="blue-grey-1" />
          <div><span>Após o envio</span><strong>{{ formatNumber(line.inventory?.coverage_after_days, 0) }} dias</strong></div>
        </div>
      </section>

      <section class="fp-detail__section">
        <h3>Indicadores considerados</h3>
        <div class="fp-indicator-list">
          <span><small>Ticket médio</small><strong>{{ formatMoney(line.economics?.average_ticket) }}</strong></span>
          <span><small>Margem de contribuição</small><strong>{{ percent(line.economics?.contribution_margin_rate) }}</strong></span>
          <span><small>Contribuição 60 dias</small><strong>{{ formatMoney(line.economics?.contribution_60) }}</strong></span>
          <span><small>Ads 60 dias</small><strong>{{ formatMoney(line.economics?.ads_cost_60) }}</strong></span>
          <span><small>Conversão</small><strong>{{ percentPoints(line.indicators?.conversion_rate) }}</strong></span>
          <span><small>Performance</small><strong>{{ line.indicators?.performance_score ?? '—' }}/100</strong></span>
          <span><small>Visitas 60 dias</small><strong>{{ formatNumber(line.indicators?.visits_60, 0) }}</strong></span>
          <span><small>Confiança</small><strong>{{ confidence(line.forecast?.confidence) }}</strong></span>
        </div>
      </section>

      <section v-if="warnings.length" class="fp-detail__section fp-detail__section--warning">
        <h3><q-icon name="warning_amber" /> Pontos para conferir</h3>
        <ul><li v-for="warning in warnings" :key="warning">{{ reasonText(warning) }}</li></ul>
      </section>

      <section v-if="adjustments.length" class="fp-detail__section">
        <h3><q-icon name="history" /> Histórico de ajustes</h3>
        <ol class="fp-adjustment-history">
          <li v-for="entry in adjustments" :key="entry.id">
            <span>{{ formatTimestamp(entry.created_at) }} · {{ entry.actor || 'Operador' }}</span>
            <strong>{{ actionMeta(entry.previous_action).label }} {{ entry.previous_quantity ?? 0 }} → {{ actionMeta(entry.new_action).label }} {{ entry.new_quantity }}</strong>
            <p>{{ entry.reason }}</p>
          </li>
        </ol>
      </section>

      <section v-if="canWrite && editable" class="fp-detail__section fp-adjustment">
        <h3>Ajustar decisão</h3>
        <p>O ajuste fica registrado com o valor anterior e a justificativa.</p>
        <div class="fp-adjustment__fields">
          <q-select v-model="form.action" :options="actionOptions" emit-value map-options outlined label="Ação" />
          <q-input v-model.number="form.quantity" type="number" min="0" outlined label="Quantidade" />
          <q-input v-model="form.reason" type="textarea" autogrow outlined label="Por que você está ajustando?" />
        </div>
        <q-btn unelevated color="primary" no-caps label="Salvar ajuste" :loading="saving" :disable="!validAdjustment" @click="save" />
      </section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { ACTIONS, actionMeta, formatDate, formatMoney, formatNumber, reasonText } from 'src/utils/fulfillmentPlan'

const props = defineProps({
  modelValue: Boolean,
  line: { type: Object, default: null },
  canWrite: Boolean,
  editable: Boolean,
  saving: Boolean,
  adjustments: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue', 'adjust'])
const form = reactive({ action: '', quantity: 0, reason: '' })
const sendActions = new Set(['replenish_full', 'start_full', 'next_cycle'])
const meta = computed(() => actionMeta(props.line?.action))
const warnings = computed(() => props.line?.decision?.warnings || [])
const quantityLabel = computed(() => sendActions.has(props.line?.action)
  ? (props.line?.effective_quantity ?? props.line?.recommended_quantity ?? '—')
  : 'Sem envio')
const coverageProgress = computed(() => Math.min(1, Number(props.line?.inventory?.coverage_before_days || 0) / Math.max(1, Number(props.line?.inventory?.coverage_after_days || 30))))
const validAdjustment = computed(() => {
  const quantity = Number(form.quantity)
  const quantityIsValid = sendActions.has(form.action) ? quantity > 0 : quantity === 0
  return form.action && quantityIsValid && form.reason.trim().length >= 5
})
const actionOptions = Object.entries(ACTIONS).map(([value, row]) => ({ value, label: row.label }))

watch(() => props.line, line => {
  if (!line) return
  form.action = line.action
  form.quantity = line.effective_quantity ?? line.recommended_quantity ?? line.need_quantity ?? 0
  form.reason = ''
}, { immediate: true })

watch(() => form.action, action => {
  if (!action || sendActions.has(action)) return
  form.quantity = 0
})

function save() {
  if (!validAdjustment.value) return
  emit('adjust', { lineId: props.line.id, quantity: Number(form.quantity), action: form.action, reason: form.reason.trim() })
}
function percent(value) { return value == null ? '—' : Number(value).toLocaleString('pt-BR', { style: 'percent', maximumFractionDigits: 1 }) }
function percentPoints(value) { return value == null ? '—' : `${formatNumber(value, 2)}%` }
function confidence(value) { return { high: 'Alta', medium: 'Média', low: 'Baixa' }[value] || '—' }
function modelLabel(value) { return { naive_7: 'ritmo dos últimos 7 dias', moving_15: 'média de 15 dias', moving_30: 'média de 30 dias', weighted_trend: 'tendência ponderada', croston_sba: 'demanda intermitente', zero_demand: 'sem demanda' }[value] || value }
function formatTimestamp(value) { return value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—' }
</script>
