<template>
  <q-page class="ads-page">

    <!-- ══════════════════════════════════════════════════════ HEADER -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon"><q-icon name="campaign" size="20px" /></div>
        <div>
          <div class="header-eyebrow">Mercado Ads</div>
          <div class="header-title">Publicidade</div>
        </div>
      </div>
      <div class="header-right">

        <!-- Contas -->
        <div class="acct-pills">
          <button
            v-for="acc in accountOptions" :key="acc.account_id"
            :class="['acct-pill', selectedAccounts.includes(acc.account_id) && 'acct-pill--on']"
            @click="toggleAccount(acc.account_id)"
          >{{ acc.account_nickname }}</button>
        </div>

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

        <q-btn flat round icon="refresh" color="teal-7" :loading="loading" @click="load" size="sm">
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

        <div class="stat-card" :class="avgAcos <= 10 ? 'stat-card--pos' : avgAcos <= 15 ? 'stat-card--warn' : 'stat-card--neg'">
          <div class="stat-icon"><q-icon name="percent" size="16px" /></div>
          <div class="stat-body">
            <div class="stat-val">{{ avgAcos.toFixed(1) }}%</div>
            <div class="stat-label">ACoS Médio</div>
            <div class="stat-sub">custo / vendas ads</div>
          </div>
        </div>

        <div class="stat-card" :class="avgTacos <= 8 ? 'stat-card--pos' : avgTacos <= 12 ? 'stat-card--warn' : 'stat-card--neg'">
          <div class="stat-icon"><q-icon name="donut_small" size="16px" /></div>
          <div class="stat-body">
            <div class="stat-val">{{ avgTacos.toFixed(1) }}%</div>
            <div class="stat-label">TACoS</div>
            <div class="stat-sub">custo / fatur. total</div>
          </div>
        </div>

        <div class="stat-card stat-card--neutral">
          <div class="stat-icon"><q-icon name="ads_click" size="16px" /></div>
          <div class="stat-body">
            <div class="stat-val">{{ overview.total_clicks?.toLocaleString('pt-BR') }}</div>
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
      </template>
    </div>

    <!-- ══════════════════════════════════════════════════════ TABS -->
    <div class="ads-tabs">
      <button v-for="tab in tabs" :key="tab.key"
        :class="['ads-tab', activeTab === tab.key && 'ads-tab--on']"
        @click="switchTab(tab.key)">
        <q-icon :name="tab.icon" size="14px" class="q-mr-xs" />{{ tab.label }}
      </button>
    </div>

    <!-- ══════════════════════════════════════════════════════ TAB: CAMPANHAS -->
    <div v-if="activeTab === 'accounts'" class="tab-body">
      <template v-if="loading">
        <div class="skeleton-rows">
          <div class="skeleton-row" v-for="n in 3" :key="n" />
        </div>
      </template>
      <template v-else-if="overview">
        <div v-for="acc in filteredAccounts" :key="acc.account_id" class="account-block">
          <div class="account-header">
            <div class="account-name">
              <div class="account-dot" />{{ acc.account_nickname }}
            </div>
            <div class="account-meta">
              <span class="meta-chip meta-chip--spend">{{ formatCurrency(acc.cost) }} investido</span>
              <span class="meta-chip" :class="acc.acos <= 10 ? 'meta-chip--pos' : acc.acos <= 15 ? 'meta-chip--warn' : 'meta-chip--neg'">ACoS {{ acc.acos }}%</span>
              <span class="meta-chip" :class="acc.tacos <= 8 ? 'meta-chip--pos' : acc.tacos <= 12 ? 'meta-chip--warn' : 'meta-chip--neg'">TACoS {{ acc.tacos }}%</span>
              <span class="meta-chip meta-chip--neutral">{{ acc.clicks.toLocaleString('pt-BR') }} clicks</span>
            </div>
          </div>

          <div class="camp-table-wrap">
            <table class="camp-table">
              <thead>
                <tr>
                  <th class="th-name">Campanha</th>
                  <th>Status</th>
                  <th>Estratégia</th>
                  <th class="th-num">Investido</th>
                  <th class="th-num">Receita Ads</th>
                  <th class="th-num">ACoS</th>
                  <th class="th-num">Target</th>
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
                  <td><span class="strategy-badge">{{ STRATEGY_LABELS[camp.strategy] || camp.strategy || '—' }}</span></td>
                  <td class="td-num">{{ formatCurrency(camp.cost) }}</td>
                  <td class="td-num">{{ formatCurrency(camp.total_amount) }}</td>
                  <td class="td-num">
                    <span :class="['acos-chip', camp.acos <= 10 ? 'acos-chip--pos' : camp.acos <= 15 ? 'acos-chip--warn' : 'acos-chip--neg']">{{ camp.acos }}%</span>
                  </td>
                  <td class="td-num td-muted">{{ camp.acos_target > 0 ? camp.acos_target.toFixed(1) + '%' : '—' }}</td>
                  <td class="td-num">{{ camp.clicks.toLocaleString('pt-BR') }}</td>
                  <td class="td-num td-muted">{{ formatNumber(camp.prints) }}</td>
                  <td class="td-num td-muted">{{ formatCurrency(camp.cpc) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div v-if="!filteredAccounts.length" class="empty-state">
          <q-icon name="campaign" size="40px" style="color:#9aa0ac" />
          <div>Nenhum dado de campanhas no período selecionado</div>
        </div>
      </template>
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

      <template v-if="dailyLoading">
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
                  <th class="th-num">ACoS</th>
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
                  <td class="td-num">
                    <span :class="['acos-chip', d.acos <= 10 ? 'acos-chip--pos' : d.acos <= 15 ? 'acos-chip--warn' : 'acos-chip--neg']">{{ d.acos.toFixed(1) }}%</span>
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

    <!-- ══════════════════════════════════════════════════════ TAB: POR ANÚNCIO -->
    <div v-if="activeTab === 'items'" class="tab-body">
      <!-- Search + counter -->
      <div class="items-toolbar">
        <div class="items-search-wrap">
          <q-icon name="search" size="16px" style="color:#9aa0ac" />
          <input
            v-model="itemsSearch"
            class="items-search-input"
            placeholder="Buscar por título ou MLB..."
            @input="debouncedLoadItems"
          />
          <button v-if="itemsSearch" class="items-search-clear" @click="itemsSearch = ''; loadItems()">
            <q-icon name="close" size="14px" />
          </button>
        </div>
        <div v-if="itemsData.length" class="count-badge">
          {{ itemsData.length }} anúncios
        </div>
      </div>

      <template v-if="itemsLoading">
        <div class="skeleton-rows">
          <div class="skeleton-row" v-for="n in 5" :key="n" style="height:64px" />
        </div>
      </template>

      <template v-else-if="itemsData.length">
        <div class="items-table-wrap">
          <table class="camp-table">
            <thead>
              <tr>
                <th style="width:56px"></th>
                <th>Anúncio</th>
                <th class="th-num">Preço</th>
                <th class="th-num">Estoque</th>
                <th>Status</th>
                <th>Tipo</th>
                <th>Campanhas</th>
                <th>Conta</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in itemsData" :key="item.item_id" class="camp-row item-row"
                @click="openItemDetail(item)">
                <!-- Thumb -->
                <td class="td-thumb">
                  <div class="item-thumb">
                    <img v-if="item.thumbnail" :src="item.thumbnail" />
                    <q-icon v-else name="inventory_2" size="20px" style="color:#9aa0ac" />
                  </div>
                </td>
                <!-- Título + ID -->
                <td class="td-item-title">
                  <div class="item-title">{{ item.title || '—' }}</div>
                  <div class="item-id">
                    <a v-if="item.permalink" :href="item.permalink" target="_blank"
                      @click.stop class="item-link">{{ item.item_id }}</a>
                    <span v-else>{{ item.item_id }}</span>
                  </div>
                </td>
                <!-- Preço -->
                <td class="td-num">
                  <span class="item-price">{{ formatCurrency(item.price) }}</span>
                </td>
                <!-- Estoque -->
                <td class="td-num td-muted">
                  {{ item.stock != null ? item.stock : '—' }}
                </td>
                <!-- Status do ad -->
                <td>
                  <span :class="['ad-status-badge', `ad-status-badge--${item.status}`]">
                    {{ AD_STATUS_LABELS[item.status] || item.status }}
                  </span>
                </td>
                <!-- Tipo de listing -->
                <td>
                  <span class="listing-type-badge">{{ LISTING_TYPE_LABELS[item.listing_type] || item.listing_type || '—' }}</span>
                </td>
                <!-- Campanhas -->
                <td>
                  <div class="camp-chips">
                    <span v-for="c in item.campaigns" :key="c.id"
                      :class="['camp-chip', `camp-chip--${c.status}`]"
                      @click.stop="selectCampaignById(c.id)">
                      {{ c.name }}
                    </span>
                  </div>
                </td>
                <!-- Conta -->
                <td class="td-muted" style="font-size:12px; white-space:nowrap">
                  {{ item.accounts.join(', ') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <div v-else-if="!itemsLoading" class="empty-state">
        <q-icon name="inventory_2" size="40px" style="color:#9aa0ac" />
        <div v-if="itemsSearch">Nenhum anúncio encontrado para "{{ itemsSearch }}"</div>
        <div v-else>Nenhum anúncio em campanha. Sincronize os dados via <code>command_sync_ads</code>.</div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════ CAMPAIGN DETAIL PANEL -->
    <q-dialog v-model="campDetailOpen" position="right" full-height maximized>
      <q-card class="camp-detail-card" v-if="campDetail">
        <!-- Sticky header -->
        <div class="camp-detail-header">
          <div>
            <div class="camp-detail-title">{{ campDetail.name }}</div>
            <div class="camp-detail-subtitle">
              <span :class="['status-badge', `status-badge--${campDetail.status}`]">{{ statusLabel(campDetail.status) }}</span>
              <span class="strategy-badge q-ml-xs">{{ STRATEGY_LABELS[campDetail.strategy] || campDetail.strategy }}</span>
            </div>
          </div>
          <q-btn flat round icon="close" dense @click="campDetailOpen = false" color="grey-6" />
        </div>

        <!-- Scrollable body -->
        <div class="camp-detail-scroll">
          <!-- Métricas principais -->
          <div class="detail-metrics-grid">
            <div class="detail-metric">
              <div class="detail-metric-val">{{ formatCurrency(campDetail.cost) }}</div>
              <div class="detail-metric-label">Investimento</div>
            </div>
            <div class="detail-metric">
              <div class="detail-metric-val" :class="campDetail.acos <= 10 ? 'val-pos' : campDetail.acos <= 15 ? 'val-warn' : 'val-neg'">
                {{ campDetail.acos }}%
              </div>
              <div class="detail-metric-label">ACoS</div>
            </div>
            <div class="detail-metric">
              <div class="detail-metric-val">{{ formatCurrency(campDetail.total_amount) }}</div>
              <div class="detail-metric-label">Receita Ads</div>
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

          <!-- Configuração -->
          <div class="detail-section-title">Configuração</div>
          <div class="detail-config-rows">
            <div class="detail-config-row">
              <span class="detail-config-label">Budget diário</span>
              <span class="detail-config-val">{{ campDetail.budget > 0 ? formatCurrency(campDetail.budget) : 'Automático' }}</span>
            </div>
            <div class="detail-config-row" v-if="campDetail.acos_target > 0">
              <span class="detail-config-label">ACoS Target</span>
              <span class="detail-config-val">{{ campDetail.acos_target.toFixed(1) }}%</span>
            </div>
          </div>

          <!-- Anúncios -->
          <div class="detail-section-title" style="margin-top:20px">
            Anúncios nesta campanha
            <span class="header-count q-ml-xs" v-if="campAds.length">{{ campAds.length }}</span>
          </div>
          <div v-if="campAdsLoading" class="q-pa-md text-center">
            <q-spinner color="teal-6" />
          </div>
          <div v-else-if="campAds.length" class="camp-ads-list">
            <div v-for="ad in campAds" :key="ad.ad_group_id" class="camp-ad-row">
              <div class="camp-ad-thumb">
                <img v-if="ad.thumbnail" :src="ad.thumbnail" />
                <q-icon v-else name="inventory_2" size="18px" style="color:#9aa0ac" />
              </div>
              <div class="camp-ad-info">
                <div class="camp-ad-title">{{ ad.title }}</div>
                <div class="camp-ad-meta">
                  <a v-if="ad.permalink" :href="ad.permalink" target="_blank" class="item-link ad-sku">{{ ad.item_id }}</a>
                  <span v-else class="ad-sku">{{ ad.item_id }}</span>
                  <span :class="['ad-status', `ad-status--${ad.status}`]">{{ AD_STATUS_LABELS[ad.status] || ad.status }}</span>
                  <span class="ad-price">{{ formatCurrency(ad.price) }}</span>
                  <span v-if="ad.stock_available != null" class="ad-stock">{{ ad.stock_available }} em estoque</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state" style="padding:24px">
            <div>Nenhum anúncio encontrado</div>
          </div>
        </div>
      </q-card>
    </q-dialog>

    <!-- ITEM DETAIL PANEL -->
    <q-dialog v-model="itemDetailOpen" position="right" full-height maximized>
      <q-card class="camp-detail-card" v-if="itemDetail">
        <div class="camp-detail-header">
          <div>
            <div class="camp-detail-title" style="max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
              {{ itemDetail.title }}
            </div>
            <div class="camp-detail-subtitle">
              <a v-if="itemDetail.permalink" :href="itemDetail.permalink" target="_blank" class="item-link" style="font-size:11px">
                {{ itemDetail.item_id }} ↗
              </a>
              <span v-else class="ad-sku">{{ itemDetail.item_id }}</span>
            </div>
          </div>
          <q-btn flat round icon="close" dense @click="itemDetailOpen = false" color="grey-6" />
        </div>

        <div class="camp-detail-scroll">
          <!-- Thumb + info -->
          <div style="display:flex; gap:16px; align-items:flex-start; margin-bottom:20px">
            <div class="item-thumb-lg">
              <img v-if="itemDetail.thumbnail" :src="itemDetail.thumbnail" />
              <q-icon v-else name="inventory_2" size="40px" style="color:#9aa0ac" />
            </div>
            <div style="flex:1">
              <div style="font-size:20px; font-weight:700; color:#0d9488; margin-bottom:4px">{{ formatCurrency(itemDetail.price) }}</div>
              <div style="display:flex; gap:6px; flex-wrap:wrap">
                <span :class="['ad-status-badge', `ad-status-badge--${itemDetail.status}`]">{{ AD_STATUS_LABELS[itemDetail.status] || itemDetail.status }}</span>
                <span class="listing-type-badge">{{ LISTING_TYPE_LABELS[itemDetail.listing_type] || itemDetail.listing_type }}</span>
                <span v-if="itemDetail.catalog" class="listing-type-badge" style="background:#e0f2f1; color:#0d9488">Catálogo</span>
              </div>
              <div v-if="itemDetail.stock != null" style="font-size:12px; color:#9aa0ac; margin-top:6px">
                {{ itemDetail.stock }} unidades em estoque
              </div>
            </div>
          </div>

          <!-- Campanhas -->
          <div class="detail-section-title">Campanhas ({{ itemDetail.campaigns.length }})</div>
          <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:20px">
            <div v-for="c in itemDetail.campaigns" :key="c.id" class="detail-camp-row"
              @click="openCampaignFromItem(c)">
              <div style="display:flex; align-items:center; gap:8px">
                <span :class="['status-badge', `status-badge--${c.status}`]">{{ statusLabel(c.status) }}</span>
                <span style="font-weight:600; color:#1a1f36; font-size:13px">{{ c.name }}</span>
              </div>
              <div style="font-size:11px; color:#9aa0ac">{{ c.account }}</div>
            </div>
          </div>
        </div>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { api } from 'src/boot/axios'

// ── Constants ────────────────────────────────────────────────────────────────
const STRATEGY_LABELS = {
  PROFITABILITY:   'Rentabilidade',
  GROWTH:          'Crescimento',
  BRAND_AWARENESS: 'Reconhecimento',
}

const AD_STATUS_LABELS = {
  active: 'Ativo',
  paused: 'Pausado',
  under_review: 'Em análise',
  idle:   'Inativo',
  hold:   'Suspenso',
}

const LISTING_TYPE_LABELS = {
  gold_special: 'Clássico',
  gold_pro:     'Premium',
  gold:         'Ouro',
  silver:       'Prata',
  free:         'Grátis',
}

const tabs = [
  { key: 'accounts', label: 'Por Campanha',  icon: 'business'    },
  { key: 'trend',    label: 'Tendência',     icon: 'show_chart'  },
  { key: 'items',    label: 'Por Anúncio',   icon: 'inventory_2' },
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
  { key: 'acos',         label: 'ACoS %',      fmt: v => v.toFixed(1) + '%' },
  { key: 'clicks',       label: 'Clicks',      fmt: v => v.toLocaleString('pt-BR') },
]

// ── State ─────────────────────────────────────────────────────────────────────
const loading        = ref(false)
const dailyLoading   = ref(false)
const campAdsLoading = ref(false)
const itemsLoading   = ref(false)

const activeTab         = ref('accounts')
const activeDatePreset  = ref(30)
const activeTrendMetric = ref('cost')

const dateFrom = ref('')
const dateTo   = ref('')

const overview  = ref(null)
const dailyData = ref([])
const itemsData = ref([])
const itemsSearch = ref('')

const accountOptions   = ref([])
const selectedAccounts = ref([])

const selectedCampaign = ref(null)
const campDetail       = ref(null)
const campAds          = ref([])
const campDetailOpen   = ref(false)

const itemDetail     = ref(null)
const itemDetailOpen = ref(false)

// ── Computed ──────────────────────────────────────────────────────────────────
const filteredAccounts = computed(() => {
  if (!overview.value) return []
  if (!selectedAccounts.value.length) return overview.value.accounts
  return overview.value.accounts.filter(a => selectedAccounts.value.includes(a.account_id))
})

// Se filtro de conta está ativo, recalcula localmente; senão usa o total pré-computado pelo backend
// (que inclui TODAS as contas do usuário como denominador do TACoS)
const avgAcos = computed(() => {
  if (!overview.value) return 0
  if (!selectedAccounts.value.length) return overview.value.total_acos ?? 0
  // Filtro ativo: recalcula com as contas selecionadas
  const acc = filteredAccounts.value
  const totalCost = acc.reduce((s, a) => s + a.cost, 0)
  const totalRev  = acc.reduce((s, a) => s + a.ads_revenue, 0)
  return totalRev > 0 ? (totalCost / totalRev) * 100 : 0
})

const avgTacos = computed(() => {
  if (!overview.value) return 0
  if (!selectedAccounts.value.length) return overview.value.total_tacos ?? 0
  // Filtro ativo: recalcula com as contas selecionadas
  const acc = filteredAccounts.value
  const totalCost      = acc.reduce((s, a) => s + a.cost, 0)
  const totalOrdersRev = acc.reduce((s, a) => s + a.orders_revenue, 0)
  const totalAdsRev    = acc.reduce((s, a) => s + a.ads_revenue, 0)
  const denom = Math.max(totalOrdersRev, totalAdsRev)
  return denom > 0 ? (totalCost / denom) * 100 : 0
})

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
onMounted(async () => {
  applyPreset(30)
  await loadAccounts()
  await load()
})

// ── Methods ───────────────────────────────────────────────────────────────────
function applyPreset(key) {
  activeDatePreset.value = key
  const today     = new Date()
  const todayStr  = today.toISOString().slice(0, 10)

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

async function loadAccounts() {
  try {
    const { data } = await api.get('/mercadolivre/accounts/')
    const list = Array.isArray(data) ? data : (data.results || [])
    accountOptions.value = list.filter(a => a.ads_advertiser_id)
  } catch (e) { console.error(e) }
}

async function load() {
  loading.value      = true
  dailyLoading.value = true
  try {
    const params = { date_from: dateFrom.value, date_to: dateTo.value }
    const [ovRes, dailyRes] = await Promise.all([
      api.get('/mercadolivre/ads/overview/', { params }),
      api.get('/mercadolivre/ads/daily/',    { params }),
    ])
    overview.value  = ovRes.data
    dailyData.value = dailyRes.data.daily || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value      = false
    dailyLoading.value = false
  }
}

async function loadItems() {
  itemsLoading.value = true
  try {
    const params = {}
    if (itemsSearch.value) params.search = itemsSearch.value
    const { data } = await api.get('/mercadolivre/ads/items/', { params })
    itemsData.value = data.items || []
  } catch (e) {
    console.error(e)
  } finally {
    itemsLoading.value = false
  }
}

let _debounceTimer = null
function debouncedLoadItems() {
  clearTimeout(_debounceTimer)
  _debounceTimer = setTimeout(loadItems, 400)
}

function switchTab(key) {
  activeTab.value = key
  if (key === 'items' && !itemsData.value.length) loadItems()
}

function toggleAccount(id) {
  const idx = selectedAccounts.value.indexOf(id)
  if (idx >= 0) selectedAccounts.value.splice(idx, 1)
  else selectedAccounts.value.push(id)
}

async function selectCampaign(camp, acc) {
  selectedCampaign.value = camp.id
  campDetail.value = { ...camp }
  campDetailOpen.value = true
  campAds.value = []
  campAdsLoading.value = true
  try {
    const { data } = await api.get(`/mercadolivre/ads/campaigns/${camp.id}/ads/`)
    campAds.value = data.ads || []
  } catch (e) { console.error(e) }
  finally { campAdsLoading.value = false }
}

async function selectCampaignById(campId) {
  // Encontra a campanha nos dados do overview
  for (const acc of (overview.value?.accounts || [])) {
    const camp = acc.campaigns.find(c => c.id === campId)
    if (camp) {
      itemDetailOpen.value = false
      await selectCampaign(camp, acc)
      return
    }
  }
}

async function openCampaignFromItem(c) {
  itemDetailOpen.value = false
  // Busca campanha no overview pelo id
  for (const acc of (overview.value?.accounts || [])) {
    const camp = acc.campaigns.find(x => x.id === c.id)
    if (camp) { await selectCampaign(camp, acc); return }
  }
  // Fallback: abre com dados básicos
  campDetail.value = { ...c, cost: 0, acos: 0, total_amount: 0, clicks: 0, prints: 0, cpc: 0, budget: 0, acos_target: 0, units_qty: 0 }
  campDetailOpen.value = true
  campAds.value = []
  campAdsLoading.value = true
  try {
    const { data } = await api.get(`/mercadolivre/ads/campaigns/${c.id}/ads/`)
    campAds.value = data.ads || []
  } catch (e) { console.error(e) }
  finally { campAdsLoading.value = false }
}

function openItemDetail(item) {
  itemDetail.value = item
  itemDetailOpen.value = true
}

function getBarHeight(val) {
  return maxBarVal.value > 0 ? Math.max(2, (val / maxBarVal.value) * 100) : 2
}

function statusLabel(s) {
  return s === 'active' ? 'Ativa' : s === 'paused' ? 'Pausada' : s === 'archived' ? 'Arquivada' : s
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

watch(activeTab, (tab) => {
  if (tab === 'trend' && !dailyData.value.length) load()
})
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
  background: linear-gradient(135deg, #0d9488, #2dd4bf);
  border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff;
}
.header-eyebrow { font-size: 10px; color: #9aa0ac; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
.header-title   { font-size: 17px; font-weight: 700; color: #1a1f36; }
.header-count   { font-size: 12px; font-weight: 600; color: #00897b; background: #e0f2f1; border-radius: 12px; padding: 2px 10px; }

/* Account pills */
.acct-pills { display: flex; gap: 4px; flex-wrap: wrap; }
.acct-pill {
  font-size: 11px; font-weight: 600; padding: 4px 10px;
  border-radius: 20px; border: 1.5px solid #e8edf3;
  background: #fff; color: #6b7280; cursor: pointer; transition: all .15s;
}
.acct-pill--on { background: #e0f2f1; border-color: #0d9488; color: #0d9488; }
.acct-pill:hover { border-color: #0d9488; }

/* Date range */
.date-range-group { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.date-preset-btn {
  font-size: 11px; font-weight: 600; padding: 4px 9px;
  border-radius: 6px; border: 1.5px solid #e8edf3;
  background: #fff; color: #6b7280; cursor: pointer; transition: all .15s;
}
.date-preset-btn--on { background: #0d9488; border-color: #0d9488; color: #fff; }
.date-preset-btn:hover:not(.date-preset-btn--on) { border-color: #0d9488; }
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
  display: flex; align-items: center; gap: 10px;
  background: #fff; border: 1px solid #e8eaed; border-radius: 10px;
  padding: 8px 14px; min-width: 150px; flex: 1; max-width: 210px;
}
.stat-card--pos    { border-left: 3px solid #0d9488; }
.stat-card--warn   { border-left: 3px solid #f59e0b; }
.stat-card--neg    { border-left: 3px solid #ef4444; }
.stat-card--neutral{ border-left: 3px solid #6366f1; }
.stat-card--teal   { border-left: 3px solid #0d9488; }
.stat-card--spend  { border-left: 3px solid #0f172a; }
.stat-card--skeleton {
  background: linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);
  background-size: 200% 100%; animation: shimmer 1.2s infinite;
  height: 58px; border-radius: 10px; flex: 1; max-width: 210px;
}
@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
.stat-icon {
  width: 32px; height: 32px; border-radius: 8px;
  background: #f0f9f8; display: flex; align-items: center; justify-content: center;
  color: #0d9488; flex-shrink: 0;
}
.stat-card--spend  .stat-icon { background: #f0f2f5; color: #0f172a; }
.stat-card--neutral .stat-icon { background: #eef2ff; color: #6366f1; }
.stat-card--neg    .stat-icon { background: #fef2f2; color: #ef4444; }
.stat-card--warn   .stat-icon { background: #fffbeb; color: #f59e0b; }
.stat-body { min-width: 0; }
.stat-val   { font-size: 15px; font-weight: 700; color: #1a1f36; line-height: 1.2; }
.stat-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: #9aa0ac; margin-top: 1px; }
.stat-sub   { font-size: 10px; color: #b0b7c3; margin-top: 1px; }

/* ─── TABS ───────────────────────────────────────────────────────────────── */
.ads-tabs { display: flex; background: #fff; border-bottom: 1.5px solid #e8edf3; padding: 0 24px; }
.ads-tab {
  font-size: 12px; font-weight: 600; padding: 10px 16px;
  border: none; background: none; cursor: pointer; color: #6b7280;
  border-bottom: 2.5px solid transparent; transition: all .15s;
  display: flex; align-items: center;
}
.ads-tab--on  { color: #0d9488; border-bottom-color: #0d9488; }
.ads-tab:hover:not(.ads-tab--on) { color: #374151; }

/* ─── TAB BODY ───────────────────────────────────────────────────────────── */
.tab-body { padding: 20px 24px; }

/* ─── ACCOUNT BLOCK ──────────────────────────────────────────────────────── */
.account-block { margin-bottom: 28px; }
.account-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }
.account-name { font-size: 14px; font-weight: 700; color: #1a1f36; display: flex; align-items: center; gap: 8px; }
.account-dot  { width: 8px; height: 8px; border-radius: 50%; background: #0d9488; }
.account-meta { display: flex; gap: 6px; flex-wrap: wrap; }
.meta-chip {
  font-size: 11px; font-weight: 600; padding: 2px 10px;
  border-radius: 20px; border: 1px solid #e8edf3; background: #f8f9fa; color: #374151;
}
.meta-chip--pos   { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
.meta-chip--warn  { background: #fffbeb; border-color: #fde68a; color: #92400e; }
.meta-chip--neg   { background: #fef2f2; border-color: #fca5a5; color: #991b1b; }
.meta-chip--spend { background: #f0f2f5; border-color: #d1d5db; color: #1f2937; }
.meta-chip--neutral { background: #eef2ff; border-color: #c7d2fe; color: #4338ca; }

/* ─── CAMPAIGN TABLE ─────────────────────────────────────────────────────── */
.camp-table-wrap  { overflow-x: auto; border-radius: 10px; border: 1.5px solid #e8edf3; background: #fff; }
.items-table-wrap { overflow-x: auto; border-radius: 10px; border: 1.5px solid #e8edf3; background: #fff; }
.camp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.camp-table thead tr { background: #f8f9fa; }
.camp-table th {
  padding: 9px 14px; text-align: left; font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .4px; color: #9aa0ac;
  white-space: nowrap; border-bottom: 1.5px solid #e8edf3;
}
.th-num { text-align: right; }
.camp-table td { padding: 10px 14px; border-bottom: 1px solid #f0f2f5; color: #374151; }
.td-num   { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
.td-muted { color: #9aa0ac; }
.camp-row { cursor: pointer; transition: background .1s; }
.camp-row:hover     { background: #f8fdfc; }
.camp-row--selected { background: #e0f2f1; }
.camp-row:last-child td { border-bottom: none; }
.td-name   { max-width: 220px; }
.camp-name { font-weight: 600; color: #1a1f36; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.th-name   { min-width: 180px; }

/* Status / strategy badges */
.status-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; text-transform: uppercase; letter-spacing: .3px; }
.status-badge--active   { background: #ecfdf5; color: #065f46; }
.status-badge--paused   { background: #f5f7fa; color: #6b7280; }
.status-badge--archived { background: #fef2f2; color: #991b1b; }
.strategy-badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 20px; background: #eef2ff; color: #4338ca; text-transform: uppercase; letter-spacing: .3px; }
.acos-chip { font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 6px; }
.acos-chip--pos  { background: #ecfdf5; color: #065f46; }
.acos-chip--warn { background: #fffbeb; color: #92400e; }
.acos-chip--neg  { background: #fef2f2; color: #991b1b; }

/* ─── ITEMS TAB ──────────────────────────────────────────────────────────── */
.items-toolbar {
  display: flex; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap;
}
.items-search-wrap {
  display: flex; align-items: center; gap: 8px;
  background: #fff; border: 1.5px solid #e8edf3; border-radius: 8px;
  padding: 6px 12px; flex: 1; max-width: 360px;
  transition: border-color .15s;
}
.items-search-wrap:focus-within { border-color: #0d9488; }
.items-search-input {
  border: none; outline: none; background: transparent;
  font-size: 13px; color: #1a1f36; flex: 1; min-width: 0;
}
.items-search-input::placeholder { color: #9aa0ac; }
.items-search-clear { background: none; border: none; cursor: pointer; color: #9aa0ac; display: flex; padding: 0; }
.count-badge { font-size: 12px; font-weight: 600; color: #0d9488; background: #e0f2f1; border-radius: 12px; padding: 3px 12px; white-space: nowrap; }

.td-thumb { width: 56px; padding: 8px 12px !important; }
.item-thumb { width: 40px; height: 40px; border-radius: 8px; overflow: hidden; background: #f0f2f5; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.item-thumb img { width: 100%; height: 100%; object-fit: cover; }
.item-thumb-lg { width: 80px; height: 80px; border-radius: 10px; overflow: hidden; background: #f0f2f5; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.item-thumb-lg img { width: 100%; height: 100%; object-fit: cover; }
.td-item-title { max-width: 280px; }
.item-title { font-weight: 600; color: #1a1f36; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-id    { font-size: 11px; color: #9aa0ac; margin-top: 2px; }
.item-link  { color: #0d9488; text-decoration: none; }
.item-link:hover { text-decoration: underline; }
.item-price { font-weight: 700; color: #0d9488; }
.item-row:hover { background: #f8fdfc; }

.ad-status-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; text-transform: uppercase; letter-spacing: .3px; white-space: nowrap; }
.ad-status-badge--active      { background: #ecfdf5; color: #065f46; }
.ad-status-badge--paused      { background: #f5f7fa; color: #6b7280; }
.ad-status-badge--under_review{ background: #fffbeb; color: #92400e; }
.ad-status-badge--hold        { background: #fef2f2; color: #991b1b; }
.ad-status-badge--idle        { background: #fef2f2; color: #991b1b; }

.listing-type-badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 20px; background: #f3f4f6; color: #374151; text-transform: uppercase; letter-spacing: .3px; white-space: nowrap; }

.camp-chips { display: flex; gap: 4px; flex-wrap: wrap; }
.camp-chip {
  font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 12px;
  cursor: pointer; transition: opacity .15s; white-space: nowrap;
  max-width: 160px; overflow: hidden; text-overflow: ellipsis;
}
.camp-chip--active   { background: #e0f2f1; color: #0d9488; }
.camp-chip--paused   { background: #f3f4f6; color: #6b7280; }
.camp-chip--archived { background: #fef2f2; color: #991b1b; }
.camp-chip:hover { opacity: .75; }

/* ─── TREND ──────────────────────────────────────────────────────────────── */
.trend-controls { margin-bottom: 16px; display: flex; gap: 8px; align-items: center; }
.metric-pills { display: flex; gap: 4px; }
.metric-pill {
  font-size: 11px; font-weight: 600; padding: 5px 12px;
  border-radius: 20px; border: 1.5px solid #e8edf3;
  background: #fff; color: #6b7280; cursor: pointer; transition: all .15s;
}
.metric-pill--on { background: #0d9488; border-color: #0d9488; color: #fff; }
.metric-pill:hover:not(.metric-pill--on) { border-color: #0d9488; }
.chart-area { display: flex; flex-direction: column; gap: 24px; }
.bar-chart { display: flex; gap: 8px; height: 200px; align-items: flex-end; }
.bar-chart-y-labels { display: flex; flex-direction: column; justify-content: space-between; font-size: 10px; color: #9aa0ac; height: 100%; padding-bottom: 20px; min-width: 48px; text-align: right; }
.bar-chart-bars { display: flex; align-items: flex-end; gap: 3px; flex: 1; height: 100%; border-left: 1px solid #e8edf3; padding: 0 4px 0 8px; }
.bar-wrap { display: flex; flex-direction: column; align-items: center; flex: 1; max-width: 40px; height: 100%; justify-content: flex-end; cursor: pointer; }
.bar { width: 100%; border-radius: 4px 4px 0 0; transition: height .3s; background: #0d9488; min-height: 3px; }
.bar--acos         { background: #6366f1; }
.bar--clicks       { background: #f59e0b; }
.bar--total_amount { background: #2dd4bf; }
.bar-label         { font-size: 9px; color: #9aa0ac; margin-top: 4px; white-space: nowrap; }
.chart-skeleton    { height: 200px; background: linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.2s infinite; border-radius: 10px; }
.date-cell         { font-weight: 600; color: #374151; }
.bar-tooltip       { font-size: 12px; padding: 4px; }
.bar-tooltip-date  { font-weight: 700; margin-bottom: 4px; color: #0d9488; }
.daily-table-wrap  { overflow-x: auto; border-radius: 10px; border: 1.5px solid #e8edf3; background: #fff; }

/* ─── EMPTY ──────────────────────────────────────────────────────────────── */
.empty-state { text-align: center; padding: 60px 24px; color: #9aa0ac; font-size: 14px; display: flex; flex-direction: column; align-items: center; gap: 10px; }

/* ─── CAMPAIGN DETAIL PANEL ──────────────────────────────────────────────── */
.camp-detail-card {
  width: 520px; max-width: 100vw;
  border-radius: 0; display: flex; flex-direction: column; height: 100vh;
}
.camp-detail-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1.5px solid #e8edf3;
  background: #fff; flex-shrink: 0;
}
.camp-detail-subtitle { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
.camp-detail-title    { font-size: 15px; font-weight: 700; color: #1a1f36; }
.camp-detail-scroll   { flex: 1; overflow-y: auto; padding: 20px; }

.detail-metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
.detail-metric { background: #f8f9fa; border-radius: 8px; padding: 10px 12px; border: 1px solid #e8edf3; }
.detail-metric-val   { font-size: 16px; font-weight: 700; color: #1a1f36; }
.detail-metric-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: #9aa0ac; margin-top: 2px; }
.val-pos { color: #0d9488 !important; }
.val-warn { color: #f59e0b !important; }
.val-neg { color: #ef4444 !important; }

.detail-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #9aa0ac; margin-bottom: 10px; }
.detail-config-rows { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.detail-config-row  { display: flex; justify-content: space-between; font-size: 13px; }
.detail-config-label{ color: #6b7280; }
.detail-config-val  { font-weight: 600; color: #1a1f36; }

.camp-ads-list { display: flex; flex-direction: column; gap: 6px; }
.camp-ad-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 8px; background: #f8f9fa; border: 1px solid #f0f2f5;
}
.camp-ad-thumb { width: 44px; height: 44px; border-radius: 6px; background: #e8edf3; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.camp-ad-thumb img { width: 100%; height: 100%; object-fit: cover; }
.camp-ad-info  { flex: 1; min-width: 0; }
.camp-ad-title { font-size: 12px; font-weight: 600; color: #1a1f36; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.camp-ad-meta  { display: flex; align-items: center; gap: 6px; margin-top: 3px; flex-wrap: wrap; }
.ad-sku   { font-size: 10px; color: #9aa0ac; }
.ad-price { font-size: 11px; font-weight: 600; color: #0d9488; }
.ad-stock { font-size: 10px; color: #9aa0ac; }
.ad-status { font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 10px; text-transform: uppercase; letter-spacing: .3px; }
.ad-status--active      { background: #ecfdf5; color: #065f46; }
.ad-status--paused      { background: #f5f7fa; color: #6b7280; }
.ad-status--under_review{ background: #fffbeb; color: #92400e; }
.ad-status--hold        { background: #fef2f2; color: #991b1b; }

.detail-camp-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; border-radius: 8px; background: #f8f9fa;
  border: 1px solid #e8edf3; cursor: pointer; transition: background .1s;
}
.detail-camp-row:hover { background: #e0f2f1; }

/* ─── SKELETON ───────────────────────────────────────────────────────────── */
.skeleton-rows { display: flex; flex-direction: column; gap: 12px; }
.skeleton-row  {
  height: 120px; border-radius: 10px;
  background: linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);
  background-size: 200% 100%; animation: shimmer 1.2s infinite;
}

/* ══════════════════════════════════════════════════════════════════════════
   MOBILE
══════════════════════════════════════════════════════════════════════════ */
@media (max-width: 600px) {
  .page-header {
    padding: 10px 12px;
  }

  .stats-bar {
    padding: 8px 12px;
    overflow-x: auto;
    flex-wrap: nowrap;
    scrollbar-width: none;
    gap: 8px;
  }

  .stats-bar::-webkit-scrollbar { display: none; }

  .stat-card {
    min-width: 130px;
    padding: 7px 10px;
    flex-shrink: 0;
  }

  .tab-body {
    padding: 12px 12px;
  }

  .items-search-wrap {
    max-width: 100%;
  }

  .date-inp {
    width: 90px;
  }

  .camp-detail-card {
    width: 100vw !important;
    max-width: 100vw !important;
  }
}
</style>
