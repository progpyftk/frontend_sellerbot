<template>
  <q-page class="promo-advisor q-pa-lg">
    <SbPageHeader
      eyebrow="Mercado Livre"
      title="Promoções · Assistente"
      subtitle="Todos os anúncios das suas contas: vendas, promo ativa, margem na venda atual e o que já passou pelo assistente. Somente leitura — ativar e remover continuam na visão operacional."
      icon="auto_graph"
    >
      <template #actions>
        <q-btn outline no-caps icon="refresh" label="Atualizar" :loading="loading" @click="load" />
      </template>
    </SbPageHeader>

    <SbEmptyState
      v-if="error"
      variant="error"
      title="Não foi possível carregar o acompanhamento"
      :message="error"
    />

    <template v-else>
      <p class="pv-note">
        Margem e lucro calculados <strong>na venda atual</strong> (promo ativa, ou preço-base se
        não há promo) com CMV do Tiny, tarifa e frete reais. Lista servida do snapshot de
        <strong>{{ snapshotAt || '—' }}</strong>{{ snapshotStale ? ' (defasado — atualize o snapshot)' : '' }}.
      </p>

      <!-- KPIs clicáveis: números são do escopo (conta/busca) e NÃO mudam quando
           um chip é clicado — clicar filtra a tabela, não os números. -->
      <div class="pv-summary" role="group" aria-label="Resumo e filtros rápidos">
        <button class="pv-chip" :class="{ 'pv-chip--on': !origem && !belowFloor && !hasPromo }" @click="resetFacets">
          {{ summary.ads }} anúncios
        </button>
        <button class="pv-chip" :class="{ 'pv-chip--on': hasPromo }" @click="toggleHasPromo">
          {{ summary.with_active_promo }} com promo ativa
        </button>
        <button class="pv-chip pv-chip--alert" :class="{ 'pv-chip--on': belowFloor }" @click="toggleBelowFloor">
          {{ summary.below_floor }} abaixo do piso
        </button>
        <button class="pv-chip pv-chip--agent" :class="{ 'pv-chip--on': origem === 'assistente' }" @click="toggleAssistente">
          {{ summary.assistente }} do assistente
        </button>
      </div>

      <!-- Toolbar de escopo: conta, status e limpar -->
      <div class="pv-toolbar">
        <q-select
          v-model="accountId" dense outlined clearable emit-value map-options
          :options="accountOptions" class="pv-toolbar__account" label="Conta"
        />
        <q-select
          v-model="status" dense outlined clearable emit-value map-options
          :options="statusOptions" class="pv-toolbar__status" label="Status do anúncio"
        />
        <q-btn
          v-if="anyFilterActive" flat dense no-caps icon="filter_alt_off"
          label="Limpar filtros" @click="clearAllFilters"
        />
      </div>

      <!-- Tabela: protagonista (1 linha = 1 anúncio) + filtro por coluna -->
      <SbTable :scroll-x="true">
        <thead>
          <tr class="pv-head-row">
            <th class="pv-expand-col" aria-label="Expandir"></th>
            <th>Anúncio</th>
            <th>Saúde</th>
            <th class="num pv-sortable" @click="cycleSort('-sales')">
              Vendas 30d <span v-if="sortIndicator('sales')" class="pv-arrow">{{ sortIndicator('sales') }}</span>
            </th>
            <th class="num pv-sortable" @click="cycleSort('-price')">
              Preço-base <span v-if="sortIndicator('price')" class="pv-arrow">{{ sortIndicator('price') }}</span>
            </th>
            <th>Promo ativa</th>
            <th class="num pv-sortable" @click="cycleSort('-discount')">
              % desc <span v-if="sortIndicator('discount')" class="pv-arrow">{{ sortIndicator('discount') }}</span>
            </th>
            <th class="num">Preço promo</th>
            <th class="num">CMV</th>
            <th class="num pv-sortable" @click="cycleSort('-margin')">
              Margem <span v-if="sortIndicator('margin')" class="pv-arrow">{{ sortIndicator('margin') }}</span>
            </th>
            <th class="num">Lucro</th>
            <th class="pv-sortable" @click="cycleSort('-activation')">
              Ativação assistente <span v-if="sortIndicator('activation')" class="pv-arrow">{{ sortIndicator('activation') }}</span>
            </th>
            <th>Datas promo</th>
          </tr>
          <tr class="pv-filter-row">
            <th class="pv-expand-col"></th>
            <th>
              <q-input v-model="filters.q" dense outlined clearable debounce="350" placeholder="buscar" aria-label="Buscar título, MLB ou SKU" />
            </th>
            <th>
              <q-select v-model="filters.health" dense outlined clearable emit-value map-options :options="healthOptions" aria-label="Filtrar por saúde" />
            </th>
            <th>
              <q-input v-model.number="filters.minSales" dense outlined type="number" min="0" debounce="400" placeholder="min" aria-label="Vendas mínimas em 30 dias" />
            </th>
            <th></th>
            <th>
              <q-select
                v-model="promoFilter" dense outlined clearable emit-value map-options
                :options="promoOptions" aria-label="Filtrar por promo ativa"
              />
            </th>
            <th>
              <q-input v-model.number="filters.minDiscount" dense outlined type="number" min="0" max="100" debounce="400" placeholder="min" aria-label="Desconto mínimo" />
            </th>
            <th></th>
            <th></th>
            <th>
              <div class="pv-range">
                <q-input v-model.number="filters.minMargin" dense outlined type="number" debounce="400" placeholder="min" aria-label="Margem mínima (%)" />
                <q-input v-model.number="filters.maxMargin" dense outlined type="number" debounce="400" placeholder="máx" aria-label="Margem máxima (%)" />
              </div>
            </th>
            <th>
              <q-input v-model.number="filters.minProfit" dense outlined type="number" debounce="400" placeholder="min" aria-label="Lucro mínimo por venda" />
            </th>
            <th>
              <div class="pv-range">
                <q-input v-model="filters.activationFrom" dense outlined type="date" aria-label="Ativação a partir de" />
                <q-input v-model="filters.activationTo" dense outlined type="date" aria-label="Ativação até" />
              </div>
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="row in rows" :key="row.item_id">
            <tr :class="{ 'pv-row--open': expandedId === row.item_id }">
              <td class="pv-expand-col">
                <q-btn
                  flat dense round size="sm"
                  :icon="expandedId === row.item_id ? 'expand_less' : 'expand_more'"
                  :aria-label="expandedId === row.item_id ? 'Recolher detalhe' : 'Expandir detalhe'"
                  @click="toggleExpand(row.item_id)"
                />
              </td>
              <td>
                <span class="pv-title">{{ row.title }}</span>
                <span class="pv-sub">{{ row.item_id }}<template v-if="row.sku"> · {{ row.sku }}</template> · {{ row.account_nickname }}<template v-if="row.status && row.status !== 'active'"> · {{ statusLabel(row.status) }}</template></span>
              </td>
              <td>
                <SbBadge v-if="row.health" :variant="healthMeta(row.health).variant">{{ healthMeta(row.health).label }}</SbBadge>
                <template v-else>—</template>
              </td>
              <td class="num">{{ row.sales_30d ?? '—' }}</td>
              <td class="num">{{ brl(row.price) }}</td>
              <td>
                <template v-if="row.active_promo">
                  <span class="pv-promo">{{ promoLabel(row.active_promo) }}</span>
                  <SbBadge :variant="row.origem === 'assistente' ? 'indigo' : 'slate'" class="q-ml-xs">
                    {{ row.origem === 'assistente' ? '🤖 assistente' : 'ML' }}
                  </SbBadge>
                </template>
                <template v-else>—</template>
              </td>
              <td class="num">{{ pct(row.active_promo?.discount_pct) }}</td>
              <td class="num">{{ brl(row.active_promo?.buyer_price) }}</td>
              <td class="num">{{ brl(row.cmv_unit) }}</td>
              <td class="num" :class="{ 'pv-alert': row.below_floor }">{{ pct(row.margin_pct) }}</td>
              <td class="num" :class="{ 'pv-alert': row.below_floor }">{{ brl(row.profit_unit) }}</td>
              <td class="pv-dates">
                <template v-if="row.agent_last">
                  <span>{{ dateShort(row.agent_last.created_at) }}</span>
                  <SbBadge :variant="acaoMeta(row.agent_last.acao).variant" class="q-ml-xs">{{ acaoMeta(row.agent_last.acao).label }}</SbBadge>
                </template>
                <template v-else>—</template>
              </td>
              <td class="pv-dates">{{ promoDates(row.active_promo) }}</td>
            </tr>
            <tr v-if="expandedId === row.item_id">
              <td colspan="13" class="pv-detail-cell">
                <PromoOverviewDetail :item-id="row.item_id" />
              </td>
            </tr>
          </template>
        </tbody>
      </SbTable>

      <SbEmptyState
        v-if="!rows.length && !loading"
        title="Nenhum anúncio com esses filtros"
        message="Ajuste a busca ou os filtros para ver o catálogo."
      />

      <!-- Paginação -->
      <div class="pv-pager" v-if="total > pageSize || page > 1">
        <q-btn flat no-caps icon="chevron_left" label="Anterior" :disable="page <= 1" @click="goTo(page - 1)" />
        <span class="pv-pager__info">Página {{ page }} · {{ total }} anúncios</span>
        <q-btn flat no-caps label="Próxima" icon-right="chevron_right" :disable="page * pageSize >= total" @click="goTo(page + 1)" />
      </div>

      <!-- Insights (mantido do painel do assistente) -->
      <q-expansion-item
        class="pv-insights"
        icon="insights"
        label="Insights do assistente"
        caption="Por ação, por saúde e maiores efeitos medidos"
        default-opened
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
    </template>
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

// Clique no th cicla desc → asc → desc …; título cicla A–Z/Z–A.
const SORT_CYCLE = {
  '-sales': 'sales', sales: '-sales',
  '-margin': 'margin', margin: '-margin',
  '-discount': 'discount', discount: '-discount',
  '-price': 'price', price: '-price',
  '-activation': 'activation', activation: '-activation',
  health: 'health',
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
// Uma linha expandida por vez — o detalhe consulta o ML ao vivo.
const expandedId = ref(null);
const sort = ref('-sales');

// Filtros de escopo (afetam tabela e KPIs) e facets dos KPIs (só a tabela).
const filters = reactive({
  q: '',
  accountId: null,
  status: null,
  health: null,
  origem: '',
  hasPromo: false,
  belowFloor: false,
  minSales: null,
  minMargin: null,
  maxMargin: null,
  minDiscount: null,
  minProfit: null,
  activationFrom: '',
  activationTo: '',
});

const accountOptions = computed(() => {
  const derived = accounts.value.map((a) => ({ label: a.account_nickname || a.account_id, value: a.account_id }));
  if (filters.accountId && !derived.some((o) => o.value === filters.accountId)) {
    derived.push({ label: filters.accountId, value: filters.accountId });
  }
  return derived;
});
const healthOptions = Object.entries(HEALTH_META).map(([value, meta]) => ({ label: meta.label, value }));
const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({ label, value }));
const promoOptions = [
  { label: 'Com promo ativa', value: 'has_promo' },
  { label: 'Sem promo', value: 'sem_promo' },
  { label: '🤖 Assistente', value: 'assistente' },
  { label: 'ML', value: 'ml' },
];
const insightRows = computed(() => insights.value.insights || {});
const snapshotAt = computed(() => (snapshot.value.computed_at ? dateTime(snapshot.value.computed_at) : ''));
const snapshotStale = computed(() => Boolean(snapshot.value.stale));
const anyFilterActive = computed(() => Object.entries(filters).some(([key, value]) => {
  if (value === null || value === '' || value === false) return false;
  return true;
}));

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

function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

// ── Formatação ────────────────────────────────────────────────────────────────
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

function dateTime(iso) {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function acaoMeta(acao) {
  return ACAO_META[acao] || { label: acao || '—', variant: 'slate' };
}

function healthMeta(healthValue) {
  return HEALTH_META[healthValue] || { label: healthValue || '—', variant: 'slate' };
}

// ── Filtros e ordenação ──────────────────────────────────────────────────────
// Chips = facets independentes (combináveis): "abaixo do piso" + "assistente"
// mostram a interseção; os números dos KPIs seguem do escopo. "N anúncios" limpa.
function resetFacets() {
  filters.origem = '';
  filters.hasPromo = false;
  filters.belowFloor = false;
}

function toggleHasPromo() {
  filters.hasPromo = !filters.hasPromo;
}

function toggleBelowFloor() {
  filters.belowFloor = !filters.belowFloor;
}

function toggleAssistente() {
  filters.origem = filters.origem === 'assistente' ? '' : 'assistente';
}

function setPromoColumnFilter(value) {
  // Select da coluna "Promo ativa": mapeia p/ os mesmos refs dos chips.
  if (value === 'has_promo') {
    filters.hasPromo = true;
    filters.origem = '';
  } else {
    filters.hasPromo = false;
    filters.origem = value || '';
  }
}

// Getter/setter unificados para o select da coluna "Promo ativa".
const promoFilter = computed({
  get: () => (filters.hasPromo ? 'has_promo' : filters.origem),
  set: setPromoColumnFilter,
});

function clearAllFilters() {
  Object.assign(filters, {
    q: '', accountId: null, status: null, health: null,
    origem: '', hasPromo: false, belowFloor: false,
    minSales: null, minMargin: null, maxMargin: null,
    minDiscount: null, minProfit: null, activationFrom: '', activationTo: '',
  });
  if (sort.value !== '-sales') sort.value = '-sales';
}

function cycleSort(current) {
  sort.value = SORT_CYCLE[current] ?? current;
}

function sortIndicator(base) {
  if (sort.value === base) return '▲';
  if (sort.value === `-${base}`) return '▼';
  return '';
}

function toggleExpand(itemId) {
  expandedId.value = expandedId.value === itemId ? null : itemId;
}

function goTo(next) {
  page.value = next;
}

watch(filters, () => {
  page.value = 1;
  load();
});
watch(sort, () => load());

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const params = {
      page: page.value,
      page_size: pageSize.value,
      sort: sort.value,
    };
    if (filters.q) params.q = filters.q;
    if (filters.accountId) params.account_id = filters.accountId;
    if (filters.status) params.status = filters.status;
    if (filters.health) params.health = filters.health;
    if (filters.minSales !== null && filters.minSales !== undefined && filters.minSales !== '') params.min_sales_30d = filters.minSales;
    if (filters.minMargin !== null && filters.minMargin !== undefined && filters.minMargin !== '') params.min_margin_pct = filters.minMargin;
    if (filters.maxMargin !== null && filters.maxMargin !== undefined && filters.maxMargin !== '') params.max_margin_pct = filters.maxMargin;
    if (filters.minDiscount !== null && filters.minDiscount !== undefined && filters.minDiscount !== '') params.min_discount_pct = filters.minDiscount;
    if (filters.minProfit !== null && filters.minProfit !== undefined && filters.minProfit !== '') params.min_profit = filters.minProfit;
    if (filters.activationFrom) params.activation_from = filters.activationFrom;
    if (filters.activationTo) params.activation_to = filters.activationTo;
    // Facets dos chips: has_promo/origem/below_floor (números dos KPIs não mudam).
    if (filters.origem) params.origem = filters.origem;
    if (filters.hasPromo) params.has_promo = 1;
    if (filters.belowFloor) params.below_floor = 1;
    const { data: payload } = await MercadoLivreService.getPromoOverview(params);
    rows.value = payload.results || [];
    total.value = payload.total || 0;
    summary.value = payload.summary || {};
    snapshot.value = payload.snapshot || {};
    accounts.value = deriveAccounts(payload.results);
  } catch (err) {
    error.value = err?.response?.data?.detail || err?.message || 'Erro inesperado.';
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

// As opções de conta vêm das linhas carregadas (lista é paginada; o backend
// não expõe um índice de contas para este endpoint). A conta selecionada
// permanece nas opções mesmo saindo da página atual.
function deriveAccounts(results) {
  const seen = new Map();
  for (const row of results) {
    if (!seen.has(row.account_id)) seen.set(row.account_id, { account_id: row.account_id, account_nickname: row.account_nickname });
  }
  return [...seen.values()];
}

async function loadInsights() {
  try {
    const { data: payload } = await MercadoLivreService.getPromotionsAdvisor({ days: 30, limit: 100 });
    insights.value = payload || {};
  } catch {
    insights.value = {};
  }
}

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
  max-width: 900px;
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

  &:hover {
    border-color: $text-disabled;
  }

  &--on {
    border-color: $primary;
    background: rgba($primary, 0.08);
  }

  &--alert {
    color: $negative;
  }

  &--agent {
    color: $indigo-8;
  }
}

// ── Toolbar de escopo ────────────────────────────────────────────────────────
.pv-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: $space-3;
  margin-bottom: $space-3;

  &__account,
  &__status {
    width: 200px;
  }
}

// ── Tabela (cabeçalho + linha de filtro por coluna) ──────────────────────────
:deep(.sb-table) {
  th,
  td {
    white-space: nowrap;
  }

  td.num,
  th.num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  th.pv-sortable {
    cursor: pointer;
    user-select: none;

    &:hover {
      color: $text-primary;
    }
  }
}

.pv-filter-row th {
  padding: $space-1 $space-2 !important;
  border-bottom: 1px solid $border !important;
  font-weight: $font-regular;
}

.pv-filter-row :deep(.q-field__control) {
  min-height: 30px;
  height: 30px;
  font-size: $text-xs-size;
  background: $surface;
}

.pv-filter-row :deep(.q-field__marginal) {
  height: 30px;
  min-width: 22px;
}

.pv-filter-row :deep(input) {
  font-size: $text-xs-size;
  padding: 0;
}

.pv-range {
  display: flex;
  gap: $space-1;
  min-width: 120px;

  :deep(.q-field) {
    width: 58px;
  }
}

.pv-arrow {
  color: $primary;
  font-size: $text-xs-size;
}

.pv-title {
  display: block;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: $text-small-size;
  font-weight: $font-medium;
  color: $text-primary;
}

// coluna ⏵ + painel do detalhe
.pv-expand-col {
  width: 40px;
  text-align: center;
  padding-right: 0 !important;
}

.pv-row--open td {
  background: #f8fafc;
}

.pv-detail-cell {
  padding: 0 $space-3 $space-3 !important;
  background: #f8fafc;
}

.pv-sub {
  display: block;
  font-size: $text-xs-size;
  color: $text-disabled;
}

.pv-promo {
  font-size: $text-small-size;
  color: $text-primary;
}

.pv-dates {
  font-size: $text-xs-size;
  color: $text-muted;

  :deep(.sb-badge) {
    vertical-align: middle;
  }
}

// Alerta de piso: vermelho (única cor de alerta da página)
.pv-alert {
  color: $negative;
  font-weight: $font-semibold;
}

// ── Paginação ────────────────────────────────────────────────────────────────
.pv-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-4;
  margin-top: $space-3;

  &__info {
    font-size: $text-small-size;
    color: $text-muted;
  }
}

// ── Insights (mantido) ───────────────────────────────────────────────────────
.pv-insights {
  margin-top: $space-6;
  border: 1px solid $border;
  border-radius: 14px;
  background: $surface;

  &__header {
    font-size: $text-small-size;
  }
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

.pa-extremes__empty {
  color: $text-disabled;
}

// ↑/↓ seguem a convenção brasileira de variação: alta é verde, baixa é vermelho.
.pa-delta--up {
  color: $positive;
  font-weight: $font-semibold;
}

.pa-delta--down {
  color: $negative;
  font-weight: $font-semibold;
}

.pa-delta--none {
  color: $text-disabled;
}
</style>
