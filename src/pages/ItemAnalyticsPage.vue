<template>
  <q-page class="analytics-page">

    <!-- ══════════ HEADER ══════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon"><q-icon name="insights" size="20px" /></div>
        <div>
          <div class="header-eyebrow">SellerBot</div>
          <div class="header-title">Análise de Anúncios</div>
        </div>
      </div>
      <div class="header-right">
        <div class="date-range-group">
          <button v-for="p in dayPresets" :key="p.days"
            :class="['date-preset-btn', selectedDays === p.days && 'date-preset-btn--on']"
            @click="selectedDays = p.days; loadItems()">{{ p.label }}</button>
        </div>
      </div>
    </div>

    <!-- ══════════ LAYOUT PRINCIPAL ══════════════════════════════════════ -->
    <div class="analytics-layout">

      <!-- Coluna esquerda: lista de anúncios -->
      <div class="items-sidebar">
        <div class="sidebar-header">
          <div class="sidebar-title">Anúncios</div>
          <div class="sort-group">
            <button v-for="s in sortOptions" :key="s.key"
              :class="['sort-btn', sortBy === s.key && 'sort-btn--on']"
              @click="sortBy = s.key; loadItems()">{{ s.label }}</button>
          </div>
        </div>

        <div v-if="loadingItems" class="sidebar-loading">
          <q-spinner-dots color="teal" size="32px" />
        </div>

        <div v-else class="items-list">
          <div v-for="item in items" :key="item.item_id"
            :class="['item-row', selectedItemId === item.item_id && 'item-row--active']"
            @click="selectItem(item.item_id)">
            <img v-if="item.thumbnail" :src="item.thumbnail" class="item-thumb" />
            <div v-else class="item-thumb-placeholder"><q-icon name="image" size="20px" color="grey-5" /></div>
            <div class="item-info">
              <div class="item-title">{{ item.title }}</div>
              <div class="item-meta">
                <span class="meta-badge meta-visits">{{ item.total_visits.toLocaleString('pt-BR') }} vis.</span>
                <span class="meta-badge meta-orders">{{ item.total_orders }} ped.</span>
                <span class="meta-badge" :class="item.promo_pct > 30 ? 'meta-promo' : 'meta-neutral'">
                  {{ item.promo_pct }}% promo
                </span>
              </div>
            </div>
          </div>

          <div v-if="items.length === 0 && !loadingItems" class="sidebar-empty">
            Nenhum anúncio com dados no período.
          </div>
        </div>
      </div>

      <!-- Coluna direita: gráfico + análise causal -->
      <div class="chart-area">

        <!-- Placeholder quando nenhum item selecionado -->
        <div v-if="!selectedItemId" class="chart-placeholder">
          <q-icon name="touch_app" size="48px" color="grey-4" />
          <div class="placeholder-text">Selecione um anúncio para ver a análise</div>
        </div>

        <template v-else>

          <!-- Controles do gráfico -->
          <div class="chart-controls">
            <div class="item-selected-title">{{ selectedItemTitle }}</div>
            <div class="metrics-group">
              <button v-for="m in metricOptions" :key="m.key"
                :class="['metric-btn', selectedMetrics.includes(m.key) && 'metric-btn--on']"
                :style="selectedMetrics.includes(m.key) ? { borderColor: m.color, color: m.color } : {}"
                @click="toggleMetric(m.key)">{{ m.label }}</button>
            </div>
          </div>

          <!-- Gráfico Plotly -->
          <div class="chart-card">
            <div v-if="loadingChart" class="chart-loading">
              <q-spinner-dots color="teal" size="32px" />
              <span>Carregando gráfico...</span>
            </div>
            <div v-else-if="chartError" class="chart-error">{{ chartError }}</div>
            <div v-else ref="plotlyContainer" class="plotly-container"></div>
          </div>

          <!-- Análise Causal -->
          <div class="causal-section">
            <div class="causal-header">
              <q-icon name="science" size="16px" color="teal-7" />
              <span class="causal-title">Análise Causal — O que impacta esse anúncio?</span>
              <q-btn flat round icon="refresh" size="sm" color="teal-7" :loading="loadingCausal"
                @click="loadCausal"><q-tooltip>Recalcular</q-tooltip></q-btn>
            </div>

            <div v-if="loadingCausal" class="causal-loading">
              <q-spinner-dots color="teal" size="24px" />
            </div>

            <template v-else-if="causal">

              <!-- Resumo do período -->
              <div class="kpi-row">
                <div class="mini-kpi">
                  <div class="mini-kpi-label">Visitas médias/dia</div>
                  <div class="mini-kpi-val">{{ causal.resumo?.visitas_media || 0 }}</div>
                </div>
                <div class="mini-kpi">
                  <div class="mini-kpi-label">Conversão média</div>
                  <div class="mini-kpi-val">{{ causal.resumo?.conversao_media || 0 }}%</div>
                </div>
                <div class="mini-kpi">
                  <div class="mini-kpi-label">GMV total</div>
                  <div class="mini-kpi-val">{{ causal.resumo?.gmv_total || '—' }}</div>
                </div>
                <div class="mini-kpi">
                  <div class="mini-kpi-label">Pedidos total</div>
                  <div class="mini-kpi-val">{{ causal.resumo?.pedidos_total || 0 }}</div>
                </div>
              </div>

              <!-- Top insights -->
              <div v-if="causal.top_insights?.length" class="insights-box">
                <div v-for="(insight, i) in causal.top_insights" :key="i" class="insight-item">
                  <q-icon name="lightbulb" size="14px" color="amber-7" />
                  {{ insight }}
                </div>
              </div>

              <!-- Impacto da promoção -->
              <div v-if="causal.impacto_promocao?.dias_com_promo > 0" class="causal-block">
                <div class="causal-block-title">
                  <q-icon name="local_offer" size="14px" color="amber-6" /> Impacto da Promoção
                </div>
                <div class="compare-grid">
                  <div class="compare-col compare-col--promo">
                    <div class="compare-label">Com Promoção ({{ causal.impacto_promocao.dias_com_promo }}d)</div>
                    <div class="compare-stat">{{ causal.impacto_promocao.visitas_com_promo }} vis/dia</div>
                    <div class="compare-stat">{{ causal.impacto_promocao.conv_com_promo_pct }}% conv</div>
                    <div class="compare-stat">{{ causal.impacto_promocao.gmv_medio_com_promo }} GMV/dia</div>
                  </div>
                  <div class="compare-divider">
                    <div class="compare-delta" :class="(causal.impacto_promocao.variacao_visitas_pct || 0) >= 0 ? 'delta-pos' : 'delta-neg'">
                      {{ fmtDelta(causal.impacto_promocao.variacao_visitas_pct) }} vis
                    </div>
                    <div class="compare-delta" :class="(causal.impacto_promocao.variacao_conv_pct || 0) >= 0 ? 'delta-pos' : 'delta-neg'">
                      {{ fmtDelta(causal.impacto_promocao.variacao_conv_pct) }} conv
                    </div>
                  </div>
                  <div class="compare-col compare-col--no-promo">
                    <div class="compare-label">Sem Promoção ({{ causal.impacto_promocao.dias_sem_promo }}d)</div>
                    <div class="compare-stat">{{ causal.impacto_promocao.visitas_sem_promo }} vis/dia</div>
                    <div class="compare-stat">{{ causal.impacto_promocao.conv_sem_promo_pct }}% conv</div>
                    <div class="compare-stat">{{ causal.impacto_promocao.gmv_medio_sem_promo }} GMV/dia</div>
                  </div>
                </div>
              </div>

              <!-- Correlações com visitas -->
              <div v-if="causal.correlacoes?.visitas?.length" class="causal-block">
                <div class="causal-block-title">
                  <q-icon name="trending_up" size="14px" color="teal-6" /> Correlações com Visitas
                </div>
                <div class="corr-list">
                  <div v-for="c in causal.correlacoes.visitas.slice(0, 5)" :key="c.fator" class="corr-item">
                    <div class="corr-bar-wrap">
                      <div class="corr-bar"
                        :style="{ width: Math.abs(c.pearson_r) * 100 + '%', background: c.direcao === 'positiva' ? '#0d9488' : '#ef4444' }">
                      </div>
                    </div>
                    <div class="corr-label">{{ c.fator }}</div>
                    <div class="corr-val" :class="c.direcao === 'positiva' ? 'corr-pos' : 'corr-neg'">
                      r={{ c.pearson_r }}
                      <q-badge v-if="c.significativo" color="teal-8" class="q-ml-xs" label="sig" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Mudanças de preço -->
              <div v-if="causal.mudancas_de_preco?.length" class="causal-block">
                <div class="causal-block-title">
                  <q-icon name="price_change" size="14px" color="red-5" /> Impacto de Mudanças de Preço
                </div>
                <div class="price-changes-list">
                  <div v-for="pc in causal.mudancas_de_preco" :key="pc.date" class="price-change-row">
                    <span class="pc-date">{{ pc.date }}</span>
                    <span class="pc-from">{{ pc.price_from }}</span>
                    <q-icon name="arrow_forward" size="12px" color="grey-5" />
                    <span class="pc-to">{{ pc.price_to }}</span>
                    <span class="pc-pct" :class="pc.change_pct < 0 ? 'delta-pos' : 'delta-neg'">
                      {{ pc.change_pct > 0 ? '+' : '' }}{{ pc.change_pct }}%
                    </span>
                    <span class="pc-impact" :class="(pc.visits_variation_pct || 0) >= 0 ? 'delta-pos' : 'delta-neg'">
                      {{ fmtDelta(pc.visits_variation_pct) }} visitas (±3d)
                    </span>
                  </div>
                </div>
              </div>

            </template>

          </div>
        </template>

      </div>
    </div>

  </q-page>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import MercadoLivreService from 'src/services/MercadoLivreService'

// ── State ──────────────────────────────────────────────────────────────────
const selectedDays   = ref(30)
const sortBy         = ref('visits')
const items          = ref([])
const loadingItems   = ref(false)

const selectedItemId    = ref(null)
const selectedItemTitle = ref('')
const selectedMetrics   = ref(['visits', 'price', 'orders', 'conversion'])

const loadingChart = ref(false)
const chartError   = ref(null)
const plotlyContainer = ref(null)

const loadingCausal = ref(false)
const causal        = ref(null)

// ── Config ─────────────────────────────────────────────────────────────────
const dayPresets = [
  { days: 14,  label: '14d' },
  { days: 30,  label: '30d' },
  { days: 60,  label: '60d' },
  { days: 90,  label: '90d' },
]

const sortOptions = [
  { key: 'visits',  label: 'Visitas' },
  { key: 'gmv',     label: 'GMV' },
  { key: 'orders',  label: 'Pedidos' },
]

const metricOptions = [
  { key: 'visits',     label: 'Visitas',       color: '#63B3ED' },
  { key: 'vis_ma7',    label: 'Vis. MM 7d',    color: '#38BDF8' },
  { key: 'vis_ma15',   label: 'Vis. MM 15d',   color: '#818CF8' },
  { key: 'vis_ma30',   label: 'Vis. MM 30d',   color: '#34D399' },
  { key: 'orders',     label: 'Pedidos',       color: '#48BB78' },
  { key: 'ma7',        label: 'Vend. MM 7d',   color: '#A3E635' },
  { key: 'ma15',       label: 'Vend. MM 15d',  color: '#FB923C' },
  { key: 'ma30',       label: 'Vend. MM 30d',  color: '#E879F9' },
  { key: 'conversion', label: 'Conversão',     color: '#F6AD55' },
  { key: 'price',      label: 'Preço',         color: '#FC8181' },
  { key: 'gmv',        label: 'GMV',           color: '#9F7AEA' },
  { key: 'ads_cost',   label: 'Ads Cost',      color: '#F6E05E' },
  { key: 'ads_roas',   label: 'ROAS',          color: '#FBD38D' },
  { key: 'stock',      label: 'Estoque',       color: '#68D391' },
  { key: 'logistic',   label: 'Logística',     color: '#76E4F7' },
]

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtDelta = (v) => {
  if (v == null) return '—'
  return (v >= 0 ? '+' : '') + v + '%'
}

let plotlyLoaded = false
const loadPlotly = () => new Promise((resolve) => {
  if (plotlyLoaded || window.Plotly) { plotlyLoaded = true; resolve(); return }
  const script = document.createElement('script')
  script.src = 'https://cdn.plot.ly/plotly-basic-3.0.0.min.js'
  script.onload = () => { plotlyLoaded = true; resolve() }
  document.head.appendChild(script)
})

// ── Actions ────────────────────────────────────────────────────────────────
async function loadItems() {
  loadingItems.value = true
  try {
    const res = await MercadoLivreService.getAnalyticsItems({
      days: selectedDays.value,
      sort_by: sortBy.value,
      limit: 80,
    })
    items.value = res.data.items || []
  } catch (e) {
    console.error('loadItems error', e)
    items.value = []
  } finally {
    loadingItems.value = false
  }
}

async function selectItem(itemId) {
  selectedItemId.value = itemId
  const found = items.value.find(i => i.item_id === itemId)
  selectedItemTitle.value = found?.title || itemId
  causal.value = null
  await Promise.all([loadChart(), loadCausal()])
}

async function loadChart() {
  loadingChart.value = true
  chartError.value = null
  try {
    await loadPlotly()
    const res = await MercadoLivreService.getItemTimelineChart(selectedItemId.value, {
      days: selectedDays.value,
      metrics: selectedMetrics.value.join(','),
    })
    const spec = res.data
    if (spec.error) { chartError.value = spec.error; return }

    // Esconde o spinner ANTES de renderizar para que o container apareça no DOM
    loadingChart.value = false
    await nextTick()

    if (plotlyContainer.value) {
      window.Plotly.react(plotlyContainer.value, spec.chart.data, spec.chart.layout, {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['toImage', 'sendDataToCloud'],
      })
    }
  } catch (e) {
    console.error('loadChart error', e)
    chartError.value = 'Erro ao carregar gráfico.'
  } finally {
    loadingChart.value = false
  }
}

async function loadCausal() {
  if (!selectedItemId.value) return
  loadingCausal.value = true
  try {
    const res = await MercadoLivreService.getItemCausalAnalysis(selectedItemId.value, {
      days: selectedDays.value,
    })
    causal.value = res.data
  } catch (e) {
    console.error('loadCausal error', e)
    causal.value = null
  } finally {
    loadingCausal.value = false
  }
}

function toggleMetric(key) {
  const idx = selectedMetrics.value.indexOf(key)
  if (idx >= 0) {
    if (selectedMetrics.value.length > 1) selectedMetrics.value.splice(idx, 1)
  } else {
    selectedMetrics.value.push(key)
  }
  if (selectedItemId.value) loadChart()
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(() => loadItems())
</script>

<style scoped>
.analytics-page {
  background: #f7f9fc;
  min-height: 100vh;
}

/* ── Header ── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px 14px;
  background: #fff;
  border-bottom: 1px solid #e8edf3;
}
.header-left { display: flex; align-items: center; gap: 12px; }
.header-icon {
  width: 36px; height: 36px;
  background: linear-gradient(135deg, #0d9488, #0891b2);
  border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff;
}
.header-eyebrow { font-size: 10px; color: #7c8db5; text-transform: uppercase; letter-spacing: .5px; }
.header-title { font-size: 16px; font-weight: 700; color: #1a1f36; }
.header-right { display: flex; align-items: center; gap: 10px; }

.date-range-group { display: flex; gap: 4px; }
.date-preset-btn {
  padding: 4px 10px; border-radius: 6px; border: 1.5px solid #e8edf3;
  background: transparent; font-size: 12px; color: #7c8db5; cursor: pointer; transition: all .15s;
}
.date-preset-btn--on { background: #0d9488; border-color: #0d9488; color: #fff; font-weight: 600; }

/* ── Layout ── */
.analytics-layout {
  display: flex;
  gap: 0;
  height: calc(100vh - 70px);
  overflow: hidden;
}

/* ── Sidebar ── */
.items-sidebar {
  width: 300px;
  min-width: 240px;
  background: #fff;
  border-right: 1px solid #e8edf3;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sidebar-header {
  padding: 12px 14px 8px;
  border-bottom: 1px solid #f0f2f7;
}
.sidebar-title { font-size: 12px; font-weight: 700; color: #1a1f36; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
.sort-group { display: flex; gap: 4px; }
.sort-btn {
  padding: 3px 8px; border-radius: 5px; border: 1px solid #e8edf3;
  background: transparent; font-size: 11px; color: #7c8db5; cursor: pointer;
}
.sort-btn--on { background: #f0fdf4; border-color: #0d9488; color: #0d9488; font-weight: 600; }

.sidebar-loading { padding: 32px; display: flex; justify-content: center; }
.sidebar-empty { padding: 24px; text-align: center; color: #9aa0ac; font-size: 13px; }

.items-list { flex: 1; overflow-y: auto; }

.item-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #f7f9fc;
  transition: background .12s;
}
.item-row:hover { background: #f7f9fc; }
.item-row--active { background: #f0fdf4; border-left: 3px solid #0d9488; }

.item-thumb {
  width: 40px; height: 40px; border-radius: 6px; object-fit: cover;
  border: 1px solid #e8edf3; flex-shrink: 0;
}
.item-thumb-placeholder {
  width: 40px; height: 40px; border-radius: 6px; background: #f7f9fc;
  border: 1px solid #e8edf3; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.item-info { flex: 1; min-width: 0; }
.item-title { font-size: 12px; font-weight: 500; color: #1a1f36; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-meta { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
.meta-badge { font-size: 10px; padding: 2px 5px; border-radius: 4px; font-weight: 600; }
.meta-visits { background: #ebf8ff; color: #2b6cb0; }
.meta-orders { background: #f0fdf4; color: #276749; }
.meta-promo  { background: #fffbeb; color: #975a16; }
.meta-neutral{ background: #f7f9fc; color: #7c8db5; }

/* ── Chart area ── */
.chart-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 16px;
  gap: 16px;
}

.chart-placeholder {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
}
.placeholder-text { color: #9aa0ac; font-size: 14px; }

.chart-controls {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
}
.item-selected-title {
  font-size: 14px; font-weight: 600; color: #1a1f36;
  max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.metrics-group { display: flex; flex-wrap: wrap; gap: 4px; }
.metric-btn {
  padding: 4px 10px; border-radius: 6px; border: 1.5px solid #e8edf3;
  background: transparent; font-size: 11px; color: #7c8db5; cursor: pointer; transition: all .12s;
}
.metric-btn--on { font-weight: 600; }

.chart-card {
  background: #1a202c;
  border-radius: 12px;
  overflow: hidden;
  min-height: 380px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chart-loading, .chart-error { display: flex; gap: 10px; align-items: center; color: #e2e8f0; font-size: 13px; }
.chart-error { color: #fc8181; }
.plotly-container { width: 100%; min-height: 380px; }

/* ── Causal section ── */
.causal-section {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e8edf3;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.causal-header {
  display: flex; align-items: center; gap: 8px;
}
.causal-title { font-size: 13px; font-weight: 700; color: #1a1f36; flex: 1; }
.causal-loading { display: flex; justify-content: center; padding: 20px; }

.kpi-row { display: flex; gap: 12px; flex-wrap: wrap; }
.mini-kpi {
  background: #f7f9fc; border-radius: 8px; padding: 10px 14px; flex: 1; min-width: 100px;
}
.mini-kpi-label { font-size: 10px; color: #7c8db5; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 4px; }
.mini-kpi-val { font-size: 18px; font-weight: 700; color: #1a1f36; }

.insights-box {
  background: #fffbeb; border-radius: 8px; padding: 12px;
  display: flex; flex-direction: column; gap: 6px;
}
.insight-item { display: flex; align-items: flex-start; gap: 6px; font-size: 12px; color: #92400e; }

.causal-block { display: flex; flex-direction: column; gap: 8px; }
.causal-block-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 700; color: #4a5568; text-transform: uppercase; letter-spacing: .4px;
}

/* Compare grid */
.compare-grid { display: flex; align-items: flex-start; gap: 16px; }
.compare-col { flex: 1; }
.compare-col--promo .compare-label { color: #d97706; }
.compare-col--no-promo .compare-label { color: #7c8db5; }
.compare-label { font-size: 11px; font-weight: 600; margin-bottom: 6px; }
.compare-stat { font-size: 13px; color: #1a1f36; line-height: 1.8; }
.compare-divider {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding-top: 20px;
}
.compare-delta { font-size: 13px; font-weight: 700; }

/* Correlations */
.corr-list { display: flex; flex-direction: column; gap: 8px; }
.corr-item { display: flex; align-items: center; gap: 10px; }
.corr-bar-wrap { width: 120px; background: #f0f2f7; border-radius: 4px; height: 6px; overflow: hidden; }
.corr-bar { height: 100%; border-radius: 4px; transition: width .3s; }
.corr-label { font-size: 12px; color: #4a5568; flex: 1; }
.corr-val { font-size: 12px; font-weight: 600; white-space: nowrap; }
.corr-pos { color: #0d9488; }
.corr-neg { color: #ef4444; }

/* Price changes */
.price-changes-list { display: flex; flex-direction: column; gap: 6px; }
.price-change-row { display: flex; align-items: center; gap: 8px; font-size: 12px; flex-wrap: wrap; }
.pc-date { color: #7c8db5; min-width: 80px; }
.pc-from { color: #9aa0ac; }
.pc-to { color: #1a1f36; font-weight: 600; }
.pc-pct { font-weight: 700; }
.pc-impact { font-weight: 600; }

.delta-pos { color: #0d9488; }
.delta-neg { color: #ef4444; }

@media (max-width: 600px) {
  .page-header { padding: 10px 12px; }
  .content-body { padding: 12px; }
}
</style>
