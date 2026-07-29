<template>
  <q-page class="ads-page">

    <!-- ══════════════════════════════════════════════════════ HEADER -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon">
          <q-icon name="campaign" size="20px" />
        </div>
        <div>
          <div class="header-eyebrow">Shopee Ads</div>
          <div class="header-title">Publicidade</div>
        </div>
      </div>
      <div class="header-right">

        <!-- Date presets + inputs -->
        <div class="date-range-group">
          <button
            v-for="p in datePresets" :key="p.key"
            :class="['date-preset-btn', activeDatePreset === p.key && 'date-preset-btn--on']"
            @click="applyPreset(p.key)"
          >{{ p.label }}</button>

          <div class="date-inputs">
            <q-input v-model="dateFrom" type="date" dense borderless class="date-inp"
              @update:model-value="activeDatePreset = null; load()" />
            <span class="date-sep">→</span>
            <q-input v-model="dateTo" type="date" dense borderless class="date-inp"
              @update:model-value="activeDatePreset = null; load()" />
          </div>
        </div>

        <!-- Filtro de conta (visível só com >1 conta) -->
        <div v-if="allAccounts.length > 1" class="account-filter">
          <button
            :class="['acc-filter-btn', selectedAccountId === null && 'acc-filter-btn--on']"
            @click="selectedAccountId = null; load()">Todas</button>
          <button
            v-for="a in allAccounts" :key="a.account_id"
            :class="['acc-filter-btn', selectedAccountId === a.account_id && 'acc-filter-btn--on']"
            @click="selectedAccountId = a.account_id; load()">{{ a.shop_name }}</button>
        </div>

        <q-btn flat round icon="refresh" color="orange-7" :loading="loading" @click="load" size="sm">
          <q-tooltip>Atualizar</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════ STATS BAR -->
    <div class="stats-bar">
      <div class="stats-bar-label">
        <q-icon name="bar_chart" size="13px" class="q-mr-xs" />
        {{ formatDateBR(dateFrom) }} — {{ formatDateBR(dateTo) }}
      </div>

      <template v-if="loading || !overview">
        <div class="stat-card stat-card--skeleton" v-for="n in 5" :key="n" />
      </template>
      <template v-else>
        <div class="stat-card stat-card--spend">
          <div class="stat-icon"><q-icon name="payments" size="16px" /></div>
          <div class="stat-body">
            <div class="stat-val">{{ formatCurrency(overview.total_cost) }}</div>
            <div class="stat-label">Investimento Total</div>
          </div>
        </div>

        <div class="stat-card" :class="overview.total_acos <= 10 ? 'stat-card--pos' : overview.total_acos <= 20 ? 'stat-card--warn' : 'stat-card--neg'">
          <div class="stat-icon"><q-icon name="percent" size="16px" /></div>
          <div class="stat-body">
            <div class="stat-val">{{ Number(overview.total_acos || 0).toFixed(1) }}%</div>
            <div class="stat-label">ACOS Médio</div>
            <div class="stat-sub">custo / vendas ads</div>
          </div>
        </div>

        <div class="stat-card stat-card--neutral">
          <div class="stat-icon"><q-icon name="ads_click" size="16px" /></div>
          <div class="stat-body">
            <div class="stat-val">{{ (overview.total_clicks || 0).toLocaleString('pt-BR') }}</div>
            <div class="stat-label">Clicks</div>
            <div class="stat-sub">{{ formatNumber(overview.total_prints) }} impressões</div>
          </div>
        </div>

        <div class="stat-card stat-card--teal">
          <div class="stat-icon"><q-icon name="trending_up" size="16px" /></div>
          <div class="stat-body">
            <div class="stat-val">{{ formatCurrency(overview.total_ads_revenue) }}</div>
            <div class="stat-label">Receita via Ads</div>
            <div class="stat-sub">atribuída às campanhas</div>
          </div>
        </div>

        <div class="stat-card" :class="(overview.total_broad_roas||0) >= 5 ? 'stat-card--pos' : (overview.total_broad_roas||0) >= 2 ? 'stat-card--warn' : 'stat-card--neg'">
          <div class="stat-icon"><q-icon name="show_chart" size="16px" /></div>
          <div class="stat-body">
            <div class="stat-val">{{ Number(overview.total_broad_roas || 0).toFixed(2) }}x</div>
            <div class="stat-label">ROAS Broad</div>
            <div class="stat-sub">receita / investimento</div>
          </div>
        </div>

        <div class="stat-card stat-card--teal" v-if="overview.total_balance != null">
          <div class="stat-icon"><q-icon name="account_balance_wallet" size="16px" /></div>
          <div class="stat-body">
            <div class="stat-val">{{ formatCurrency(overview.total_balance) }}</div>
            <div class="stat-label">Saldo em Ads</div>
            <div class="stat-sub">crédito disponível</div>
          </div>
        </div>
      </template>
    </div>

    <!-- ══════════════════════════════════════════════════════ TABS -->
    <div class="ads-tabs">
      <button v-for="tab in tabs" :key="tab.key"
        :class="['ads-tab', activeTab === tab.key && 'ads-tab--on']"
        @click="activeTab = tab.key">
        <q-icon :name="tab.icon" size="14px" class="q-mr-xs" />{{ tab.label }}
      </button>
    </div>

    <!-- ══════════════════════════════════════════════════════ TAB: CAMPANHAS -->
    <div v-if="activeTab === 'campaigns'" class="tab-body">
      <template v-if="loading">
        <div class="skeleton-rows">
          <div class="skeleton-row" v-for="n in 3" :key="n" />
        </div>
      </template>
      <template v-else-if="overview && overview.accounts.length">
        <div v-for="acc in overview.accounts" :key="acc.account_id" class="account-block">
          <div class="account-header">
            <div class="account-name">
              <div class="account-dot" />{{ acc.shop_name }}
            </div>
            <div class="account-meta">
              <span class="meta-chip meta-chip--spend">{{ formatCurrency(acc.cost) }} investido</span>
              <span class="meta-chip" :class="acc.acos <= 10 ? 'meta-chip--pos' : acc.acos <= 20 ? 'meta-chip--warn' : 'meta-chip--neg'">ACOS {{ acc.acos }}%</span>
              <span class="meta-chip meta-chip--neutral">{{ acc.clicks.toLocaleString('pt-BR') }} clicks</span>
              <span class="meta-chip meta-chip--teal" v-if="acc.balance != null">
                <q-icon name="account_balance_wallet" size="12px" class="q-mr-xs" />Saldo {{ formatCurrency(acc.balance) }}
              </span>
            </div>
          </div>

          <div class="camp-table-wrap">
            <table class="camp-table">
              <thead>
                <tr>
                  <th class="th-name">Campanha</th>
                  <th>Status</th>
                  <th>Tipo</th>
                  <th class="th-num">Investido</th>
                  <th class="th-num">Receita Ads</th>
                  <th class="th-num">ROAS</th>
                  <th class="th-num">ACOS</th>
                  <th class="th-num">Clicks</th>
                  <th class="th-num">Impressões</th>
                  <th class="th-num">CPC</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="camp in acc.campaigns" :key="camp.id"
                  :class="['camp-row', selectedCampaign === camp.id && 'camp-row--selected']"
                  @click="selectCampaign(camp, acc)">
                  <td class="td-name"><div class="camp-name">{{ camp.name }}</div></td>
                  <td><span :class="['status-badge', `status-badge--${camp.status}`]">{{ statusLabel(camp.status) }}</span></td>
                  <td><span class="strategy-badge">{{ adTypeLabel(camp.ad_type) }}</span></td>
                  <td class="td-num">{{ formatCurrency(camp.cost) }}</td>
                  <td class="td-num">{{ formatCurrency(camp.total_amount) }}</td>
                  <td class="td-num td-muted">{{ camp.broad_roas > 0 ? camp.broad_roas.toFixed(2) + 'x' : '—' }}</td>
                  <td class="td-num">
                    <span :class="['acos-chip', camp.acos <= 10 ? 'acos-chip--pos' : camp.acos <= 20 ? 'acos-chip--warn' : 'acos-chip--neg']">{{ camp.acos }}%</span>
                  </td>
                  <td class="td-num">{{ camp.clicks.toLocaleString('pt-BR') }}</td>
                  <td class="td-num td-muted">{{ formatNumber(camp.prints) }}</td>
                  <td class="td-num td-muted">{{ formatCurrency(camp.cpc) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
      <div v-else-if="!loading" class="empty-state">
        <q-icon name="campaign" size="40px" style="color:#9aa0ac" />
        <div>Nenhum dado de campanhas no período selecionado</div>
        <div style="font-size:12px; color:#9aa0ac; margin-top:8px">Aguarde o próximo sync automático ou ative campanhas no Seller Center</div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════ TAB: TENDÊNCIA -->
    <div v-if="activeTab === 'trend'" class="tab-body">
      <div class="trend-controls">
        <div class="metric-pills">
          <button v-for="m in trendMetrics" :key="m.key"
            :class="['metric-pill', activeTrendMetric === m.key && 'metric-pill--on']"
            @click="activeTrendMetric = m.key">
            {{ m.label }}
          </button>
        </div>
      </div>

      <template v-if="loading">
        <div class="chart-skeleton" />
      </template>
      <template v-else-if="dailyData.length">
        <div class="chart-area">
          <div class="bar-chart">
            <div class="bar-chart-y-labels">
              <span v-for="tick in yTicks" :key="tick">{{ formatTick(tick) }}</span>
            </div>
            <div class="bar-chart-bars">
              <div v-for="d in dailyData" :key="d.date" class="bar-wrap">
                <q-tooltip anchor="bottom middle" self="top middle">
                  <div class="bar-tooltip">
                    <div class="bar-tooltip-date">{{ formatDateBR(d.date) }}</div>
                    <div v-for="m in trendMetrics" :key="m.key">{{ m.label }}: <strong>{{ m.fmt(d[m.key] || 0) }}</strong></div>
                  </div>
                </q-tooltip>
                <div class="bar" :style="{ height: getBarHeight(d[activeTrendMetric] || 0) + '%' }" :class="['bar--' + activeTrendMetric]" />
                <div class="bar-label">{{ formatDayShort(d.date) }}</div>
              </div>
            </div>
          </div>

          <div class="daily-table-wrap">
            <table class="camp-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th class="th-num">Investido</th>
                  <th class="th-num">Receita Ads</th>
                  <th class="th-num">ROAS</th>
                  <th class="th-num">ACOS</th>
                  <th class="th-num">Clicks</th>
                  <th class="th-num">Impressões</th>
                  <th class="th-num">CPC</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in [...dailyData].reverse()" :key="d.date" class="camp-row">
                  <td><span class="date-cell">{{ formatDateBR(d.date) }}</span></td>
                  <td class="td-num">{{ formatCurrency(d.cost) }}</td>
                  <td class="td-num">{{ formatCurrency(d.total_amount) }}</td>
                  <td class="td-num td-muted">{{ d.broad_roas > 0 ? Number(d.broad_roas).toFixed(2) + 'x' : '—' }}</td>
                  <td class="td-num">
                    <span :class="['acos-chip', d.acos <= 10 ? 'acos-chip--pos' : d.acos <= 20 ? 'acos-chip--warn' : 'acos-chip--neg']">{{ d.acos.toFixed(1) }}%</span>
                  </td>
                  <td class="td-num">{{ d.clicks.toLocaleString('pt-BR') }}</td>
                  <td class="td-num td-muted">{{ formatNumber(d.prints) }}</td>
                  <td class="td-num td-muted">{{ formatCurrency(d.cpc) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
      <div v-else class="empty-state">
        <q-icon name="show_chart" size="40px" style="color:#9aa0ac" />
        <div>Nenhum dado para o período selecionado</div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════ CAMPAIGN DETAIL PANEL -->
    <q-dialog v-model="campDetailOpen" position="right" full-height maximized>
      <q-card class="camp-detail-card" v-if="campDetail">
        <div class="camp-detail-header">
          <div>
            <div class="camp-detail-title">{{ campDetail.name }}</div>
            <div class="camp-detail-subtitle">
              <span :class="['status-badge', `status-badge--${campDetail.status}`]">{{ statusLabel(campDetail.status) }}</span>
              <span class="strategy-badge q-ml-xs">{{ adTypeLabel(campDetail.ad_type) }}</span>
            </div>
          </div>
          <q-btn flat round icon="close" dense @click="campDetailOpen = false" color="grey-6" />
        </div>

        <div class="camp-detail-scroll">
          <div class="detail-metrics-grid">
            <div class="detail-metric">
              <div class="detail-metric-val">{{ formatCurrency(campDetail.cost) }}</div>
              <div class="detail-metric-label">Investimento</div>
            </div>
            <div class="detail-metric">
              <div class="detail-metric-val" :class="campDetail.acos <= 10 ? 'val-pos' : campDetail.acos <= 20 ? 'val-warn' : 'val-neg'">
                {{ campDetail.acos }}%
              </div>
              <div class="detail-metric-label">ACOS</div>
            </div>
            <div class="detail-metric">
              <div class="detail-metric-val" :class="(campDetail.broad_roas||0) >= 5 ? 'val-pos' : (campDetail.broad_roas||0) >= 2 ? 'val-warn' : ''">
                {{ campDetail.broad_roas > 0 ? campDetail.broad_roas.toFixed(2) + 'x' : '—' }}
              </div>
              <div class="detail-metric-label">ROAS Broad</div>
            </div>
            <div class="detail-metric">
              <div class="detail-metric-val">{{ formatCurrency(campDetail.total_amount) }}</div>
              <div class="detail-metric-label">Receita Broad</div>
            </div>
            <div class="detail-metric">
              <div class="detail-metric-val">{{ formatCurrency(campDetail.direct_amount) }}</div>
              <div class="detail-metric-label">Receita Direta</div>
            </div>
            <div class="detail-metric">
              <div class="detail-metric-val">{{ campDetail.clicks.toLocaleString('pt-BR') }}</div>
              <div class="detail-metric-label">Clicks</div>
            </div>
            <div class="detail-metric">
              <div class="detail-metric-val">{{ formatNumber(campDetail.prints) }}</div>
              <div class="detail-metric-label">Impressões</div>
            </div>
            <div class="detail-metric">
              <div class="detail-metric-val">{{ formatCurrency(campDetail.cpc) }}</div>
              <div class="detail-metric-label">CPC</div>
            </div>
          </div>

          <div class="detail-section-title">Configuração</div>
          <div class="detail-config-rows">
            <div class="detail-config-row">
              <span class="detail-config-label">Budget diário</span>
              <span class="detail-config-val">{{ campDetail.budget > 0 ? formatCurrency(campDetail.budget) : 'Automático' }}</span>
            </div>
            <div class="detail-config-row" v-if="campDetail.roas_target != null">
              <span class="detail-config-label">ROAS Target</span>
              <span class="detail-config-val">{{ campDetail.roas_target > 0 ? campDetail.roas_target.toFixed(2) + 'x' : 'Automático' }}</span>
            </div>
          </div>

          <template v-if="campDetail.item_ids && campDetail.item_ids.length">
            <div class="detail-section-title">Produtos vinculados</div>
            <div class="detail-config-rows">
              <div class="detail-config-row" v-for="iid in campDetail.item_ids" :key="iid">
                <span class="detail-config-label">Item ID</span>
                <span class="detail-config-val">{{ iid }}</span>
              </div>
            </div>
          </template>
        </div>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from 'src/boot/axios'

// ── Constants ────────────────────────────────────────────────────────────────
const tabs = [
  { key: 'campaigns', label: 'Por Campanha', icon: 'business'   },
  { key: 'trend',     label: 'Tendência',    icon: 'show_chart' },
]

const datePresets = [
  { label: 'Hoje',   key: 'today'     },
  { label: 'Ontem',  key: 'yesterday' },
  { label: '7d',     key: 7           },
  { label: '14d',    key: 14          },
  { label: '30d',    key: 30          },
  { label: '90d',    key: 90          },
]

const trendMetrics = [
  { key: 'cost',         label: 'Investido',   fmt: v => formatCurrency(v) },
  { key: 'total_amount', label: 'Receita Ads', fmt: v => formatCurrency(v) },
  { key: 'broad_roas',   label: 'ROAS',        fmt: v => Number(v).toFixed(2) + 'x' },
  { key: 'acos',         label: 'ACOS %',      fmt: v => Number(v).toFixed(1) + '%' },
  { key: 'clicks',       label: 'Clicks',      fmt: v => Number(v).toLocaleString('pt-BR') },
]

// ── State ─────────────────────────────────────────────────────────────────────
const loading           = ref(false)
const activeTab         = ref('campaigns')
const activeDatePreset  = ref(30)
const activeTrendMetric = ref('cost')

const dateFrom = ref('')
const dateTo   = ref('')

const overview         = ref(null)
const dailyData        = ref([])
const selectedAccountId = ref(null)

const allAccounts = computed(() => overview.value?.accounts || [])

const selectedCampaign = ref(null)
const campDetail       = ref(null)
const campDetailOpen   = ref(false)

// ── Computed ──────────────────────────────────────────────────────────────────
const maxBarVal = computed(() => {
  if (!dailyData.value.length) return 1
  return Math.max(...dailyData.value.map(d => d[activeTrendMetric.value] || 0)) || 1
})

const yTicks = computed(() => {
  const max = maxBarVal.value
  const step = max / 4
  return [max, max - step, max - step * 2, max - step * 3, 0].map(v => Math.round(v * 100) / 100)
})

// ── Init ──────────────────────────────────────────────────────────────────────
onMounted(() => {
  applyPreset(30)
})

// ── Methods ───────────────────────────────────────────────────────────────────
function applyPreset(key) {
  activeDatePreset.value = key
  const today    = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  if (key === 'today') {
    dateFrom.value = todayStr
    dateTo.value   = todayStr
  } else if (key === 'yesterday') {
    const y = new Date(today); y.setDate(today.getDate() - 1)
    const yStr = y.toISOString().slice(0, 10)
    dateFrom.value = yStr
    dateTo.value   = yStr
  } else {
    const from = new Date(today); from.setDate(today.getDate() - key + 1)
    dateFrom.value = from.toISOString().slice(0, 10)
    dateTo.value   = todayStr
  }
  load()
}

async function load() {
  loading.value = true
  try {
    const params = { date_from: dateFrom.value, date_to: dateTo.value }
    if (selectedAccountId.value) params.account = selectedAccountId.value
    const [ovRes, dailyRes] = await Promise.all([
      api.get('/shopee/ads/overview/', { params }),
      api.get('/shopee/ads/daily/',    { params }),
    ])
    overview.value  = ovRes.data
    dailyData.value = Array.isArray(dailyRes.data) ? dailyRes.data : []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function selectCampaign(camp, acc) {
  selectedCampaign.value = camp.id
  campDetail.value = { ...camp }
  campDetailOpen.value = true
}

function getBarHeight(val) {
  return maxBarVal.value > 0 ? Math.max(2, (val / maxBarVal.value) * 100) : 2
}

function statusLabel(s) {
  const map = {
    ongoing:   'Em andamento',
    paused:    'Pausada',
    suspended: 'Suspensa',
    closed:    'Encerrada',
    ended:     'Encerrada',
    pending:   'Pendente',
    deleted:   'Deletada',
  }
  return map[s] || s || '—'
}

function adTypeLabel(t) {
  if (t === 'shop_gms') return 'Shop GMV Max'
  if (t === 'manual' || t === 1) return 'CPC Manual'
  if (t === 'auto'   || t === 2) return 'CPC Auto'
  return t || '—'
}

// ── Formatters ─────────────────────────────────────────────────────────────────
function formatCurrency(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val || 0))
}

function formatNumber(val) {
  if (!val) return '0'
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M'
  if (val >= 1_000)     return (val / 1_000).toFixed(1) + 'k'
  return String(val)
}

function formatDateBR(val) {
  if (!val) return '—'
  const [y, m, d] = val.split('-')
  return `${d}/${m}/${y}`
}

function formatDayShort(val) {
  if (!val) return ''
  const [, m, d] = val.split('-')
  return `${d}/${m}`
}

function formatTick(val) {
  if (activeTrendMetric.value === 'cost' || activeTrendMetric.value === 'total_amount')
    return 'R$' + val.toFixed(0)
  if (activeTrendMetric.value === 'acos')
    return val.toFixed(0) + '%'
  return formatNumber(val)
}
</script>

<style scoped>
/* ─── PAGE ──────────────────────────────────────────────────────────────── */
.ads-page { background: #f5f7fa; min-height: 100vh; }

/* ─── HEADER ─────────────────────────────────────────────────────────────── */
.page-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 24px; background: #fff;
  border-bottom: 1.5px solid #e8edf3; flex-wrap: wrap; gap: 12px;
}
.header-left  { display: flex; align-items: center; gap: 12px; }
.header-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.header-icon  {
  width: 38px; height: 38px;
  background: linear-gradient(135deg, #ee4d2d, #f97316);
  border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff;
}
.header-eyebrow { font-size: 10px; color: #9aa0ac; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
.header-title   { font-size: 17px; font-weight: 700; color: #1a1f36; }

/* Date range */
.date-range-group { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.date-preset-btn {
  font-size: 11px; font-weight: 600; padding: 4px 9px;
  border-radius: 6px; border: 1.5px solid #e8edf3;
  background: #fff; color: #6b7280; cursor: pointer; transition: all .15s;
}
.date-preset-btn--on { background: #ee4d2d; border-color: #ee4d2d; color: #fff; }
.date-preset-btn:hover:not(.date-preset-btn--on) { border-color: #ee4d2d; }
.date-inputs { display: flex; align-items: center; gap: 4px; background: #f5f7fa; border-radius: 8px; padding: 2px 8px; border: 1.5px solid #e8edf3; }
.date-inp { font-size: 12px; width: 100px; }
.date-sep { color: #9aa0ac; font-size: 12px; }

/* ─── STATS BAR ──────────────────────────────────────────────────────────── */
.stats-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 24px; background: #f8f9fa;
  border-bottom: 1px solid #e8eaed; flex-wrap: wrap;
}
.stats-bar-label {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .6px; color: #9aa0ac;
  display: flex; align-items: center; white-space: nowrap; margin-right: 4px;
}
.stat-card {
  display: flex; align-items: center; gap: 8px;
  background: #fff; border: 1.5px solid #e8edf3; border-radius: 10px;
  padding: 8px 14px; min-width: 130px;
}
.stat-card--skeleton { min-width: 130px; height: 48px; background: #f0f0f0; border-radius: 10px; animation: pulse 1.4s infinite; }
.stat-card--spend  { border-color: #fee2e2; background: #fff7f6; }
.stat-card--pos    { border-color: #d1fae5; background: #f0fdf4; }
.stat-card--warn   { border-color: #fef3c7; background: #fffbeb; }
.stat-card--neg    { border-color: #fee2e2; background: #fff1f2; }
.stat-card--neutral{ border-color: #e0e7ff; background: #eef2ff; }
.stat-card--teal   { border-color: #e0f2fe; background: #f0f9ff; }
.stat-icon { color: #9aa0ac; flex-shrink: 0; }
.stat-val  { font-size: 14px; font-weight: 700; color: #1a1f36; }
.stat-label{ font-size: 10px; color: #9aa0ac; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; }
.stat-sub  { font-size: 10px; color: #b0b7c3; }

/* ─── TABS ───────────────────────────────────────────────────────────────── */
.ads-tabs { display: flex; gap: 0; background: #fff; border-bottom: 1.5px solid #e8edf3; padding: 0 24px; }
.ads-tab {
  font-size: 12px; font-weight: 600; padding: 10px 16px;
  border: none; border-bottom: 2.5px solid transparent;
  background: none; color: #9aa0ac; cursor: pointer; transition: all .15s;
  display: flex; align-items: center;
}
.ads-tab--on { color: #ee4d2d; border-bottom-color: #ee4d2d; }
.ads-tab:hover:not(.ads-tab--on) { color: #1a1f36; }

/* ─── TAB BODY ───────────────────────────────────────────────────────────── */
.tab-body { padding: 20px 24px; }

/* ─── ACCOUNT BLOCK ──────────────────────────────────────────────────────── */
.account-block { background: #fff; border-radius: 12px; border: 1.5px solid #e8edf3; margin-bottom: 20px; overflow: hidden; }
.account-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 18px; background: #f8f9fa; border-bottom: 1px solid #e8edf3; flex-wrap: wrap; gap: 8px;
}
.account-name  { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #1a1f36; }
.account-dot   { width: 8px; height: 8px; border-radius: 50%; background: #ee4d2d; flex-shrink: 0; }
.account-meta  { display: flex; gap: 6px; flex-wrap: wrap; }
.meta-chip     { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 20px; background: #f0f0f0; color: #6b7280; }
.meta-chip--spend { background: #fff7f6; color: #ef4444; border: 1px solid #fee2e2; }
.meta-chip--pos   { background: #f0fdf4; color: #16a34a; border: 1px solid #d1fae5; }
.meta-chip--warn  { background: #fffbeb; color: #d97706; border: 1px solid #fef3c7; }
.meta-chip--neg   { background: #fff1f2; color: #ef4444; border: 1px solid #fee2e2; }
.meta-chip--neutral { background: #eef2ff; color: #4f46e5; border: 1px solid #e0e7ff; }
.meta-chip--teal    { background: #f0fdf4; color: #0d9488; border: 1px solid #ccfbf1; }

/* ─── CAMPAIGN TABLE ─────────────────────────────────────────────────────── */
.camp-table-wrap { overflow-x: auto; }
.camp-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.camp-table th {
  padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .5px; color: #9aa0ac;
  background: #fafafa; border-bottom: 1.5px solid #e8edf3; white-space: nowrap;
}
.camp-table td { padding: 9px 12px; border-bottom: 1px solid #f0f0f0; }
.th-name { width: 260px; }
.th-num, .td-num { text-align: right; }
.td-muted { color: #9aa0ac; }
.camp-row { cursor: pointer; transition: background .12s; }
.camp-row:hover { background: #fafafa; }
.camp-row--selected { background: #fff7f6 !important; }
.camp-name { font-weight: 600; color: #1a1f36; max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Badges */
.status-badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; white-space: nowrap; }
.status-badge--ongoing   { background: #d1fae5; color: #065f46; }
.status-badge--paused    { background: #fef3c7; color: #92400e; }
.status-badge--suspended { background: #fef3c7; color: #92400e; }
.status-badge--closed    { background: #f3f4f6; color: #6b7280; }
.status-badge--ended     { background: #f3f4f6; color: #6b7280; }
.status-badge--pending   { background: #e0e7ff; color: #3730a3; }
.status-badge--deleted   { background: #fee2e2; color: #991b1b; }
.status-badge--active    { background: #d1fae5; color: #065f46; }
.strategy-badge { display: inline-block; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 20px; background: #e0e7ff; color: #3730a3; }
.acos-chip { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 6px; }
.acos-chip--pos { background: #d1fae5; color: #065f46; }
.acos-chip--warn{ background: #fef3c7; color: #92400e; }
.acos-chip--neg { background: #fee2e2; color: #991b1b; }

/* ─── SKELETON / EMPTY ───────────────────────────────────────────────────── */
.skeleton-rows { display: flex; flex-direction: column; gap: 12px; }
.skeleton-row  { height: 90px; background: #f0f0f0; border-radius: 10px; animation: pulse 1.4s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: .5 } }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 60px 0; color: #9aa0ac; font-size: 13px; }

/* ─── TREND CHART ────────────────────────────────────────────────────────── */
.trend-controls { margin-bottom: 16px; }
.metric-pills   { display: flex; gap: 6px; flex-wrap: wrap; }
.metric-pill    {
  font-size: 11px; font-weight: 600; padding: 5px 12px;
  border-radius: 20px; border: 1.5px solid #e8edf3;
  background: #fff; color: #6b7280; cursor: pointer; transition: all .15s;
}
.metric-pill--on { background: #ee4d2d; border-color: #ee4d2d; color: #fff; }
.metric-pill:hover:not(.metric-pill--on) { border-color: #ee4d2d; }

.chart-skeleton { height: 160px; background: #f0f0f0; border-radius: 10px; animation: pulse 1.4s infinite; margin-bottom: 16px; }
.chart-area { display: flex; flex-direction: column; gap: 16px; }

.bar-chart { display: flex; gap: 6px; height: 160px; }
.bar-chart-y-labels {
  display: flex; flex-direction: column; justify-content: space-between;
  font-size: 9px; color: #9aa0ac; text-align: right; width: 44px; flex-shrink: 0; padding-bottom: 20px;
}
.bar-chart-bars {
  flex: 1; display: flex; align-items: flex-end; gap: 4px;
  border-left: 1px solid #e8edf3; border-bottom: 1px solid #e8edf3; padding: 8px 0 0 4px;
}
.bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; }
.bar {
  width: 100%; max-width: 32px; border-radius: 3px 3px 0 0;
  transition: height .25s ease; cursor: pointer;
}
.bar--cost         { background: #ee4d2d; }
.bar--total_amount { background: #10b981; }
.bar--acos         { background: #f97316; }
.bar--clicks       { background: #6366f1; }
.bar-label { font-size: 8px; color: #9aa0ac; white-space: nowrap; }
.bar-tooltip { font-size: 12px; line-height: 1.6; }
.bar-tooltip-date { font-weight: 700; margin-bottom: 4px; }
.date-cell { font-size: 11px; color: #6b7280; font-weight: 600; }
.daily-table-wrap { overflow-x: auto; background: #fff; border-radius: 10px; border: 1.5px solid #e8edf3; }

/* ─── CAMPAIGN DETAIL PANEL ──────────────────────────────────────────────── */
.camp-detail-card { width: 420px; max-width: 100vw; display: flex; flex-direction: column; height: 100%; }
.camp-detail-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 18px 20px; border-bottom: 1.5px solid #e8edf3; background: #fff; flex-shrink: 0;
}
.camp-detail-title    { font-size: 15px; font-weight: 700; color: #1a1f36; line-height: 1.3; }
.camp-detail-subtitle { display: flex; align-items: center; gap: 6px; margin-top: 4px; flex-wrap: wrap; }
.camp-detail-scroll   { flex: 1; overflow-y: auto; padding: 20px; }

.detail-metrics-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;
}
.detail-metric {
  background: #f8f9fa; border-radius: 10px; padding: 12px;
  text-align: center; border: 1px solid #e8edf3;
}
.detail-metric-val   { font-size: 16px; font-weight: 700; color: #1a1f36; }
.detail-metric-label { font-size: 10px; color: #9aa0ac; font-weight: 600; text-transform: uppercase; margin-top: 3px; }
.val-pos  { color: #16a34a; }
.val-warn { color: #d97706; }
.val-neg  { color: #ef4444; }

.detail-section-title { font-size: 11px; font-weight: 700; color: #9aa0ac; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 10px; }
.detail-config-rows   { display: flex; flex-direction: column; gap: 6px; }
.detail-config-row    { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8f9fa; border-radius: 8px; }
.detail-config-label  { font-size: 12px; color: #6b7280; }
.detail-config-val    { font-size: 12px; font-weight: 700; color: #1a1f36; }

/* ─── ACCOUNT FILTER ─────────────────────────────────────────────────────── */
.account-filter { display: flex; gap: 4px; flex-wrap: wrap; }
.acc-filter-btn {
  font-size: 11px; font-weight: 600; padding: 4px 10px;
  border-radius: 6px; border: 1.5px solid #e8edf3;
  background: #fff; color: #6b7280; cursor: pointer; transition: all .15s;
}
.acc-filter-btn--on { background: #1a1f36; border-color: #1a1f36; color: #fff; }
.acc-filter-btn:hover:not(.acc-filter-btn--on) { border-color: #1a1f36; }

@media (max-width: 600px) {
  .page-header { padding: 10px 12px; }
  .stats-bar { padding: 8px 12px; overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none; }
  .stats-bar::-webkit-scrollbar { display: none; }
  .stat-card { flex-shrink: 0; }
  .ads-tabs { padding: 0 12px; overflow-x: auto; flex-wrap: nowrap; }
  .tab-body { padding: 12px 12px; }
  .camp-kpis { grid-template-columns: 1fr 1fr; }
}
</style>
