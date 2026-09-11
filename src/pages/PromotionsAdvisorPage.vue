<template>
  <q-page class="promo-advisor q-pa-lg">
    <SbPageHeader
      eyebrow="Mercado Livre"
      title="Promoções · Assistente"
      subtitle="O que o robô fez hoje, o que espera por você e o que exige atenção. Ele só mexe em promoção quando a escrita automática está ligada — e nunca abaixo da sua margem mínima."
      icon="auto_graph"
    >
      <template #actions>
        <q-btn outline no-caps icon="refresh" label="Recarregar lista" :loading="loading" @click="load" />
      </template>
    </SbPageHeader>

    <!-- Estado de erro: única coisa na tela (sem contagem, sem "Network Error" cru) -->
    <SbEmptyState
      v-if="error"
      variant="error"
      :title="errorTitle"
      :message="errorMessage"
    >
      <template #action>
        <q-btn unelevated color="primary" no-caps icon="refresh" label="Tentar novamente" @click="load" />
      </template>
    </SbEmptyState>

    <template v-else>
      <!-- Como funciona (camada 2): explica a função em linguagem de negócio, fecha por padrão -->
      <AdvisorHowItWorks />

      <!-- Hoje: o trabalho do robô (o que fez, o que espera, por que não mexeu, como parar) -->
      <AdvisorTodayWork
        v-if="automation"
        :automation="automation"
        :loading="loading"
        @updated="load"
        @search="applyQuickSearch"
        @open-item="openItemById"
      />

      <!-- Leitura de decisão: atenção → sugestão → proteção -->
      <AdvisorDecisionBand
        :scope="summary"
        :page="decision"
        :only-below-floor="filters.belowFloor"
        @focus-below-floor="focusBelowFloor"
      />

      <!-- Automação: estado do robô por conta, alertas de margem e aval da primeira onda -->
      <AdvisorAutomationPanel
        v-if="automation"
        :automation="automation"
        @updated="onAutomationUpdated"
      />

      <!-- Lista de anúncios: os controles vivem junto do dado que eles filtram (PROMO-IA-21 §4.4) -->
      <h2 class="pv-listTitle">Anúncios</h2>

      <!-- Escopo (conta + status): números do servidor, clicáveis para filtrar (chips) -->
      <div class="pv-scope pv-scope--chips">
        <button class="pv-scope__kpi" :class="{ 'pv-scope__kpi--on': isScopeDefault }" :aria-pressed="isScopeDefault" @click="resetFacets">
          <strong>{{ summary.ads ?? 0 }}</strong> anúncios
        </button>
        <button class="pv-scope__kpi" :class="{ 'pv-scope__kpi--on': filters.hasPromo }" :aria-pressed="filters.hasPromo" @click="toggle('hasPromo')">
          <strong>{{ summary.with_active_promo ?? 0 }}</strong> com promoção ativa
        </button>
        <button class="pv-scope__kpi" :class="{ 'pv-scope__kpi--on': filters.origem === 'assistente' }" :aria-pressed="filters.origem === 'assistente'" title="Promoções ativas em tipos que o assistente escreve e que têm ação registrada no histórico (indício de associação, não prova de autoria)." @click="toggleAssistente">
          <strong>{{ summary.assistente ?? 0 }}</strong> com registro do assistente
        </button>
        <button class="pv-scope__kpi" :class="{ 'pv-scope__kpi--on': filters.hasAgentHistory }" :aria-pressed="filters.hasAgentHistory" @click="toggle('hasAgentHistory')">
          <strong>{{ summary.agent_history ?? 0 }}</strong> já passaram pelo assistente
        </button>

        <q-btn
          class="pv-scope__sort" outline no-caps dense size="sm"
          :color="sort === 'margin' ? 'primary' : 'grey-9'"
          icon="sort" label="Priorizar risco (pior margem)" @click="prioritizeRisk"
        />
        <span class="pv-scope__snapshot">
          Retrato de <strong>{{ snapshotAt || '—' }}</strong>
          <template v-if="snapshotStale"> (defasado — atualiza sozinho)</template>
        </span>
      </div>

      <!-- Filtros: uma barra só, separada da tabela -->
      <div class="pv-toolbar">
        <q-select
          v-model="filters.accountId" dense outlined clearable emit-value map-options
          :options="accountOptions" class="pv-toolbar__account" label="Conta" aria-label="Filtrar por conta"
        />
        <q-select
          v-model="filters.status" dense outlined clearable emit-value map-options
          :options="statusOptions" class="pv-toolbar__status" label="Status do anúncio" aria-label="Filtrar por status do anúncio"
        />
        <q-input
          v-model="filters.q" dense outlined clearable debounce="350"
          class="pv-toolbar__q" placeholder="Buscar título, MLB ou SKU" aria-label="Buscar por título, MLB ou SKU"
        />
        <q-btn-toggle
          v-model="preset" dense no-caps toggle-color="teal" class="pv-toolbar__presets"
          :options="presetOptions" aria-label="Colunas da tabela"
        />
        <q-btn
          flat dense no-caps icon="tune" :label="showAdvanced ? 'Ocultar filtros avançados' : 'Filtros avançados'"
          :aria-expanded="showAdvanced" @click="showAdvanced = !showAdvanced"
        />
        <q-btn
          v-if="hasActiveFilters" flat dense no-caps icon="filter_alt_off"
          label="Limpar filtros" @click="clearAllFilters"
        />
      </div>

      <!-- Filtros por coluna: fora do cabeçalho da tabela (o dado vem primeiro) -->
      <div v-if="showAdvanced" class="pv-advanced">
        <div class="pv-advanced__group">
          <span class="pv-advanced__label">Saúde do anúncio</span>
          <q-select
            v-model="filters.health" dense outlined clearable emit-value map-options
            :options="healthOptions" aria-label="Filtrar por saúde do anúncio"
          />
        </div>
        <template v-for="col in rangeColumns" :key="col.key">
          <div class="pv-advanced__group">
            <span class="pv-advanced__label">{{ col.label }}</span>
            <div class="pv-advanced__fields">
              <q-input v-model.number="filters[`${col.key}Min`]" dense outlined type="number" placeholder="mín" :aria-label="`${col.label} mínima`" />
              <q-input v-model.number="filters[`${col.key}Max`]" dense outlined type="number" placeholder="máx" :aria-label="`${col.label} máxima`" />
            </div>
          </div>
        </template>
        <div class="pv-advanced__group">
          <span class="pv-advanced__label">Datas da promoção</span>
          <div class="pv-advanced__fields">
            <q-input v-model="filters.promo_datesFrom" dense outlined type="date" aria-label="Promoção a partir de" />
            <q-input v-model="filters.promo_datesTo" dense outlined type="date" aria-label="Promoção até" />
          </div>
        </div>
        <div class="pv-advanced__group">
          <span class="pv-advanced__label">Última ação do assistente</span>
          <div class="pv-advanced__fields">
            <q-input v-model="filters.agent_lastFrom" dense outlined type="date" aria-label="Última ação a partir de" />
            <q-input v-model="filters.agent_lastTo" dense outlined type="date" aria-label="Última ação até" />
          </div>
        </div>
      </div>

      <p class="pv-result" role="status" aria-live="polite">
        <strong>{{ total }}</strong> resultado{{ total === 1 ? '' : 's' }} de {{ summary.ads ?? 0 }} anúncios{{ scopeLabel }}
        <span v-if="hasActiveFilters" class="pv-result__filters">
          · <button v-for="chip in activeFilterChips" :key="chip.key" class="pv-filter-tag" @click="chip.clear">{{ chip.label }} ✕</button>
        </span>
      </p>

      <!-- Tabela: protagonista -->
      <AdvisorTable
        :rows="rows" :columns="visibleColumns" :sort="sort" :loading="loading"
        :fit="preset === 'assistente'"
        @sort="cycleSort" @open-detail="openDetail"
      />

      <SbEmptyState
        v-if="!loading && !rows.length"
        title="Nenhum anúncio com esses filtros"
        :message="hasActiveFilters ? 'Limpe os filtros para voltar ao catálogo completo.' : 'Nenhum anúncio nas contas selecionadas.'"
      >
        <template v-if="hasActiveFilters" #action>
          <q-btn outline no-caps color="primary" icon="filter_alt_off" label="Limpar filtros" @click="clearAllFilters" />
        </template>
      </SbEmptyState>

      <!-- Legenda semântica (cor nunca é a única informação) -->
      <div class="pv-legend" aria-label="Legenda de cores e ícones">
        <span class="pv-legend__t">Legenda:</span>
        <span class="pv-legend__item"><SbBadge variant="red" icon="block">bloqueado pelo piso</SbBadge></span>
        <span class="pv-legend__item"><SbBadge variant="amber" icon="warning">atenção / dado ausente</SbBadge></span>
        <span class="pv-legend__item"><SbBadge variant="indigo" icon="auto_fix_high">sugestão do assistente</SbBadge></span>
        <span class="pv-legend__item"><SbBadge variant="green" icon="check_circle">promoção ativa saudável</SbBadge></span>
        <span class="pv-legend__item"><SbBadge variant="slate" icon="storefront">sem registro do assistente</SbBadge></span>
      </div>

      <div class="pv-pager" v-if="total > pageSize || page > 1">
        <q-btn flat no-caps icon="chevron_left" label="Anterior" :disable="page <= 1" @click="goTo(page - 1)" />
        <span class="pv-pager__info">Página {{ page }} de {{ totalPages }} · {{ total }} anúncios</span>
        <q-btn flat no-caps label="Próxima" icon-right="chevron_right" :disable="page >= totalPages" @click="goTo(page + 1)" />
      </div>

      <!-- Detalhe em diálogo (consulta o ML ao vivo) -->
      <q-dialog v-model="detailOpen" maximized transition-show="slide-up" transition-hide="slide-down">
        <div class="pv-dialog">
          <div class="pv-dialog__bar">
            <span class="pv-dialog__title">{{ detailTitle }}</span>
            <q-btn flat dense round icon="close" aria-label="Fechar detalhe" @click="detailOpen = false" />
          </div>
          <PromoOverviewDetail v-if="detailId" :item-id="detailId" />
        </div>
      </q-dialog>

      <AdvisorInsights :rows="insightRows" />
    </template>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';

import SbPageHeader from 'src/components/common/SbPageHeader.vue';
import SbEmptyState from 'src/components/common/SbEmptyState.vue';
import SbTable from 'src/components/common/SbTable.vue';
import SbBadge from 'src/components/common/SbBadge.vue';
import AdvisorHowItWorks from 'src/components/promotions-ads/AdvisorHowItWorks.vue';
import AdvisorTodayWork from 'src/components/promotions-ads/AdvisorTodayWork.vue';
import AdvisorDecisionBand from 'src/components/promotions-ads/AdvisorDecisionBand.vue';
import AdvisorAutomationPanel from 'src/components/promotions-ads/AdvisorAutomationPanel.vue';
import AdvisorTable from 'src/components/promotions-ads/AdvisorTable.vue';
import AdvisorInsights from 'src/components/promotions-ads/AdvisorInsights.vue';
import PromoOverviewDetail from 'src/components/promotions-ads/PromoOverviewDetail.vue';

import MercadoLivreService from 'src/services/MercadoLivreService';
import { HEALTH_META, decisionSummary } from 'src/utils/advisorDecision';

const STATUS_LABELS = {
  active: 'Ativo',
  paused: 'Pausado',
  closed: 'Encerrado',
  under_review: 'Em revisão',
};

// Schema de colunas. `group`: 'always' | 'assistente' | 'financeiro' | 'completo'.
// `sticky` mantém o contexto (anúncio + situação) visível ao rolar na horizontal.
const COLUMNS = [
  // Ordem = leitura de decisão. `width` é a fatia no preset enxuto (tabela fixa que
  // cabe na tela); `minWidth` é o piso quando o preset é largo e a tabela rola.
  { key: 'title', label: 'Anúncio', group: 'always', sticky: true, width: '24%', minWidth: 220 },
  { key: 'situation', label: 'Situação', group: 'assistente', sticky: true, stickySecond: true, width: '11%', minWidth: 118 },
  { key: 'suggestion', label: 'Sugestão', group: 'assistente', width: '14%', minWidth: 150 },
  { key: 'price', label: 'Preço-base', group: 'assistente', numeric: true, sortable: true, sortKey: 'price', width: '9%', minWidth: 100 },
  { key: 'buyer_price', label: 'Preço promo', group: 'assistente', numeric: true, width: '9%', minWidth: 100 },
  { key: 'margin_pct', label: 'Margem', group: 'assistente', numeric: true, sortable: true, sortKey: 'margin', width: '8%', minWidth: 90 },
  { key: 'profit_unit', label: 'Lucro', group: 'assistente', numeric: true, width: '8%', minWidth: 90 },
  { key: 'sales_30d', label: 'Vendas 30d', group: 'assistente', numeric: true, sortable: true, sortKey: 'sales', width: '7%', minWidth: 86 },
  { key: 'agent_last', label: 'Última ação', group: 'assistente', sortable: true, sortKey: 'activation', width: '10%', minWidth: 124 },
  { key: 'health', label: 'Saúde', group: 'completo', minWidth: 96 },
  { key: 'promo', label: 'Promoção ativa', group: 'completo', minWidth: 180 },
  { key: 'discount_pct', label: '% desconto', group: 'completo', numeric: true, sortable: true, sortKey: 'discount', minWidth: 104 },
  { key: 'cmv_unit', label: 'CMV', group: 'financeiro', numeric: true, minWidth: 96 },
  { key: 'promo_dates', label: 'Datas promo', group: 'completo', minWidth: 150 },
];

// Presets começam pelo enxuto "Assistente" (padrão), não por "tudo".
const PRESETS = {
  assistente: ['assistente'],
  financeiro: ['assistente', 'financeiro'],
  completo: ['assistente', 'financeiro', 'completo'],
};

const RANGE_KEYS = ['sales_30d', 'price', 'discount_pct', 'buyer_price', 'cmv_unit', 'margin_pct', 'profit_unit'];

const loading = ref(false);
const error = ref('');
const rows = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(40);
const summary = ref({});
const automation = ref(null);
const snapshot = ref({});
const accounts = ref([]);
const insights = ref({});
const sort = ref('-sales');
const preset = ref('assistente');
const showAdvanced = ref(false);
const detailId = ref(null);
const detailOpen = ref(false);
const detailTitle = ref('');

let requestSeq = 0;

const filters = reactive({
  q: '',
  accountId: null,
  status: null,
  health: null,
  origem: '',
  hasPromo: false,
  belowFloor: false,
  hasAgentHistory: false,
  sales_30dMin: null, sales_30dMax: null,
  priceMin: null, priceMax: null,
  discount_pctMin: null, discount_pctMax: null,
  buyer_priceMin: null, buyer_priceMax: null,
  cmv_unitMin: null, cmv_unitMax: null,
  margin_pctMin: null, margin_pctMax: null,
  profit_unitMin: null, profit_unitMax: null,
  agent_lastFrom: '', agent_lastTo: '',
  promo_datesFrom: '', promo_datesTo: '',
});

const accountOptions = computed(() => accounts.value.map((a) => ({ label: a.account_nickname || a.account_id, value: a.account_id })));
const healthOptions = Object.entries(HEALTH_META).map(([value, meta]) => ({ label: meta.label, value }));
const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({ label, value }));
const presetOptions = [
  { label: 'Assistente', value: 'assistente' },
  { label: 'Financeiro', value: 'financeiro' },
  { label: 'Completo', value: 'completo' },
];
const rangeColumns = COLUMNS.filter((col) => RANGE_KEYS.includes(col.key));
const insightRows = computed(() => insights.value.insights || {});
const snapshotAt = computed(() => (snapshot.value.computed_at ? dateTime(snapshot.value.computed_at) : ''));
const snapshotStale = computed(() => Boolean(snapshot.value.stale));

const visibleColumns = computed(() => {
  const groups = PRESETS[preset.value] || PRESETS.assistente;
  return COLUMNS.filter((col) => col.group === 'always' || groups.includes(col.group));
});

const decision = computed(() => decisionSummary(rows.value));
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const isScopeDefault = computed(() => !filters.origem && !filters.belowFloor && !filters.hasPromo && !filters.hasAgentHistory);
const scopeLabel = computed(() => (filters.accountId || filters.status ? ` (${filters.accountId ? 'conta' : ''}${filters.accountId && filters.status ? ' + ' : ''}${filters.status ? 'status' : ''})` : ''));

const errorTitle = computed(() => (isNetworkError.value
  ? 'Não conseguimos falar com o servidor agora'
  : 'Não foi possível carregar o acompanhamento'));
const errorMessage = computed(() => (isNetworkError.value
  ? 'A lista de anúncios não carregou. Verifique sua conexão e tente de novo — nada foi alterado no Mercado Livre.'
  : 'A lista de anúncios não carregou agora. Tente novamente em instantes — nada foi alterado no Mercado Livre.'));
const isNetworkError = computed(() => /network|failed to fetch|timeout|econn/i.test(error.value || ''));
// O motivo cru do backend fica em uma linha discreta (apoio ao suporte), nunca
// como mensagem principal para o dono.
const errorDetail = computed(() => (isNetworkError.value ? '' : error.value));

const activeFilterChips = computed(() => {
  const chips = [];
  if (filters.q) chips.push({ key: 'q', label: `busca “${filters.q}”`, clear: () => { filters.q = ''; } });
  if (filters.accountId) chips.push({ key: 'account', label: 'conta', clear: () => { filters.accountId = null; } });
  if (filters.status) chips.push({ key: 'status', label: statusLabel(filters.status), clear: () => { filters.status = null; } });
  if (filters.health) chips.push({ key: 'health', label: healthMeta(filters.health).label, clear: () => { filters.health = null; } });
  if (filters.origem) chips.push({ key: 'origem', label: `promo: ${filters.origem}`, clear: () => { filters.origem = ''; } });
  if (filters.hasPromo) chips.push({ key: 'hasPromo', label: 'com promoção ativa', clear: () => { filters.hasPromo = false; } });
  if (filters.belowFloor) chips.push({ key: 'belowFloor', label: 'abaixo do piso', clear: () => { filters.belowFloor = false; } });
  if (filters.hasAgentHistory) chips.push({ key: 'hist', label: 'já passaram pelo assistente', clear: () => { filters.hasAgentHistory = false; } });
  for (const col of COLUMNS) {
    if (RANGE_KEYS.includes(col.key)) {
      const minK = `${col.key}Min`;
      const maxK = `${col.key}Max`;
      if (filters[minK] !== null && filters[minK] !== undefined && filters[minK] !== '') {
        chips.push({ key: minK, label: `${col.label} ≥ ${filters[minK]}`, clear: () => { filters[minK] = null; } });
      }
      if (filters[maxK] !== null && filters[maxK] !== undefined && filters[maxK] !== '') {
        chips.push({ key: maxK, label: `${col.label} ≤ ${filters[maxK]}`, clear: () => { filters[maxK] = null; } });
      }
    }
  }
  if (filters.agent_lastFrom) chips.push({ key: 'agent_lastFrom', label: `última ação ≥ ${filters.agent_lastFrom}`, clear: () => { filters.agent_lastFrom = ''; } });
  if (filters.agent_lastTo) chips.push({ key: 'agent_lastTo', label: `última ação ≤ ${filters.agent_lastTo}`, clear: () => { filters.agent_lastTo = ''; } });
  if (filters.promo_datesFrom) chips.push({ key: 'promo_datesFrom', label: `promoção ≥ ${filters.promo_datesFrom}`, clear: () => { filters.promo_datesFrom = ''; } });
  if (filters.promo_datesTo) chips.push({ key: 'promo_datesTo', label: `promoção ≤ ${filters.promo_datesTo}`, clear: () => { filters.promo_datesTo = ''; } });
  return chips;
});

const hasActiveFilters = computed(() => activeFilterChips.value.length > 0);

function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

function healthMeta(health) {
  return HEALTH_META[health] || { label: health || '—', variant: 'slate', icon: '' };
}

function toggle(field) {
  filters[field] = !filters[field];
}

function toggleAssistente() {
  filters.origem = filters.origem === 'assistente' ? '' : 'assistente';
}

function resetFacets() {
  filters.origem = '';
  filters.hasPromo = false;
  filters.belowFloor = false;
  filters.hasAgentHistory = false;
}

function focusBelowFloor() {
  filters.belowFloor = true;
  sort.value = 'margin';
}

function prioritizeRisk() {
  sort.value = sort.value === 'margin' ? '-margin' : 'margin';
}

function clearAllFilters() {
  Object.assign(filters, {
    q: '', accountId: null, status: null, health: null,
    origem: '', hasPromo: false, belowFloor: false, hasAgentHistory: false,
    sales_30dMin: null, sales_30dMax: null, priceMin: null, priceMax: null,
    discount_pctMin: null, discount_pctMax: null, buyer_priceMin: null, buyer_priceMax: null,
    cmv_unitMin: null, cmv_unitMax: null, margin_pctMin: null, margin_pctMax: null,
    profit_unitMin: null, profit_unitMax: null, agent_lastFrom: '', agent_lastTo: '',
    promo_datesFrom: '', promo_datesTo: '',
  });
  if (sort.value !== '-sales') sort.value = '-sales';
}

function cycleSort(sortKey) {
  const desc = `-${sortKey}`;
  sort.value = sort.value === desc ? sortKey : desc;
}

// A busca do bloco "Hoje" reaproveita a busca server-side da tabela (mesmo filtro `q`).
function applyQuickSearch(termo) {
  filters.q = termo || '';
}

// Abrir um anúncio direto do bloco "Hoje" (sem depender de ele estar na página atual).
function openItemById(itemId) {
  if (!itemId) return;
  detailId.value = itemId;
  detailTitle.value = itemId;
  detailOpen.value = true;
}

function openDetail(row) {
  detailId.value = row.item_id;
  detailTitle.value = row.title;
  detailOpen.value = true;
}

function goTo(next) {
  page.value = Math.max(1, Math.min(next, totalPages.value));
}

// ── Formatação ────────────────────────────────────────────────────────────────
function dateTime(iso) {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// ── Carregamento ──────────────────────────────────────────────────────────────
function buildParams() {
  const params = { page: page.value, page_size: pageSize.value, sort: sort.value };
  if (filters.q) params.q = filters.q;
  if (filters.accountId) params.account_id = filters.accountId;
  if (filters.status) params.status = filters.status;
  if (filters.health) params.health = filters.health;
  if (filters.origem) params.origem = filters.origem;
  if (filters.hasPromo) params.has_promo = 1;
  if (filters.belowFloor) params.below_floor = 1;
  if (filters.hasAgentHistory) params.has_agent_history = 1;
  const rangeMap = {
    sales_30dMin: 'min_sales_30d', sales_30dMax: 'max_sales_30d',
    priceMin: 'min_price', priceMax: 'max_price',
    discount_pctMin: 'min_discount_pct', discount_pctMax: 'max_discount_pct',
    buyer_priceMin: 'min_buyer_price', buyer_priceMax: 'max_buyer_price',
    cmv_unitMin: 'min_cmv_unit', cmv_unitMax: 'max_cmv_unit',
    margin_pctMin: 'min_margin_pct', margin_pctMax: 'max_margin_pct',
    profit_unitMin: 'min_profit', profit_unitMax: 'max_profit',
  };
  for (const [k, param] of Object.entries(rangeMap)) {
    if (filters[k] !== null && filters[k] !== undefined && filters[k] !== '') params[param] = filters[k];
  }
  if (filters.agent_lastFrom) params.activation_from = filters.agent_lastFrom;
  if (filters.agent_lastTo) params.activation_to = filters.agent_lastTo;
  if (filters.promo_datesFrom) params.promo_from = filters.promo_datesFrom;
  if (filters.promo_datesTo) params.promo_to = filters.promo_datesTo;
  return params;
}

async function load() {
  const seq = ++requestSeq;
  loading.value = true;
  error.value = '';
  try {
    const { data: payload } = await MercadoLivreService.getPromoOverview(buildParams());
    if (seq !== requestSeq) return; // resposta obsoleta
    rows.value = payload.results || [];
    total.value = payload.total || 0;
    summary.value = payload.summary || {};
    snapshot.value = payload.snapshot || {};
    automation.value = payload.automation || null;
    if (payload.accounts?.length) accounts.value = payload.accounts;
  } catch (err) {
    if (seq !== requestSeq) return;
    // Estado de erro é terminal nesta tela: some com a contagem para não
    // parecer "busca vazia" e mostra a mensagem amigável (nunca o cru do axios).
    rows.value = [];
    total.value = 0;
    error.value = err?.response?.data?.detail || err?.message || 'Erro inesperado.';
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
}

// O PATCH da política devolve o estado atualizado da conta: atualiza só aquele card
// do painel de automação, sem recarregar a lista de anúncios inteira.
function onAutomationUpdated({ account_id: accountId, state } = {}) {
  if (!automation.value || !accountId || !state) return;
  automation.value = {
    ...automation.value,
    by_account: { ...(automation.value.by_account || {}), [accountId]: state },
  };
}

// Reinicia para a página 1 e recarrega; se já está na 1, recarrega direto
// (evita o double-load de `filters`→page=1→`page` watch).
function refresh() {
  if (page.value === 1) load();
  else page.value = 1;
}

async function loadInsights() {
  try {
    const { data: payload } = await MercadoLivreService.getPromotionsAdvisor({ days: 30, limit: 100 });
    insights.value = payload || {};
  } catch {
    insights.value = {};
  }
}

watch(filters, refresh);
watch(sort, refresh);
watch(page, load);

onMounted(() => {
  load();
  loadInsights();
});
</script>

<style lang="scss" scoped>
@import 'src/css/tokens';

.promo-advisor {
  background: $background;
}

// ── Escopo (números do servidor) ────────────────────────────────────────────
.pv-scope {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $space-2;
  margin-bottom: $space-2;
}

.pv-scope__kpi {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  border: 1px solid $border;
  background: $surface;
  border-radius: 999px;
  min-height: 32px;
  padding: 6px 14px;
  font-size: $text-xs-size;
  color: $text-muted;
  cursor: pointer;

  strong { font-size: $text-small-size; color: $text-primary; }
  &:hover { border-color: $text-disabled; }
  &--on { border-color: $primary; background: rgba($primary, 0.08); }
  &--alert strong { color: $negative; }
}

.pv-scope__sort { margin-left: auto; }
.pv-scope__snapshot { font-size: $text-xs-size; color: $text-muted; }

// ── Toolbar de filtros ──────────────────────────────────────────────────────
.pv-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: $space-3;
  margin-bottom: $space-2;

  &__account, &__status { width: 190px; }
  &__q { width: 240px; }
}

.pv-advanced {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: $space-3 $space-4;
  padding: $space-3 $space-4;
  margin-bottom: $space-3;
  border: 1px solid $border;
  border-radius: $radius-lg;
  background: $surface;

  &__group { display: grid; gap: 6px; }
  &__label {
    font-size: $text-xs-size;
    font-weight: $font-semibold;
    color: $text-muted;
  }
  &__fields { display: flex; gap: $space-2; }
}

.pv-error-detail {
  margin: $space-2 0 0;
  font-size: $text-xs-size;
  color: $text-muted;
}

.pv-result {
  margin: 0 0 $space-2;
  font-size: $text-xs-size;
  color: $text-muted;
}

.pv-filter-tag {
  background: $surface;
  border-radius: 999px;
  padding: 1px 10px;
  font-size: $text-xs-size;
  color: $text-primary;
  cursor: pointer;
  border: 1px solid $border;
}

// ── Legenda ─────────────────────────────────────────────────────────────────
.pv-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $space-2 $space-3;
  margin-top: $space-3;
  font-size: $text-xs-size;
  color: $text-muted;

  &__t { font-weight: $font-semibold; }
}

.pv-title-text {
  font-size: $text-small-size;
  font-weight: $font-medium;
  color: $text-primary;
}

// ── Paginação ────────────────────────────────────────────────────────────────
.pv-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-4;
  margin-top: $space-3;

  &__info { font-size: $text-small-size; color: $text-muted; }
}

// ── Diálogo de detalhe ──────────────────────────────────────────────────────
.pv-dialog {
  background: $background;
  min-height: 100vh;
}

.pv-dialog__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-3 $space-5;
  border-bottom: 1px solid $border;
  background: $surface;
}

.pv-dialog__title {
  font-size: $text-small-size;
  font-weight: $font-semibold;
  color: $text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// ── Mobile: filtros e escopo compactos, tabela em cartões ───────────────────
@media (max-width: 768px) {
  .pv-scope {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 4px;
    scrollbar-width: thin;
  }
  .pv-scope__kpi { flex: 0 0 auto; }
  .pv-scope {
    gap: $space-2;

    &__sort { margin-left: 0; }
    &__snapshot { display: none; }
  }

  :deep(.sb-page-subtitle) { display: none; }

  .pv-toolbar {
    gap: $space-2;

    &__account, &__status, &__q { width: 100%; }
  }

  .pv-result { font-size: $text-xs-size; }
}
</style>
