<template>
  <SbCard class="timeline-card">
    <template #header>
      <div class="timeline-heading">
        <div>
          <div class="card-eyebrow">Histórico diário</div>
          <div class="card-title">Evolução do anúncio</div>
        </div>
        <q-btn-toggle
          :model-value="mode"
          no-caps unelevated toggle-color="teal-8"
          :options="modeOptions"
          @update:model-value="emit('update:mode', $event)"
        />
      </div>
    </template>
    <div v-if="loading" class="timeline-state"><SbEmptyState variant="loading" title="Carregando histórico" message="Normalizando as séries do período." /></div>
    <SbEmptyState v-else-if="error" variant="error" title="Histórico indisponível" :message="error">
      <template #action><q-btn outline color="teal-8" label="Tentar novamente" @click="emit('retry')" /></template>
    </SbEmptyState>
    <SbEmptyState v-else-if="chartError" variant="error" title="Gráfico indisponível" :message="chartError">
      <template #action><q-btn outline color="teal-8" label="Tentar novamente" @click="chartError = ''; renderChart()" /></template>
    </SbEmptyState>
    <div v-else-if="!hasData" class="timeline-state"><SbEmptyState title="Sem histórico suficiente" message="Ainda não há observações diárias para montar este modo de análise." /></div>
    <template v-else>
      <div class="chart-meta">
        <span>{{ qualityText }}</span>
        <SbBadge v-if="timeline.legacy" variant="slate">Contrato legado</SbBadge>
        <SbBadge v-else-if="timeline.quality?.partial" variant="amber">Parcial</SbBadge>
      </div>
      <div ref="plotlyContainer" class="plotly-container" role="img" :aria-label="`Gráfico de ${activeMode.label}`"></div>
      <div v-if="missingDays.length" class="missing-days">
        <q-icon name="event_busy" size="14px" /> {{ missingDays.length }} dias sem observação ficam visíveis como lacunas.
      </div>
    </template>
  </SbCard>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import { ANALYTICS_MODES, formatNumber } from 'src/utils/itemAnalytics'
import { loadPlotly } from 'src/utils/plotly'

const props = defineProps({
  timeline: { type: Object, default: null },
  loading: Boolean,
  error: { type: String, default: '' },
  mode: { type: String, default: 'traffic' },
})
const emit = defineEmits(['retry', 'update:mode'])
const plotlyContainer = ref(null)
const chartError = ref('')
const modePresentation = {
  traffic: { label: 'Tráfego', icon: 'visibility' },
  price: { label: 'Preço', icon: 'sell' },
  stock: { label: 'Estoque', icon: 'inventory_2' },
  ads: { label: 'Ads', icon: 'campaign' },
}
const modeOptions = ANALYTICS_MODES.map((value) => ({ value, ...modePresentation[value] }))
const modeDefinitions = {
  traffic: { label: 'tráfego', traces: [
    { key: 'visits', label: 'Visitas', color: '#0284c7', axis: 'y' },
    { key: 'orders_count', label: 'Pedidos', color: '#0f766e', axis: 'y' },
    { key: 'conversion_rate', label: 'Conversão', color: '#f59e0b', axis: 'y2', percent: true },
  ] },
  price: { label: 'preço e promoção', traces: [
    { key: 'price', label: 'Preço', color: '#6366f1', axis: 'y', currency: true },
    { key: 'has_promotion', label: 'Com promoção', color: '#f59e0b', axis: 'y2', boolean: true },
  ] },
  stock: { label: 'estoque e logística', traces: [
    { key: 'available_quantity', label: 'Estoque informado', color: '#64748b', axis: 'y' },
    { key: 'fulfillment_available_quantity', label: 'Full disponível', color: '#0f766e', axis: 'y' },
    { key: 'fulfillment_total_quantity', label: 'Full total', color: '#8b5cf6', axis: 'y' },
  ] },
}
const activeMode = computed(() => modeDefinitions[props.mode] || modeDefinitions.traffic)
const rows = computed(() => props.timeline?.series || [])
const missingDays = computed(() => props.timeline?.quality?.missing_days || [])
const hasData = computed(() => props.timeline && (rows.value.length > 0) && activeMode.value.traces.some((trace) => rows.value.some((row) => row[trace.key] !== null && row[trace.key] !== undefined)))
const qualityText = computed(() => `${formatNumber(props.timeline?.quality?.observed_days || rows.value.length)} dias observados`)

function traceFor(definition) {
  return {
    x: rows.value.map((row) => row.date),
    y: rows.value.map((row) => {
      const value = row[definition.key]
      if (definition.boolean) return value ? 1 : 0
      return value === undefined ? null : value
    }),
    name: definition.label,
    type: 'scatter',
    mode: definition.boolean ? 'markers' : 'lines+markers',
    connectgaps: false,
    line: { color: definition.color, width: 2.5, shape: 'spline' },
    marker: { color: definition.color, size: 5 },
    yaxis: definition.axis,
    hovertemplate: definition.currency ? '%{y:.2f}<extra>Preço</extra>' : definition.percent ? '%{y:.2f}%<extra>Conversão</extra>' : '%{y}<extra></extra>',
  }
}

async function renderChart() {
  chartError.value = ''
  if (!hasData.value || !plotlyContainer.value) return
  try {
    await loadPlotly()
    await nextTick()
    if (!plotlyContainer.value || !window.Plotly) return
    const traces = activeMode.value.traces.map(traceFor)
    window.Plotly.react(plotlyContainer.value, traces, {
      autosize: true,
      height: 330,
      margin: { l: 48, r: activeMode.value.traces.some((trace) => trace.axis === 'y2') ? 52 : 20, t: 12, b: 42 },
      paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffff',
      font: { family: 'Inter, sans-serif', color: '#64748b', size: 11 },
      hovermode: 'x unified',
      legend: { orientation: 'h', y: 1.1, x: 0, font: { size: 11 } },
      xaxis: { gridcolor: '#f1f5f9', zeroline: false, type: 'date' },
      yaxis: { gridcolor: '#f1f5f9', zeroline: false, title: activeMode.value.label, rangemode: 'tozero' },
      yaxis2: { overlaying: 'y', side: 'right', showgrid: false, rangemode: 'tozero', title: 'Percentual' },
    }, { responsive: true, displayModeBar: false, displaylogo: false })
  } catch (error) {
    chartError.value = 'A biblioteca de visualização não respondeu. O resumo textual continua disponível.'
  }
}

watch(() => [props.timeline, props.mode], renderChart, { deep: true, flush: 'post' })
onBeforeUnmount(() => { if (plotlyContainer.value && window.Plotly) window.Plotly.purge(plotlyContainer.value) })
</script>

<style lang="scss" scoped>
.timeline-card :deep(.sb-card-header) { padding-bottom: 12px; }
.timeline-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; }
.card-eyebrow { color: #0f766e; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.card-title { color: #0f172a; font-size: 15px; font-weight: 700; margin-top: 3px; }
.timeline-state { min-height: 280px; display: grid; place-items: center; }
.chart-meta { display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 11px; margin-bottom: 2px; }
.plotly-container { width: 100%; min-height: 330px; }
.missing-days { display: flex; align-items: center; gap: 5px; color: #92400e; font-size: 11px; background: #fffbeb; border-radius: 7px; padding: 7px 9px; }
@media (max-width: 600px) { .timeline-heading { align-items: flex-start; flex-direction: column; } .timeline-heading :deep(.q-btn-group) { width: 100%; overflow-x: auto; } .timeline-heading :deep(.q-btn) { flex: 1 0 auto; } }
</style>
