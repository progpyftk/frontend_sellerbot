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
    <div v-else-if="!hasData" class="timeline-state">
      <SbEmptyState v-if="isCombine && noMetricSelected" title="Selecione métricas" message="Marque ao menos uma métrica para montar a comparação." />
      <SbEmptyState v-else title="Sem histórico suficiente" message="Ainda não há observações diárias para montar este modo de análise." />
    </div>
    <template v-else>
      <div class="chart-meta">
        <span>{{ qualityText }}</span>
        <SbBadge v-if="timeline.legacy" variant="slate">Contrato legado</SbBadge>
        <SbBadge v-else-if="timeline.quality?.partial" variant="amber">Parcial</SbBadge>
      </div>
      <div v-if="isCombine" class="metric-panel">
        <div v-for="category in combineCategories" :key="category.value" class="metric-group">
          <div class="metric-group-title">{{ category.label }}</div>
          <div class="metric-chips">
            <label
              v-for="metric in metricsForCategory(category.value)"
              :key="metric.key"
              class="metric-chip"
              :class="{ 'is-active': isMetricSelected(metric.key), 'is-disabled': metric.disabled }"
            >
              <q-checkbox
                :model-value="isMetricSelected(metric.key)"
                :disable="metric.disabled"
                size="xs"
                dense
                :style="metric.disabled ? '' : `color:${metric.color}`"
                @update:model-value="toggleMetric(metric)"
              />
              <span class="metric-chip-label">{{ metric.label }}</span>
              <q-icon v-if="metric.disabled" name="info_outline" size="13px" class="metric-chip-hint">
                <q-tooltip>{{ metric.disabledHint }}</q-tooltip>
              </q-icon>
            </label>
          </div>
        </div>
        <div class="metric-tools">
          <q-toggle v-model="normalized" label="Tendência (0–100)" :disable="combinedMetricCount < 2" dense />
          <span v-if="normalized" class="normalize-hint">Curvas normalizadas p/ comparar tendência</span>
        </div>
      </div>
      <div ref="plotlyContainer" class="plotly-container" role="img" :aria-label="`Gráfico de ${activeMode.label}`"></div>
      <div v-if="missingDays.length" class="missing-days">
        <q-icon name="event_busy" size="14px" /> {{ missingDays.length }} dias sem observação ficam visíveis como lacunas.
      </div>
    </template>
  </SbCard>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import {
  ANALYTICS_MODES,
  COMBINE_CATEGORIES,
  COMBINE_MODE,
  METRIC_CATALOG,
  axisRangeFor,
  formatNumber,
  normalizeForOverlay,
} from 'src/utils/itemAnalytics'
import { loadPlotly } from 'src/utils/plotly'

const props = defineProps({
  timeline: { type: Object, default: null },
  loading: Boolean,
  error: { type: String, default: '' },
  mode: { type: String, default: 'traffic' },
  metrics: { type: Array, default: () => [] },
})
const emit = defineEmits(['retry', 'update:mode', 'update:metrics'])
const plotlyContainer = ref(null)
const chartError = ref('')
const normalized = ref(false)
const combineCategories = COMBINE_CATEGORIES
const modePresentation = {
  traffic: { label: 'Tráfego', icon: 'visibility' },
  price: { label: 'Preço', icon: 'sell' },
  stock: { label: 'Estoque', icon: 'inventory_2' },
  combine: { label: 'Combinar', icon: 'timeline' },
}
const modeOptions = ANALYTICS_MODES.map((value) => ({ value, ...modePresentation[value] }))
const modeDefinitions = {
  traffic: { label: 'tráfego', traces: [
    { key: 'visits', label: 'Visitas', color: '#0284c7', axis: 'y', format: 'count' },
    { key: 'orders_count', label: 'Pedidos', color: '#0f766e', axis: 'y', format: 'count' },
    { key: 'conversion_rate', label: 'Conversão', color: '#f59e0b', axis: 'y2', format: 'percent' },
  ] },
  price: { label: 'preço e promoção', traces: [
    { key: 'price', label: 'Preço', color: '#6366f1', axis: 'y', format: 'currency' },
    { key: 'has_promotion', label: 'Com promoção', color: '#f59e0b', axis: 'y2', format: 'boolean' },
  ] },
  stock: { label: 'estoque e logística', traces: [
    { key: 'available_quantity', label: 'Estoque informado', color: '#64748b', axis: 'y', format: 'count' },
    { key: 'fulfillment_available_quantity', label: 'Full disponível', color: '#0f766e', axis: 'y', format: 'count' },
    { key: 'fulfillment_total_quantity', label: 'Full total', color: '#8b5cf6', axis: 'y', format: 'count' },
  ] },
}
const activeMode = computed(() => modeDefinitions[props.mode] || modeDefinitions.traffic)
const isCombine = computed(() => props.mode === COMBINE_MODE)
const rows = computed(() => props.timeline?.series || [])
const missingDays = computed(() => props.timeline?.quality?.missing_days || [])
const qualityText = computed(() => `${formatNumber(props.timeline?.quality?.observed_days || rows.value.length)} dias observados`)

const selectedMetrics = computed(() => METRIC_CATALOG.filter((metric) => props.metrics.includes(metric.key)))
const noMetricSelected = computed(() => isCombine.value && !selectedMetrics.value.some((metric) => !metric.band))
const combinedMetricCount = computed(() => selectedMetrics.value.filter((metric) => !metric.band && !metric.disabled).length)

function metricsForCategory(category) {
  return METRIC_CATALOG.filter((metric) => metric.category === category)
}
function isMetricSelected(key) {
  return props.metrics.includes(key)
}
function toggleMetric(metric) {
  if (metric.disabled) return
  const has = props.metrics.includes(metric.key)
  const next = has ? props.metrics.filter((key) => key !== metric.key) : [...props.metrics, metric.key]
  emit('update:metrics', next)
}

// Constrói a lista de definições de trace a renderizar (presets ou modo combinado).
function buildTraceDefs() {
  if (isCombine.value) {
    return selectedMetrics.value
      .filter((metric) => !metric.disabled && !metric.band)
      .map((metric) => ({ key: metric.key, label: metric.label, color: metric.color, axis: metric.axis, format: metric.format }))
  }
  return activeMode.value.traces
}

const hasData = computed(() => {
  if (!props.timeline || !rows.value.length) return false
  return buildTraceDefs().some((def) => rows.value.some((row) => {
    if (def.format === 'boolean') return row[def.key] !== null && row[def.key] !== undefined
    return row[def.key] !== null && row[def.key] !== undefined
  }))
})

function hovertemplateFor(def) {
  if (def.format === 'currency') return '%{y:$,.2f}<extra>%{fullData.name}</extra>'
  if (def.format === 'percent') return '%{y:.2f}%<extra>%{fullData.name}</extra>'
  if (def.format === 'boolean') return '%{y}<extra>%{fullData.name}</extra>'
  return '%{y}<extra>%{fullData.name}</extra>'
}

function buildTrace(def, values) {
  const isBool = def.format === 'boolean'
  const y = values
    ? values
    : rows.value.map((row) => {
        if (isBool) return row[def.key] ? 1 : 0
        return row[def.key] === undefined ? null : row[def.key]
      })
  return {
    x: rows.value.map((row) => row.date),
    y,
    name: def.label,
    type: 'scatter',
    mode: isBool ? 'markers' : 'lines+markers',
    connectgaps: false,
    line: { color: def.color, width: 2.5, shape: 'spline' },
    marker: { color: def.color, size: 5 },
    yaxis: def.axis || 'y',
    hovertemplate: hovertemplateFor(def),
  }
}

// Promoção vira regiões sombreadas de fundo (retângulos Plotly), não uma curva.
function buildPromoShapes() {
  if (!isCombine.value) return []
  const enabled = selectedMetrics.value.some((metric) => metric.key === 'has_promotion')
  if (!enabled) return []
  const dates = rows.value.map((row) => row.date)
  const active = rows.value.map((row) => Boolean(row.has_promotion))
  const runs = []
  let start = null
  active.forEach((on, index) => {
    if (on && start === null) start = dates[index]
    if (!on && start !== null) {
      runs.push([start, dates[index - 1]])
      start = null
    }
  })
  if (start !== null) runs.push([start, dates[dates.length - 1]])
  return runs.map(([x0, x1]) => ({
    type: 'rect', xref: 'x', yref: 'paper', y0: 0, y1: 1,
    x0, x1: x0 === x1 ? `${x1}T23:59:59` : x1,
    fillcolor: 'rgba(249,115,22,0.12)', line: { width: 0 }, layer: 'below',
  }))
}

// Resolve títulos e presença dos eixos por natureza de unidade.
function axisInfo() {
  if (!isCombine.value) {
    return { y: activeMode.value.label, y2: 'Percentual', y3: null }
  }
  const info = { y: 'Quantidade', y2: null, y3: null }
  selectedMetrics.value.forEach((metric) => {
    if (metric.axis === 'y2') info.y2 = 'Percentual'
    if (metric.axis === 'y3') info.y3 = 'Moeda'
  })
  return info
}

const axisRange = () => axisRangeFor(props.mode, normalized.value)

async function renderChart() {
  chartError.value = ''
  if (!hasData.value || !plotlyContainer.value) return
  try {
    await loadPlotly()
    await nextTick()
    if (!plotlyContainer.value || !window.Plotly) return
    const isNormalized = isCombine.value && normalized.value
    const defs = buildTraceDefs()
    const values = isNormalized ? normalizeForOverlay(rows.value, defs.map((def) => def.key)) : null
    const traces = defs.map((def) => buildTrace(def, values ? values[def.key] : null))
    const shapes = buildPromoShapes()
    const axis = axisInfo()
    const range = axisRange()
    const rangeMode = isNormalized ? 'normal' : 'tozero'
    const axisTitle = isNormalized ? '' : axis.y
    const layout = {
      autosize: true,
      height: 330,
      margin: { l: 48, r: axis.y3 ? 92 : axis.y2 ? 56 : 20, t: 12, b: 42 },
      paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffff',
      font: { family: 'Inter, sans-serif', color: '#64748b', size: 11 },
      hovermode: 'x unified',
      legend: { orientation: 'h', y: 1.1, x: 0, font: { size: 11 } },
      shapes,
      xaxis: { gridcolor: '#f1f5f9', zeroline: false, type: 'date' },
      yaxis: { gridcolor: '#f1f5f9', zeroline: false, title: axisTitle, rangemode: rangeMode, range: range || undefined },
    }
    if (axis.y2) {
      layout.yaxis2 = { overlaying: 'y', side: 'right', showgrid: false, title: isNormalized ? '' : axis.y2, rangemode: rangeMode, range: range || undefined }
    }
    if (axis.y3) {
      layout.yaxis3 = { overlaying: 'y', side: 'right', showgrid: false, anchor: 'free', position: 1, title: isNormalized ? '' : axis.y3, rangemode: rangeMode, range: range || undefined }
    }
    window.Plotly.react(plotlyContainer.value, traces, layout, { responsive: true, displayModeBar: false, displaylogo: false })
  } catch (error) {
    chartError.value = 'A biblioteca de visualização não respondeu. O resumo textual continua disponível.'
  }
}

watch(() => [props.timeline, props.mode, props.metrics, normalized.value], renderChart, { deep: true, flush: 'post' })
onMounted(renderChart)
onBeforeUnmount(() => { if (plotlyContainer.value && window.Plotly) window.Plotly.purge(plotlyContainer.value) })
</script>

<style lang="scss" scoped>
.timeline-card :deep(.sb-card-header) { padding-bottom: 12px; }
.timeline-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; }
.card-eyebrow { color: #0f766e; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.card-title { color: #0f172a; font-size: 15px; font-weight: 700; margin-top: 3px; }
.timeline-state { min-height: 280px; display: grid; place-items: center; }
.chart-meta { display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 11px; margin-bottom: 2px; }
.metric-panel { display: flex; flex-direction: column; gap: 8px; margin: 6px 0 10px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 9px; }
.metric-group { display: flex; flex-wrap: wrap; gap: 4px 8px; align-items: baseline; }
.metric-group-title { color: #0f766e; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; min-width: 58px; }
.metric-chips { display: flex; flex-wrap: wrap; gap: 2px 10px; align-items: center; }
.metric-chip { display: inline-flex; align-items: center; gap: 2px; cursor: pointer; border-radius: 6px; padding: 1px 6px; }
.metric-chip.is-active { background: #f1f5f9; }
.metric-chip.is-disabled { opacity: .5; cursor: not-allowed; }
.metric-chip-label { color: #334155; font-size: 12px; }
.metric-chip-hint { color: #94a3b8; }
.metric-tools { display: flex; align-items: center; gap: 8px; margin-top: 4px; border-top: 1px dashed #e2e8f0; padding-top: 8px; }
.normalize-hint { color: #92400e; font-size: 11px; background: #fffbeb; border-radius: 6px; padding: 3px 7px; }
.plotly-container { width: 100%; min-height: 330px; }
.missing-days { display: flex; align-items: center; gap: 5px; color: #92400e; font-size: 11px; background: #fffbeb; border-radius: 7px; padding: 7px 9px; }
@media (max-width: 600px) { .timeline-heading { align-items: flex-start; flex-direction: column; } .timeline-heading :deep(.q-btn-group) { width: 100%; overflow-x: auto; } .timeline-heading :deep(.q-btn) { flex: 1 0 auto; } }
</style>
