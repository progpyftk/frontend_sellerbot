<template>
  <q-page class="promo-advisor q-pa-lg">
    <SbPageHeader
      eyebrow="Mercado Livre"
      title="Promoções · Assistente"
      subtitle="Todos os anúncios das suas contas: vendas, promo ativa, margem na venda atual e o que já passou pelo assistente. Somente leitura — ativar e remover continuam na visão operacional."
      icon="auto_graph"
    >
      <template #actions>
        <q-btn outline no-caps icon="refresh" label="Recarregar lista" :loading="loading" @click="load" />
      </template>
    </SbPageHeader>

    <p class="pv-note">
      Margem e lucro <strong>estimados</strong> na venda atual (promo ativa, ou preço-base se não
      há promo): <code>(preço − CMV − tarifa − frete) ÷ preço</code>. Snapshot de
      <strong>{{ snapshotAt || '—' }}</strong>{{ snapshotStale ? ' (defasado — o snapshot atualiza sozinho)' : '' }}.
    </p>

    <!-- KPIs do escopo (conta + status): clicar filtra a tabela, não muda os números -->
    <div class="pv-summary" role="group" aria-label="Indicadores e filtros rápidos">
      <button class="pv-chip" :class="{ 'pv-chip--on': isScopeDefault }" :aria-pressed="isScopeDefault" @click="resetFacets">
        {{ summary.ads }} anúncios
      </button>
      <button class="pv-chip" :class="{ 'pv-chip--on': filters.hasPromo }" :aria-pressed="filters.hasPromo" @click="toggle('hasPromo')">
        {{ summary.with_active_promo }} com promo ativa
      </button>
      <button class="pv-chip pv-chip--alert" :class="{ 'pv-chip--on': filters.belowFloor }" :aria-pressed="filters.belowFloor" @click="toggle('belowFloor')">
        {{ summary.below_floor }} abaixo do piso
      </button>
      <button class="pv-chip pv-chip--agent" :class="{ 'pv-chip--on': filters.origem === 'assistente' }" :aria-pressed="filters.origem === 'assistente'" @click="toggleAssistente">
        {{ summary.assistente }} ativas com registro do assistente
      </button>
      <button class="pv-chip pv-chip--history" :class="{ 'pv-chip--on': filters.hasAgentHistory }" :aria-pressed="filters.hasAgentHistory" @click="toggle('hasAgentHistory')">
        {{ summary.agent_history }} com ação no histórico
      </button>
    </div>

    <!-- Toolbar de escopo + presets + resultado -->
    <div class="pv-toolbar">
      <q-select
        v-model="filters.accountId" dense outlined clearable emit-value map-options
        :options="accountOptions" class="pv-toolbar__account" label="Conta"
      />
      <q-select
        v-model="filters.status" dense outlined clearable emit-value map-options
        :options="statusOptions" class="pv-toolbar__status" label="Status do anúncio"
      />
      <q-input
        v-model="filters.q" dense outlined clearable debounce="350"
        class="pv-toolbar__q" placeholder="Buscar título, MLB ou SKU"
      />
      <q-btn-toggle
        v-model="preset" dense no-caps toggle-color="teal" class="pv-toolbar__presets"
        :options="presetOptions" aria-label="Colunas"
      />
      <q-btn
        v-if="hasActiveFilters" flat dense no-caps icon="filter_alt_off"
        label="Limpar" @click="clearAllFilters"
      />
    </div>

    <p class="pv-result" role="status" aria-live="polite">
      <strong>{{ total }}</strong> resultado{{ total === 1 ? '' : 's' }} de {{ summary.ads }} anúncios{{ scopeLabel }}
      <span v-if="hasActiveFilters" class="pv-result__filters">
        · <button v-for="chip in activeFilterChips" :key="chip.key" class="pv-filter-tag" @click="chip.clear">{{ chip.label }} ✕</button>
      </span>
    </p>

    <SbEmptyState
      v-if="error"
      variant="error"
      title="Não foi possível carregar o acompanhamento"
      :message="error"
    >
      <template #action>
        <q-btn unelevated color="primary" no-caps label="Tentar novamente" @click="load" />
      </template>
    </SbEmptyState>

    <!-- Tabela: protagonista (1 linha = 1 anúncio) + filtro por coluna -->
    <SbTable v-if="!error" :scroll-x="true">
      <thead>
        <tr class="pv-head-row">
          <th class="pv-expand-col" aria-label="Detalhe"></th>
          <th v-for="col in visibleColumns" :key="col.key" :class="colClass(col)" :aria-sort="ariaSort(col)" scope="col">
            <span
              v-if="col.sortable"
              class="pv-th-btn" role="button" tabindex="0"
              :aria-label="`Ordenar por ${col.label}`"
              @click="cycleSort(col.sortKey)" @keydown.enter="cycleSort(col.sortKey)" @keydown.space.prevent="cycleSort(col.sortKey)"
            >
              {{ col.label }}
              <span v-if="sortIndicator(col)" class="pv-arrow" aria-hidden="true">{{ sortIndicator(col) }}</span>
            </span>
            <template v-else>{{ col.label }}</template>
          </th>
        </tr>
        <tr class="pv-filter-row">
          <th class="pv-expand-col"></th>
          <th v-for="col in visibleColumns" :key="`f-${col.key}`">
            <template v-if="col.filter">
              <q-select
                v-if="col.filter === 'health'"
                v-model="filters.health" dense outlined clearable emit-value map-options
                :options="healthOptions" :aria-label="`Filtrar por ${col.label}`"
              />
              <q-select
                v-else-if="col.filter === 'origem'"
                v-model="promoFilter" dense outlined clearable emit-value map-options
                :options="promoOptions" aria-label="Filtrar por promo ativa"
              />
              <div v-else-if="col.filter === 'range'" class="pv-range">
                <q-input v-model.number="filters[`${col.key}Min`]" dense outlined type="number" debounce="400" placeholder="mín" :aria-label="`${col.label} mínima`" />
                <q-input v-model.number="filters[`${col.key}Max`]" dense outlined type="number" debounce="400" placeholder="máx" :aria-label="`${col.label} máxima`" />
              </div>
              <div v-else-if="col.filter === 'dates'" class="pv-range pv-range--dates">
                <q-input v-model="filters[`${col.key}From`]" dense outlined type="date" :aria-label="`${col.label} a partir de`" />
                <q-input v-model="filters[`${col.key}To`]" dense outlined type="date" :aria-label="`${col.label} até`" />
              </div>
            </template>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.item_id">
          <td class="pv-expand-col">
            <q-btn
              flat dense round size="sm" icon="open_in_full"
              :aria-label="`Detalhes de ${row.title}`" @click="openDetail(row)"
            />
          </td>
          <td v-for="col in visibleColumns" :key="col.key" :class="colClass(col)">
            <template v-if="col.key === 'title'">
              <a class="pv-title" :href="row.permalink" target="_blank" rel="noopener" :title="row.title">{{ row.title }}</a>
              <span class="pv-sub">{{ row.item_id }}<template v-if="row.sku"> · {{ row.sku }}</template> · {{ row.account_nickname }}<template v-if="row.status && row.status !== 'active'"> · {{ statusLabel(row.status) }}</template></span>
            </template>
            <template v-else-if="col.key === 'health'">
              <SbBadge v-if="row.health" :variant="healthMeta(row.health).variant" :title="healthTitle(row)">{{ healthMeta(row.health).label }}</SbBadge>
              <template v-else>—</template>
            </template>
            <template v-else-if="col.key === 'sales_30d'">{{ row.sales_30d ?? '—' }}</template>
            <template v-else-if="col.key === 'price'">{{ brl(row.price) }}</template>
            <template v-else-if="col.key === 'promo'">
              <template v-if="row.active_promo">
                <span class="pv-promo">{{ promoLabel(row.active_promo) }}</span>
                <SbBadge :variant="row.origem === 'assistente' ? 'indigo' : 'slate'" class="q-ml-xs">
                  {{ row.origem === 'assistente' ? '🤖 registro do assistente' : 'sem vínculo identificado' }}
                </SbBadge>
              </template>
              <template v-else>Sem promo</template>
            </template>
            <template v-else-if="col.key === 'discount_pct'">{{ pct(row.discount_pct) }}</template>
            <template v-else-if="col.key === 'buyer_price'">{{ brl(row.buyer_price) }}</template>
            <template v-else-if="col.key === 'cmv_unit'">{{ brl(row.cmv_unit) }}</template>
            <template v-else-if="col.key === 'margin_pct'">
              <span :class="{ 'pv-alert': row.below_floor }" :title="marginTitle(row)">{{ pct(row.margin_pct) }}</span>
            </template>
            <template v-else-if="col.key === 'profit_unit'">
              <span :class="{ 'pv-alert': row.below_floor }">{{ brl(row.profit_unit) }}</span>
            </template>
            <template v-else-if="col.key === 'agent_last'">
              <template v-if="row.agent_last">
                <span>{{ dateShort(row.agent_last.created_at) }}</span>
                <SbBadge :variant="acaoMeta(row.agent_last.acao).variant" class="q-ml-xs">{{ acaoMeta(row.agent_last.acao).label }}</SbBadge>
              </template>
              <template v-else>—</template>
            </template>
            <template v-else-if="col.key === 'promo_dates'">{{ promoDates(row.active_promo) }}</template>
          </td>
        </tr>
      </tbody>
    </SbTable>

    <SbEmptyState
      v-if="!error && !loading && !rows.length"
      title="Nenhum anúncio com esses filtros"
      message="Ajuste a busca ou os filtros para ver o catálogo."
    />

    <!-- Paginação -->
    <div class="pv-pager" v-if="total > pageSize || page > 1">
      <q-btn flat no-caps icon="chevron_left" label="Anterior" :disable="page <= 1" @click="goTo(page - 1)" />
      <span class="pv-pager__info">Página {{ page }} de {{ totalPages }}</span>
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

    <!-- Insights (mantido) -->
    <q-expansion-item
      class="pv-insights"
      icon="insights"
      label="Insights do assistente"
      caption="Por ação, por saúde e maiores efeitos medidos — janela global de 30 dias"
      header-class="pv-insights__header"
    >
      <div class="pa-insights">
        <section class="pa-block">
          <h3 class="pa-block__t">Por ação</h3>
          <SbEmptyState v-if="!insightRows.by_acao?.length" title="Sem ações na janela" />
          <SbTable v-else>
            <thead>
              <tr>
                <th>Ação</th>
                <th class="num">Vezes</th>
                <th class="num">Margem executada</th>
                <th class="num">Δ un. médio</th>
                <th class="num">Δ lucro médio</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in insightRows.by_acao" :key="row.acao">
                <td><SbBadge :variant="acaoMeta(row.acao).variant">{{ acaoMeta(row.acao).label }}</SbBadge></td>
                <td class="num">{{ row.count }}</td>
                <td class="num">{{ pct(row.avg_executed_margin_pct) }}</td>
                <td class="num"><span :class="deltaClass(row.avg_delta_units_pct)">{{ signedPct(row.avg_delta_units_pct) }}</span></td>
                <td class="num"><span :class="deltaClass(row.avg_delta_profit)">{{ signedBrl(row.avg_delta_profit) }}</span></td>
              </tr>
            </tbody>
          </SbTable>
        </section>

        <section class="pa-block">
          <h3 class="pa-block__t">Por saúde (recomendações)</h3>
          <SbEmptyState v-if="!insightRows.by_health?.length" title="Sem recomendações na janela" />
          <SbTable v-else>
            <thead>
              <tr>
                <th>Saúde</th>
                <th class="num">Anúncios</th>
                <th class="num">Margem atual média</th>
                <th class="num">Margem-alvo média</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in insightRows.by_health" :key="row.health">
                <td><SbBadge :variant="healthMeta(row.health).variant">{{ healthMeta(row.health).label }}</SbBadge></td>
                <td class="num">{{ row.count }}</td>
                <td class="num">{{ pct(row.avg_current_margin_pct) }}</td>
                <td class="num">{{ pct(row.avg_target_margin_pct) }}</td>
              </tr>
            </tbody>
          </SbTable>
        </section>

        <section class="pa-block">
          <h3 class="pa-block__t">Maiores altas e baixas (Δ un.)</h3>
          <SbEmptyState
            v-if="!insightRows.melhores?.length && !insightRows.piores?.length"
            title="Ainda sem efeito medido"
            message="Precisa de ações executadas e de snapshots diários depois delas."
          />
          <div v-else class="pa-extremes">
            <div>
              <p class="pa-extremes__l">Altas</p>
              <ul class="pa-extremes__list">
                <li v-for="row in insightRows.melhores" :key="`up-${row.item_id}`">
                  <span class="pv-title">{{ row.title }}</span>
                  <span :class="deltaClass(row.delta_units_pct)">{{ signedPct(row.delta_units_pct) }}</span>
                </li>
                <li v-if="!insightRows.melhores?.length" class="pa-extremes__empty">—</li>
              </ul>
            </div>
            <div>
              <p class="pa-extremes__l">Baixas</p>
              <ul class="pa-extremes__list">
                <li v-for="row in insightRows.piores" :key="`down-${row.item_id}`">
                  <span class="pv-title">{{ row.title }}</span>
                  <span :class="deltaClass(row.delta_units_pct)">{{ signedPct(row.delta_units_pct) }}</span>
                </li>
                <li v-if="!insightRows.piores?.length" class="pa-extremes__empty">—</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </q-expansion-item>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';

import SbPageHeader from 'src/components/common/SbPageHeader.vue';
import SbEmptyState from 'src/components/common/SbEmptyState.vue';
import SbTable from 'src/components/common/SbTable.vue';
import SbBadge from 'src/components/common/SbBadge.vue';
import PromoOverviewDetail from 'src/components/promotions-ads/PromoOverviewDetail.vue';

import MercadoLivreService from 'src/services/MercadoLivreService';

const ACAO_META = {
  aprofundar: { label: 'Aprofundar', variant: 'amber' },
  reduzir: { label: 'Reduzir desconto', variant: 'sky' },
  manter: { label: 'Manter', variant: 'slate' },
  rebase: { label: 'Rebase de preço', variant: 'indigo' },
  remover: { label: 'Remover', variant: 'red' },
  sem_oferta: { label: 'Sem oferta ML', variant: 'slate' },
};

const HEALTH_META = {
  parado: { label: 'Parado', variant: 'red' },
  fraco: { label: 'Fraco', variant: 'amber' },
  medio: { label: 'Médio', variant: 'sky' },
  alto: { label: 'Alto', variant: 'green' },
};

const STATUS_LABELS = {
  active: 'Ativo',
  paused: 'Pausado',
  closed: 'Encerrado',
  under_review: 'Em revisão',
};

const PROMO_LABELS = {
  PRICE_DISCOUNT: 'Oferta do dia',
  DEAL: 'O melhor de todos os dias',
  SMART: 'O melhor de todos os dias',
  LIGHTNING: 'Oferta relâmpago',
  SELLER_CAMPAIGN: 'Promo DoseVerde',
  SELLER_COUPON_CAMPAIGN: 'Cupom da loja',
};

const INPUT_LABELS = { cmv: 'CMV', fee: 'tarifa', shipping: 'frete', price: 'preço' };

// Schema de colunas. `group`: 'title' (sempre), 'geral', 'financeiro', 'assistente'.
const COLUMNS = [
  { key: 'title', label: 'Anúncio', group: 'title' },
  { key: 'health', label: 'Saúde', group: 'geral', filter: 'health' },
  { key: 'sales_30d', label: 'Vendas 30d', group: 'geral', sortable: true, sortKey: 'sales', numeric: true, filter: 'range' },
  { key: 'price', label: 'Preço-base', group: 'financeiro', sortable: true, sortKey: 'price', numeric: true, filter: 'range' },
  { key: 'promo', label: 'Promo ativa', group: 'geral', filter: 'origem' },
  { key: 'discount_pct', label: '% desc', group: 'geral', sortable: true, sortKey: 'discount', numeric: true, filter: 'range' },
  { key: 'buyer_price', label: 'Preço promo', group: 'financeiro', numeric: true, filter: 'range' },
  { key: 'cmv_unit', label: 'CMV', group: 'financeiro', numeric: true, filter: 'range' },
  { key: 'margin_pct', label: 'Margem', group: 'financeiro', sortable: true, sortKey: 'margin', numeric: true, filter: 'range' },
  { key: 'profit_unit', label: 'Lucro', group: 'financeiro', numeric: true, filter: 'range' },
  { key: 'agent_last', label: 'Última ação', group: 'assistente', sortable: true, sortKey: 'activation', filter: 'dates' },
  { key: 'promo_dates', label: 'Datas promo', group: 'geral', filter: 'dates' },
];

const PRESETS = {
  tudo: null,
  geral: ['geral'],
  financeiro: ['financeiro'],
  assistente: ['geral', 'assistente'],
};

const loading = ref(false);
const error = ref('');
const rows = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(40);
const summary = ref({});
const snapshot = ref({});
const accounts = ref([]);
const insights = ref({});
const sort = ref('-sales');
const preset = ref('tudo');
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
const promoOptions = [
  { label: 'Com promo ativa', value: 'has_promo' },
  { label: 'Sem promo', value: 'sem_promo' },
  { label: '🤖 Registro do assistente', value: 'assistente' },
  { label: 'Sem vínculo identificado', value: 'ml' },
];
const presetOptions = [
  { label: 'Tudo', value: 'tudo' },
  { label: 'Geral', value: 'geral' },
  { label: 'Financeiro', value: 'financeiro' },
  { label: 'Assistente', value: 'assistente' },
];
const insightRows = computed(() => insights.value.insights || {});
const snapshotAt = computed(() => (snapshot.value.computed_at ? dateTime(snapshot.value.computed_at) : ''));
const snapshotStale = computed(() => Boolean(snapshot.value.stale));

const visibleColumns = computed(() => {
  const groups = PRESETS[preset.value];
  if (!groups) return COLUMNS;
  return COLUMNS.filter((c) => c.group === 'title' || groups.includes(c.group));
});

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const isScopeDefault = computed(() => !filters.origem && !filters.belowFloor && !filters.hasPromo && !filters.hasAgentHistory);
const scopeLabel = computed(() => (filters.accountId || filters.status ? ` (${filters.accountId ? 'conta' : ''}${filters.accountId && filters.status ? ' + ' : ''}${filters.status ? 'status' : ''})` : ''));

const activeFilterChips = computed(() => {
  const chips = [];
  if (filters.q) chips.push({ key: 'q', label: `busca “${filters.q}”`, clear: () => { filters.q = ''; } });
  if (filters.accountId) chips.push({ key: 'account', label: 'conta', clear: () => { filters.accountId = null; } });
  if (filters.status) chips.push({ key: 'status', label: statusLabel(filters.status), clear: () => { filters.status = null; } });
  if (filters.health) chips.push({ key: 'health', label: healthMeta(filters.health).label, clear: () => { filters.health = null; } });
  if (filters.origem) chips.push({ key: 'origem', label: `promo: ${filters.origem}`, clear: () => { filters.origem = ''; } });
  if (filters.hasPromo) chips.push({ key: 'hasPromo', label: 'com promo ativa', clear: () => { filters.hasPromo = false; } });
  if (filters.belowFloor) chips.push({ key: 'belowFloor', label: 'abaixo do piso', clear: () => { filters.belowFloor = false; } });
  if (filters.hasAgentHistory) chips.push({ key: 'hist', label: 'com ação no histórico', clear: () => { filters.hasAgentHistory = false; } });
  for (const col of COLUMNS) {
    if (col.filter === 'range') {
      const minK = `${col.key}Min`;
      const maxK = `${col.key}Max`;
      if (filters[minK] !== null && filters[minK] !== undefined && filters[minK] !== '') {
        chips.push({ key: minK, label: `${col.label} ≥ ${filters[minK]}`, clear: () => { filters[minK] = null; } });
      }
      if (filters[maxK] !== null && filters[maxK] !== undefined && filters[maxK] !== '') {
        chips.push({ key: maxK, label: `${col.label} ≤ ${filters[maxK]}`, clear: () => { filters[maxK] = null; } });
      }
    }
    if (col.filter === 'dates') {
      const fromK = `${col.key}From`;
      const toK = `${col.key}To`;
      if (filters[fromK]) chips.push({ key: fromK, label: `${col.label} ≥ ${filters[fromK]}`, clear: () => { filters[fromK] = ''; } });
      if (filters[toK]) chips.push({ key: toK, label: `${col.label} ≤ ${filters[toK]}`, clear: () => { filters[toK] = ''; } });
    }
  }
  return chips;
});

const hasActiveFilters = computed(() => activeFilterChips.value.length > 0);

// Getter/setter unificado para o select da coluna "Promo ativa".
const promoFilter = computed({
  get: () => (filters.hasPromo ? 'has_promo' : filters.origem),
  set: (value) => {
    if (value === 'has_promo') { filters.hasPromo = true; filters.origem = ''; }
    else { filters.hasPromo = false; filters.origem = value || ''; }
  },
});

function colClass(col) {
  return col.numeric ? 'num' : '';
}

function ariaSort(col) {
  if (!col.sortable) return undefined;
  if (sort.value === `-${col.sortKey}`) return 'descending';
  if (sort.value === col.sortKey) return 'ascending';
  return 'none';
}

function sortIndicator(col) {
  if (sort.value === `-${col.sortKey}`) return '▼';
  if (sort.value === col.sortKey) return '▲';
  return '';
}

function cycleSort(sortKey) {
  const desc = `-${sortKey}`;
  sort.value = sort.value === desc ? sortKey : desc;
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

function openDetail(row) {
  detailId.value = row.item_id;
  detailTitle.value = row.title;
  detailOpen.value = true;
}

function goTo(next) {
  page.value = Math.max(1, Math.min(next, totalPages.value));
}

// ── Formatação ────────────────────────────────────────────────────────────────
function promoLabel(promo) {
  if (!promo) return '—';
  return promo.promotion_name || PROMO_LABELS[promo.promotion_type] || promo.promotion_type;
}

function promoDates(promo) {
  if (!promo?.start_date) return '—';
  const start = dateShort(promo.start_date);
  const finish = promo.finish_date ? dateShort(promo.finish_date) : null;
  return finish ? `${start} → ${finish}` : `${start} → …`;
}

function dateShort(iso) {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('pt-BR');
}

function dateTime(iso) {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

function brl(value) {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function pct(value) {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toFixed(1).replace('.', ',')}%`;
}

function signedPct(value) {
  if (value === null || value === undefined) return '—';
  const sinal = Number(value) > 0 ? '+' : '';
  return `${sinal}${Number(value).toFixed(1).replace('.', ',')}%`;
}

function signedBrl(value) {
  if (value === null || value === undefined) return '—';
  const sinal = Number(value) > 0 ? '+' : '';
  return `${sinal}${brl(value)}`;
}

function deltaClass(value) {
  if (value === null || value === undefined) return 'pa-delta pa-delta--none';
  if (Number(value) > 0) return 'pa-delta pa-delta--up';
  if (Number(value) < 0) return 'pa-delta pa-delta--down';
  return 'pa-delta pa-delta--none';
}

function acaoMeta(acao) {
  return ACAO_META[acao] || { label: acao || '—', variant: 'slate' };
}

function healthMeta(healthValue) {
  return HEALTH_META[healthValue] || { label: healthValue || '—', variant: 'slate' };
}

function healthTitle(row) {
  const hi = row.health_info || {};
  const parts = [];
  if (hi.units_per_week != null) parts.push(`${hi.units_per_week} un./semana`);
  if (hi.parado_sob_promocao) parts.push('parado sob promoção');
  return parts.join(' · ') || undefined;
}

function marginTitle(row) {
  if (row.margin_pct != null) return undefined;
  if (row.missing_inputs?.length) return `sem ${row.missing_inputs.map((m) => INPUT_LABELS[m] || m).join(', ')}`;
  if (!row.has_active_promo && !row.active_promo) return 'sem dados de snapshot';
  return 'não calculável';
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
    if (payload.accounts?.length) accounts.value = payload.accounts;
  } catch (err) {
    if (seq !== requestSeq) return;
    error.value = err?.response?.data?.detail || err?.message || 'Erro inesperado.';
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
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

.pv-note {
  margin: $space-4 0 $space-3;
  font-size: $text-small-size;
  color: $text-muted;
  max-width: 960px;

  code {
    background: $surface;
    border: 1px solid $border;
    border-radius: 4px;
    padding: 1px 4px;
    font-size: $text-xs-size;
  }
}

// ── KPIs clicáveis (números estáveis) ────────────────────────────────────────
.pv-summary {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
  margin-bottom: $space-3;
}

.pv-chip {
  border: 1px solid $border;
  background: $surface;
  border-radius: 999px;
  padding: 4px 14px;
  font-size: $text-small-size;
  font-weight: $font-medium;
  color: $text-primary;
  cursor: pointer;

  &:hover { border-color: $text-disabled; }
  &--on { border-color: $primary; background: rgba($primary, 0.08); }
  &--alert { color: $negative; }
  &--agent { color: $indigo-8; }
  &--history { color: $info; }
}

// ── Toolbar ──────────────────────────────────────────────────────────────────
.pv-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: $space-3;
  margin-bottom: $space-2;

  &__account, &__status { width: 190px; }
  &__q { width: 240px; }
}

.pv-result {
  margin: 0 0 $space-3;
  font-size: $text-small-size;
  color: $text-muted;
}

.pv-filter-tag {
  border: none;
  background: $surface;
  border-radius: 999px;
  padding: 1px 10px;
  font-size: $text-xs-size;
  color: $text-primary;
  cursor: pointer;
  border: 1px solid $border;
}

// ── Tabela ──────────────────────────────────────────────────────────────────
:deep(.sb-table) {
  th, td { white-space: nowrap; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
}

.pv-th-btn {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 2px;

  &:focus-visible { outline: 2px solid $primary; outline-offset: 2px; border-radius: 4px; }
}

.pv-filter-row th {
  padding: $space-1 $space-2 !important;
  border-bottom: 1px solid $border !important;
  font-weight: $font-regular;
}

.pv-filter-row :deep(.q-field__control) {
  min-height: 32px;
  height: 32px;
  font-size: $text-xs-size;
  background: $surface;
}

.pv-range {
  display: flex;
  gap: $space-1;
  min-width: 130px;

  :deep(.q-field) { width: 64px; }

  &--dates {
    min-width: 220px;
    :deep(.q-field) { width: 108px; }
  }
}

.pv-arrow { color: $primary; font-size: $text-xs-size; }

.pv-title {
  display: block;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: $text-small-size;
  font-weight: $font-medium;
  color: $primary;
  text-decoration: none;

  &:hover { text-decoration: underline; }
}

.pv-expand-col { width: 40px; text-align: center; padding-right: 0 !important; }

.pv-sub {
  display: block;
  font-size: $text-xs-size;
  color: $text-disabled;
}

.pv-promo { font-size: $text-small-size; color: $text-primary; }

// Alerta de piso: vermelho (única cor de alerta da página)
.pv-alert { color: $negative; font-weight: $font-semibold; }

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

// ── Insights (recolhido por padrão) ─────────────────────────────────────────
.pv-insights {
  margin-top: $space-6;
  border: 1px solid $border;
  border-radius: 14px;
  background: $surface;
}

.pa-insights {
  display: grid;
  gap: $space-6;
  padding: $space-4;
}

.pa-block__t {
  margin: 0 0 $space-2;
  font-size: $text-h3-size;
  font-weight: $font-semibold;
  color: $text-primary;
}

.pa-extremes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: $space-4;
}

.pa-extremes__l {
  margin: 0 0 $space-2;
  font-size: $text-xs-size;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: $text-muted;
}

.pa-extremes__list {
  list-style: none;
  margin: 0;
  padding: $space-3 $space-4;
  border: 1px solid $border;
  border-radius: $radius-lg;
  background: $surface;
  box-shadow: $shadow-xs;

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $space-3;
    padding: $space-1 0;
    font-size: $text-small-size;
  }
}

.pa-extremes__empty { color: $text-disabled; }

.pa-delta--up { color: $positive; font-weight: $font-semibold; }
.pa-delta--down { color: $negative; font-weight: $font-semibold; }
.pa-delta--none { color: $text-disabled; }
</style>
