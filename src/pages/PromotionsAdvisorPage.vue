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
        não há promo). Lista servida do snapshot de
        <strong>{{ snapshotAt || '—' }}</strong>{{ snapshotStale ? ' (defasado — atualize o snapshot)' : '' }}.
      </p>

      <!-- Resumo em texto; cada número é um filtro -->
      <div class="pv-summary" role="group" aria-label="Resumo e filtros rápidos">
        <button class="pv-chip" :class="{ 'pv-chip--on': !origem && !belowFloor && !hasPromo }" @click="resetFilters">
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

      <!-- Filtros: 1 fileira -->
      <div class="pv-filters">
        <q-input
          v-model="q" dense outlined clearable debounce="350" class="pv-filters__q"
          placeholder="Buscar título, MLB ou SKU"
        />
        <q-select
          v-model="accountId" dense outlined clearable emit-value map-options
          :options="accountOptions" class="pv-filters__account" label="Conta"
        />
        <q-select
          v-model="health" dense outlined clearable emit-value map-options
          :options="healthOptions" class="pv-filters__health" label="Saúde"
        />
        <q-select
          v-model="sort" dense outlined emit-value map-options
          :options="sortOptions" class="pv-filters__sort" label="Ordenar por"
        />
      </div>

      <!-- Tabela: protagonista (1 linha = 1 anúncio) -->
      <SbTable :scroll-x="true">
        <thead>
          <tr>
            <th>Anúncio</th>
            <th class="num pv-sortable" @click="cycleSort('-sales')">Vendas 30d</th>
            <th>Promo ativa</th>
            <th class="num pv-sortable" @click="cycleSort('-discount')">% desc</th>
            <th class="num">Preço promo</th>
            <th class="num pv-sortable" @click="cycleSort('-margin')">Margem</th>
            <th class="num">Lucro</th>
            <th>Datas promo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.item_id">
            <td>
              <span class="pv-title">{{ row.title }}</span>
              <span class="pv-sub">{{ row.item_id }}<template v-if="row.sku"> · {{ row.sku }}</template> · {{ row.account_nickname }}</span>
            </td>
            <td class="num">{{ row.sales_30d ?? '—' }}</td>
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
            <td class="num" :class="{ 'pv-alert': row.below_floor }">{{ pct(row.margin_pct) }}</td>
            <td class="num" :class="{ 'pv-alert': row.below_floor }">{{ brl(row.profit_unit) }}</td>
            <td class="pv-dates">{{ promoDates(row.active_promo) }}</td>
          </tr>
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
import { computed, onMounted, ref, watch } from 'vue';

import SbPageHeader from 'src/components/common/SbPageHeader.vue';
import SbEmptyState from 'src/components/common/SbEmptyState.vue';
import SbTable from 'src/components/common/SbTable.vue';
import SbBadge from 'src/components/common/SbBadge.vue';

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

const PROMO_LABELS = {
  PRICE_DISCOUNT: 'Oferta do dia',
  DEAL: 'O melhor de todos os dias',
  SMART: 'O melhor de todos os dias',
  LIGHTNING: 'Oferta relâmpago',
  SELLER_CAMPAIGN: 'Promo DoseVerde',
  SELLER_COUPON_CAMPAIGN: 'Cupom da loja',
};

const SORT_CYCLE = { '-sales': 'sales', sales: '-sales', '-margin': 'margin', margin: '-margin', '-discount': 'discount', discount: '-discount' };

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

// filtros
const q = ref('');
const accountId = ref(null);
const health = ref(null);
const origem = ref('');
const hasPromo = ref(false);
const belowFloor = ref(false);
const sort = ref('-sales');

const accountOptions = computed(() => accounts.value.map((a) => ({ label: a.account_nickname || a.account_id, value: a.account_id })));
const healthOptions = Object.entries(HEALTH_META).map(([value, meta]) => ({ label: meta.label, value }));
const sortOptions = [
  { label: 'Vendas (maior primeiro)', value: '-sales' },
  { label: 'Vendas (menor primeiro)', value: 'sales' },
  { label: 'Margem (menor primeiro)', value: '-margin' },
  { label: 'Margem (maior primeiro)', value: 'margin' },
  { label: 'Desconto (maior primeiro)', value: '-discount' },
  { label: 'Título (A–Z)', value: 'title' },
];
const insightRows = computed(() => insights.value.insights || {});
const snapshotAt = computed(() => (snapshot.value.computed_at ? dateTime(snapshot.value.computed_at) : ''));
const snapshotStale = computed(() => Boolean(snapshot.value.stale));

const totalFiltered = computed(() => summary.value.ads ?? total.value);

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
function resetFilters() {
  origem.value = '';
  hasPromo.value = false;
  belowFloor.value = false;
}

function toggleHasPromo() {
  hasPromo.value = !hasPromo.value;
  if (hasPromo.value) belowFloor.value = false;
}

function toggleBelowFloor() {
  belowFloor.value = !belowFloor.value;
  if (belowFloor.value) hasPromo.value = false;
}

function toggleAssistente() {
  origem.value = origem.value === 'assistente' ? '' : 'assistente';
}

function cycleSort(column) {
  sort.value = SORT_CYCLE[column] ?? column;
}

function goTo(next) {
  page.value = next;
}

watch([q, accountId, health, origem, hasPromo, belowFloor, sort], () => {
  page.value = 1;
  load();
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const params = {
      page: page.value,
      page_size: pageSize.value,
      sort: sort.value,
    };
    if (q.value) params.q = q.value;
    if (accountId.value) params.account_id = accountId.value;
    if (health.value) params.health = health.value;
    if (origem.value) params.origem = origem.value;
    if (hasPromo.value) params.has_promo = 1;
    if (belowFloor.value) params.below_floor = 1;
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
// não expõe um índice de contas para este endpoint).
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

// ── Resumo clicável ──────────────────────────────────────────────────────────
.pv-summary {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
  margin-bottom: $space-4;
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

// ── Filtros (1 fileira) ─────────────────────────────────────────────────────
.pv-filters {
  display: flex;
  flex-wrap: wrap;
  gap: $space-3;
  margin-bottom: $space-4;

  &__q {
    flex: 1 1 260px;
    min-width: 220px;
  }

  &__account,
  &__health,
  &__sort {
    flex: 0 1 180px;
    min-width: 150px;
  }
}

// ── Tabela ───────────────────────────────────────────────────────────────────
:deep(.sb-table) {
  td,
  th {
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

.pv-title {
  display: block;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: $text-small-size;
  font-weight: $font-medium;
  color: $text-primary;
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
