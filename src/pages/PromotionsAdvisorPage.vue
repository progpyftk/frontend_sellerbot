<template>
  <q-page class="promo-advisor q-pa-lg">
    <SbPageHeader
      eyebrow="Mercado Livre"
      title="Assistente de promoções"
      subtitle="O que o assistente recomendou, o que foi executado e o efeito nas vendas — o log de decisões cruzado com o retrato diário de cada anúncio."
      icon="auto_graph"
    >
      <template #actions>
        <q-btn-toggle
          v-model="days"
          :options="[
            { label: '7 dias', value: 7 },
            { label: '30 dias', value: 30 },
            { label: '90 dias', value: 90 },
          ]"
          no-caps unelevated toggle-color="primary" color="grey-2" text-color="grey-8"
          @update:model-value="load"
        />
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
      <SbKpiGrid :columns="5" :gap="12">
        <SbKpiCard
          label="Anúncios acompanhados"
          :value="summary.items_tracked ?? 0"
          :sub="`janela de ${summary.window_days ?? days} dias`"
          variant="slate"
        />
        <SbKpiCard
          label="Recomendações"
          :value="summary.recommendations ?? 0"
          sub="leituras do assistente"
          variant="sky"
        />
        <SbKpiCard
          label="Ações executadas"
          :value="summary.actions ?? 0"
          sub="escritas no Mercado Livre"
          variant="teal"
        />
        <SbKpiCard
          label="Pendentes"
          :value="summary.pending ?? 0"
          sub="recomendadas, ainda não feitas"
          variant="amber"
        />
        <SbKpiCard
          label="Margem média executada"
          :value="pct(summary.avg_executed_margin_pct)"
          :sub="summary.avg_target_margin_pct != null ? `alvo médio ${pct(summary.avg_target_margin_pct)}` : 'sem ações na janela'"
          variant="indigo"
        />
      </SbKpiGrid>

      <q-tabs
        v-model="tab"
        class="pa-tabs"
        active-color="primary"
        indicator-color="primary"
        align="left"
        no-caps
        narrow-indicator
      >
        <q-tab name="today" label="Hoje" />
        <q-tab name="active" label="Ativas" />
        <q-tab name="history" label="Histórico" />
        <q-tab name="insights" label="Insights" />
      </q-tabs>

      <q-tab-panels v-model="tab" animated class="pa-panels">
        <!-- Hoje (último lote de recomendações) -->
        <q-tab-panel name="today" class="q-pa-none">
          <p class="pa-note">
            Última recomendação de cada anúncio — gerada em
            <strong>{{ generatedAt || '—' }}</strong>. A automação diária ainda não existe
            (PROMO-IA-3); enquanto isso, o lote é o da última execução do assistente.
          </p>
          <SbEmptyState
            v-if="!todayRows.length"
            title="Nenhuma recomendação na janela"
            message="Rode o assistente de promoções no chat para gerar o primeiro lote."
          />
          <SbTable v-else>
            <thead>
              <tr>
                <th>Anúncio</th>
                <th>Saúde</th>
                <th>Ação</th>
                <th class="num">Margem atual</th>
                <th class="num">Alvo</th>
                <th class="num">Preço proposto</th>
                <th class="num">Margem proposta</th>
                <th>Frete</th>
                <th>Razão</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in todayRows" :key="`${row.item_id}-${row.created_at}`">
                <td>
                  <span class="pa-title">{{ row.title }}</span>
                  <span class="pa-sub">{{ row.item_id }}</span>
                </td>
                <td><SbBadge :variant="healthMeta(row.health).variant">{{ healthMeta(row.health).label }}</SbBadge></td>
                <td><SbBadge :variant="acaoMeta(row.acao).variant">{{ acaoMeta(row.acao).label }}</SbBadge></td>
                <td class="num">{{ pct(row.current_margin_pct) }}</td>
                <td class="num">{{ pct(row.target_margin_pct) }}</td>
                <td class="num">{{ brl(row.proposed_price) }}</td>
                <td class="num">{{ pct(row.proposed_margin_pct) }}</td>
                <td>
                  <SbBadge v-if="row.shipping?.needs_manual_review" variant="red">SEM CERTEZA</SbBadge>
                  <SbBadge v-else-if="row.shipping?.high" variant="amber">ALTO</SbBadge>
                  <SbBadge v-else variant="slate">{{ shippingLabel(row.shipping) }}</SbBadge>
                </td>
                <td class="pa-reason">{{ row.reason || '—' }}</td>
              </tr>
            </tbody>
          </SbTable>
        </q-tab-panel>

        <!-- Ativas (ações executadas + efeito 7d antes / 7d depois) -->
        <q-tab-panel name="active" class="q-pa-none">
          <p class="pa-note">
            Cada ação executada comparada com os {{ outcomeWindow }} dias anteriores no
            <code>ItemDailySnapshot</code>. Não é medição pareada — é o retrato simples do efeito
            enquanto o aprendizado (PROMO-IA-3) não existe.
          </p>
          <SbEmptyState
            v-if="!activeRows.length"
            title="Nenhuma ação executada na janela"
            message="As ações aparecem aqui depois que o dono aprova a escrita no chat."
          />
          <SbTable v-else>
            <thead>
              <tr>
                <th>Anúncio</th>
                <th>Ação</th>
                <th>Executado em</th>
                <th class="num">Preço</th>
                <th class="num">Margem</th>
                <th class="num">Un. antes</th>
                <th class="num">Un. depois</th>
                <th class="num">Δ un.</th>
                <th class="num">Lucro antes</th>
                <th class="num">Lucro depois</th>
                <th class="num">Δ lucro</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in activeRows" :key="`${row.item_id}-${row.created_at}`">
                <td>
                  <span class="pa-title">{{ row.title }}</span>
                  <span class="pa-sub">{{ row.item_id }}</span>
                </td>
                <td><SbBadge :variant="acaoMeta(row.acao).variant">{{ acaoMeta(row.acao).label }}</SbBadge></td>
                <td>{{ dateTime(row.created_at) }}</td>
                <td class="num">{{ brl(row.proposed_price) }}</td>
                <td class="num">{{ pct(row.proposed_margin_pct) }}</td>
                <td class="num">{{ row.before_units ?? '—' }}</td>
                <td class="num">{{ row.after_units ?? '—' }}</td>
                <td class="num">
                  <span :class="deltaClass(row.delta_units_pct)">{{ signedPct(row.delta_units_pct) }}</span>
                  <span v-if="row.outcome_complete === false" class="pa-flag" :title="`só ${row.after_days_observed} de ${outcomeWindow} dias observados`">parcial</span>
                </td>
                <td class="num">{{ brl(row.before_profit) }}</td>
                <td class="num">{{ brl(row.after_profit) }}</td>
                <td class="num">
                  <span :class="deltaClass(row.delta_profit)">{{ signedBrl(row.delta_profit) }}</span>
                </td>
              </tr>
            </tbody>
          </SbTable>
        </q-tab-panel>

        <!-- Histórico (timeline de decisões) -->
        <q-tab-panel name="history" class="q-pa-none">
          <SbEmptyState
            v-if="!historyRows.length"
            title="Sem eventos na janela"
            message="Ajuste a janela de dias para ver decisões mais antigas."
          />
          <SbTable v-else>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Evento</th>
                <th>Anúncio</th>
                <th>Saúde</th>
                <th>Ação</th>
                <th class="num">Margem</th>
                <th class="num">Lucro</th>
                <th>Razão</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in historyRows" :key="`${row.item_id}-${row.created_at}-${idx}`">
                <td>{{ dateTime(row.created_at) }}</td>
                <td><SbBadge :variant="row.event_type === 'action' ? 'teal' : 'sky'">{{ eventLabel(row.event_type) }}</SbBadge></td>
                <td>
                  <span class="pa-title">{{ row.title }}</span>
                  <span class="pa-sub">{{ row.item_id }}</span>
                </td>
                <td><SbBadge :variant="healthMeta(row.health).variant">{{ healthMeta(row.health).label }}</SbBadge></td>
                <td><SbBadge :variant="acaoMeta(row.acao).variant">{{ acaoMeta(row.acao).label }}</SbBadge></td>
                <td class="num">{{ pct(row.current_margin_pct) }}</td>
                <td class="num">{{ brl(row.current_profit) }}</td>
                <td class="pa-reason">{{ row.reason || '—' }}</td>
              </tr>
            </tbody>
          </SbTable>
        </q-tab-panel>

        <!-- Insights (agregados por ação e por saúde) -->
        <q-tab-panel name="insights" class="q-pa-none">
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
                      <span class="pa-title">{{ row.title }}</span>
                      <span :class="deltaClass(row.delta_units_pct)">{{ signedPct(row.delta_units_pct) }}</span>
                    </li>
                    <li v-if="!insightRows.melhores?.length" class="pa-extremes__empty">—</li>
                  </ul>
                </div>
                <div>
                  <p class="pa-extremes__l">Baixas</p>
                  <ul class="pa-extremes__list">
                    <li v-for="row in insightRows.piores" :key="`down-${row.item_id}`">
                      <span class="pa-title">{{ row.title }}</span>
                      <span :class="deltaClass(row.delta_units_pct)">{{ signedPct(row.delta_units_pct) }}</span>
                    </li>
                    <li v-if="!insightRows.piores?.length" class="pa-extremes__empty">—</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </template>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';

import SbPageHeader from 'src/components/common/SbPageHeader.vue';
import SbKpiGrid from 'src/components/common/SbKpiGrid.vue';
import SbKpiCard from 'src/components/common/SbKpiCard.vue';
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

const loading = ref(false);
const error = ref('');
const tab = ref('today');
const days = ref(30);
const data = ref({
  summary: {},
  today: [],
  active: [],
  history: [],
  insights: {},
});

const summary = computed(() => data.value.summary || {});
const todayRows = computed(() => data.value.today || []);
const activeRows = computed(() => data.value.active || []);
const historyRows = computed(() => data.value.history || []);
const insightRows = computed(() => data.value.insights || {});
const outcomeWindow = computed(() => data.value.outcome_window_days || 7);

const generatedAt = computed(() => {
  const stamps = todayRows.value.map((row) => row.created_at).filter(Boolean).sort();
  return stamps.length ? dateTime(stamps[stamps.length - 1]) : '';
});

function acaoMeta(acao) {
  return ACAO_META[acao] || { label: acao || '—', variant: 'slate' };
}

function healthMeta(health) {
  return HEALTH_META[health] || { label: health || '—', variant: 'slate' };
}

function eventLabel(eventType) {
  return eventType === 'action' ? 'Ação' : eventType === 'snapshot' ? 'Baseline' : 'Recomendação';
}

function shippingLabel(shipping) {
  if (!shipping?.source) return '—';
  return { item_own: 'do anúncio', flex_default: 'da conta', baseline: 'estimado' }[shipping.source]
    || shipping.source;
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

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data: payload } = await MercadoLivreService.getPromotionsAdvisor({
      days: days.value,
      limit: 100,
    });
    data.value = payload || {};
  } catch (err) {
    error.value = err?.response?.data?.detail || err?.message || 'Erro inesperado.';
    data.value = { summary: {}, today: [], active: [], history: [], insights: {} };
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style lang="scss" scoped>
@import 'src/css/tokens';

.promo-advisor {
  background: $background;
}

.pa-tabs {
  margin-top: $space-6;
  border-bottom: 1px solid $border;
}

.pa-panels {
  background: transparent;
}

.pa-note {
  margin: $space-4 0 $space-3;
  font-size: $text-small-size;
  color: $text-muted;
  max-width: 900px;

  code {
    font-family: $font-mono;
    font-size: $text-xs-size;
  }
}

// SbTable já entrega borda, raio e rolagem horizontal — aqui só o que é
// específico desta página: colunas numéricas, título em duas linhas e os
// deltas coloridos.
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
}

.pa-title {
  display: block;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: $text-small-size;
  font-weight: $font-medium;
  color: $text-primary;
}

.pa-sub {
  display: block;
  font-size: $text-xs-size;
  color: $text-disabled;
}

.pa-reason {
  white-space: normal;
  max-width: 320px;
  font-size: $text-xs-size;
  color: $text-muted;
}

.pa-flag {
  margin-left: $space-1;
  font-size: $text-xs-size;
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

.pa-insights {
  display: grid;
  gap: $space-6;
  margin-top: $space-4;
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
</style>
