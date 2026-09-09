<template>
  <!--
    Insights do assistente (PROMO-IA-15): área secundária, recolhida por padrão.
    Recebe o payload de `GET /mercadolivre/promotions-advisor/` (IA-2) já pronto —
    nada é recalculado aqui além de formatação.
  -->
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
        <SbEmptyState v-if="!rows.by_acao?.length" title="Sem ações na janela" />
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
            <tr v-for="row in rows.by_acao" :key="row.acao">
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
        <SbEmptyState v-if="!rows.by_health?.length" title="Sem recomendações na janela" />
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
            <tr v-for="row in rows.by_health" :key="row.health">
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
          v-if="!rows.melhores?.length && !rows.piores?.length"
          title="Ainda sem efeito medido"
          message="Precisa de ações executadas e de snapshots diários depois delas."
        />
        <div v-else class="pa-extremes">
          <div>
            <p class="pa-extremes__l">Altas</p>
            <ul class="pa-extremes__list">
              <li v-for="row in rows.melhores" :key="`up-${row.item_id}`">
                <span class="pv-title-text">{{ row.title }}</span>
                <span :class="deltaClass(row.delta_units_pct)">{{ signedPct(row.delta_units_pct) }}</span>
              </li>
              <li v-if="!rows.melhores?.length" class="pa-extremes__empty">—</li>
            </ul>
          </div>
          <div>
            <p class="pa-extremes__l">Baixas</p>
            <ul class="pa-extremes__list">
              <li v-for="row in rows.piores" :key="`down-${row.item_id}`">
                <span class="pv-title-text">{{ row.title }}</span>
                <span :class="deltaClass(row.delta_units_pct)">{{ signedPct(row.delta_units_pct) }}</span>
              </li>
              <li v-if="!rows.piores?.length" class="pa-extremes__empty">—</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  </q-expansion-item>
</template>

<script setup>
import SbTable from 'src/components/common/SbTable.vue';
import SbBadge from 'src/components/common/SbBadge.vue';
import SbEmptyState from 'src/components/common/SbEmptyState.vue';
import { HEALTH_META, brl, pct } from 'src/utils/advisorDecision';

const props = defineProps({
  // `payload.insights` do endpoint IA-2 (by_acao, by_health, melhores, piores).
  rows: { type: Object, default: () => ({}) },
});

const ACAO_META = {
  aprofundar: { label: 'Aprofundar', variant: 'amber' },
  reduzir: { label: 'Reduzir desconto', variant: 'sky' },
  manter: { label: 'Não mexer', variant: 'slate' },
  rebase: { label: 'Rebase de preço', variant: 'indigo' },
  remover: { label: 'Remover', variant: 'red' },
  sem_oferta: { label: 'Sem oferta ML', variant: 'slate' },
};

function acaoMeta(acao) {
  return ACAO_META[acao] || { label: acao || '—', variant: 'slate' };
}

function healthMeta(health) {
  return HEALTH_META[health] || { label: health || '—', variant: 'slate' };
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
</script>

<style lang="scss" scoped>
@import 'src/css/tokens';

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

.pv-title-text {
  font-size: $text-small-size;
  font-weight: $font-medium;
  color: $text-primary;
}

.pa-delta--up { color: $positive; font-weight: $font-semibold; }
.pa-delta--down { color: $negative; font-weight: $font-semibold; }
.pa-delta--none { color: $text-disabled; }
</style>
