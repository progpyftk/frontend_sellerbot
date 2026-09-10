<template>
  <!--
    Tabela do advisor (PROMO-IA-15): responde primeiro a anúncio, situação,
    sugestão, margem/lucro e última ação. No mobile vira cartão (rótulo + valor),
    mantendo o <table> semântico para leitores de tela.
  -->
  <div class="av-wrap" :class="{ 'av-fit': fit }">
    <SbTable :scroll-x="true">
    <thead>
      <tr>
        <th class="av-expand" scope="col" aria-label="Detalhe"></th>
        <th
          v-for="col in columns" :key="col.key" scope="col"
          :class="[colClass(col), { 'av-sticky': col.sticky, 'av-sticky--2': col.stickySecond, 'av-hide-mobile': col.hideMobile }]"
          :style="cellStyle(col)" :aria-sort="ariaSort(col)"
        >
          <button
            v-if="col.sortable"
            type="button" class="av-th-btn"
            :aria-label="`Ordenar por ${col.label}`"
            @click="$emit('sort', col.sortKey)"
          >
            {{ col.label }}
            <q-icon :name="sortIcon(col)" size="14px" :class="{ 'av-th-btn__icon--on': sortIndicator(col) }" aria-hidden="true" />
          </button>
          <template v-else>{{ col.label }}</template>
        </th>
      </tr>
    </thead>

    <!-- Carregando: skeleton de linhas (estado de primeira classe) -->
    <tbody v-if="loading && !rows.length">
      <tr v-for="n in 6" :key="`sk-${n}`" class="av-skeleton-row" aria-hidden="true">
        <td class="av-expand"></td>
        <td v-for="col in columns" :key="`sk-${col.key}`" :class="[colClass(col), { 'av-sticky': col.sticky, 'av-sticky--2': col.stickySecond, 'av-hide-mobile': col.hideMobile }]" :style="cellStyle(col)">
          <span class="av-skeleton" :style="{ width: skeletonWidth(col) }" />
        </td>
      </tr>
    </tbody>

    <tbody v-else>
      <tr v-for="row in rows" :key="`${row.account_id}-${row.item_id}`" :class="{ 'av-row--alert': row.below_floor }">
        <td class="av-expand">
          <q-btn
            flat dense round size="sm" icon="open_in_full" color="grey-9" class="av-expand__btn"
            :aria-label="`Abrir detalhe de ${row.title}`" @click="$emit('open-detail', row)"
          />
        </td>

        <td v-for="col in columns" :key="col.key" :class="[colClass(col), { 'av-sticky': col.sticky, 'av-sticky--2': col.stickySecond, 'av-hide-mobile': col.hideMobile }]" :style="cellStyle(col)" :data-label="col.label">
          <!-- Anúncio -->
          <template v-if="col.key === 'title'">
            <a class="av-title" :href="row.permalink" target="_blank" rel="noopener" :title="row.title">{{ row.title }}</a>
            <span class="av-sub">
              {{ row.item_id }}<template v-if="row.sku"> · {{ row.sku }}</template> · {{ row.account_nickname }}
              <template v-if="row.status && row.status !== 'active'"> · {{ statusLabel(row.status) }}</template>
            </span>
          </template>

          <!-- Situação (estado honesto + motivo) -->
          <template v-else-if="col.key === 'situation'">
            <SbBadge
              :variant="situationOf(row).variant" :icon="situationOf(row).icon"
              :title="situationOf(row).reason" class="av-badge"
            >
              {{ situationOf(row).label }}
            </SbBadge>
          </template>

          <!-- Sugestão da régua (o que o assistente faria) -->
          <template v-else-if="col.key === 'suggestion'">
            <SbBadge
              :variant="suggestionOf(row).variant" :icon="suggestionOf(row).icon"
              :title="suggestionOf(row).detail" class="av-badge"
            >
              {{ suggestionOf(row).label }}
            </SbBadge>
          </template>

          <!-- Saúde -->
          <template v-else-if="col.key === 'health'">
            <SbBadge
              v-if="row.health && row.health !== 'alto'" :variant="healthMeta(row.health).variant" :icon="healthMeta(row.health).icon"
              :title="healthTitle(row)"
            >
              {{ healthMeta(row.health).label }}
            </SbBadge>
            <span v-else-if="row.health" class="av-muted" :title="healthTitle(row)">Alto</span>
            <template v-else>—</template>
          </template>

          <template v-else-if="col.key === 'sales_30d'">{{ row.sales_30d ?? '—' }}</template>
          <template v-else-if="col.key === 'price'">{{ brl(row.price) }}</template>

          <!-- Promo ativa + origem -->
          <template v-else-if="col.key === 'promo'">
            <template v-if="row.active_promo">
              <span class="av-promo">{{ promoLabel(row.active_promo) }}</span>
              <SbBadge
                :variant="row.origem === 'assistente' ? 'indigo' : 'slate'"
                :icon="row.origem === 'assistente' ? 'smart_toy' : 'storefront'"
                :title="origemTitle(row)" class="av-badge"
              >
                {{ row.origem === 'assistente' ? 'Assistente' : 'ML' }}
              </SbBadge>
            </template>
            <span v-else class="av-muted">Sem promoção</span>
          </template>

          <template v-else-if="col.key === 'discount_pct'">{{ pct(row.discount_pct) }}</template>
          <template v-else-if="col.key === 'buyer_price'">{{ brl(row.buyer_price) }}</template>
          <template v-else-if="col.key === 'cmv_unit'">{{ brl(row.cmv_unit) }}</template>

          <!-- Margem: cor + ícone + motivo (nunca só cor) -->
          <template v-else-if="col.key === 'margin_pct'">
            <span class="av-num" :class="{ 'av-num--alert': marginBreached(row) }" :title="marginTitle(row)">
              <q-icon v-if="marginBreached(row)" name="block" size="13px" aria-hidden="true" />
              {{ pct(row.margin_pct) }}
            </span>
          </template>

          <template v-else-if="col.key === 'profit_unit'">
            <span class="av-num" :class="{ 'av-num--alert': profitBreached(row) }" :title="marginTitle(row)">
              <q-icon v-if="profitBreached(row)" name="block" size="13px" aria-hidden="true" />
              {{ brl(row.profit_unit) }}
            </span>
          </template>

          <!-- Última ação registrada (histórico, não recomendação) -->
          <template v-else-if="col.key === 'agent_last'">
            <template v-if="row.agent_last">
              <span class="av-agent">
                {{ dateShort(row.agent_last.created_at) }}
                <SbBadge :variant="acaoMeta(row.agent_last.acao).variant" :title="agentTitle(row)">
                  {{ acaoMeta(row.agent_last.acao).label }}
                </SbBadge>
              </span>
            </template>
            <span v-else class="av-muted" title="Nenhuma ação do assistente registrada para este anúncio.">—</span>
          </template>

          <template v-else-if="col.key === 'promo_dates'">{{ promoDates(row.active_promo) }}</template>
        </td>
      </tr>
    </tbody>
    </SbTable>

    <p v-if="!fit" class="av-scroll-hint" role="note">
      <q-icon name="swipe" size="13px" aria-hidden="true" />
      Arraste a barra abaixo para ver as outras colunas
    </p>
  </div>
</template>

<script setup>
import SbTable from 'src/components/common/SbTable.vue';
import SbBadge from 'src/components/common/SbBadge.vue';
import { HEALTH_META, brl, pct, situationOf, suggestionOf } from 'src/utils/advisorDecision';

const props = defineProps({
  rows: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] },
  sort: { type: String, default: '-sales' },
  loading: { type: Boolean, default: false },
  // `fit` = tabela de largura fixa que cabe na tela (preset enxuto).
  // Sem `fit`, a tabela respeita uma largura mínima por coluna e rola na horizontal.
  fit: { type: Boolean, default: false },
});

defineEmits(['sort', 'open-detail']);

// Rótulo curto na célula; o texto completo vai no tooltip (agentTitle).
const ACAO_META = {
  aprofundar: { label: 'Aprofundou', variant: 'amber' },
  reduzir: { label: 'Reduziu', variant: 'sky' },
  manter: { label: 'Não mexeu', variant: 'slate' },
  rebase: { label: 'Rebase', variant: 'indigo' },
  remover: { label: 'Removeu', variant: 'red' },
  sem_oferta: { label: 'Sem oferta', variant: 'slate' },
};

const STATUS_LABELS = {
  active: 'Ativo',
  paused: 'Pausado',
  closed: 'Encerrado',
  under_review: 'Em revisão',
};

const PROMO_LABELS = {
  PRICE_DISCOUNT: 'Oferta do dia',
  DEAL: 'Oferta do dia (DEAL)',
  SMART: 'Oferta inteligente (SMART)',
  LIGHTNING: 'Oferta relâmpago',
  SELLER_CAMPAIGN: 'Campanha da loja',
  SELLER_COUPON_CAMPAIGN: 'Cupom da loja',
};

function colClass(col) {
  return col.numeric ? 'num' : '';
}

// No modo `fit`, cada coluna leva sua fatia (tabela fixa, sem rolagem).
// Fora dele, a coluna ganha um piso em px para o conteúdo respirar (com rolagem).
function cellStyle(col) {
  if (props.fit && col.width) return { width: col.width };
  if (!props.fit && col.minWidth) return { minWidth: `${col.minWidth}px` };
  return undefined;
}

function ariaSort(col) {
  if (!col.sortable) return undefined;
  if (props.sort === `-${col.sortKey}`) return 'descending';
  if (props.sort === col.sortKey) return 'ascending';
  return 'none';
}

function sortIndicator(col) {
  return props.sort === `-${col.sortKey}` || props.sort === col.sortKey;
}

function sortIcon(col) {
  if (props.sort === `-${col.sortKey}`) return 'arrow_downward';
  if (props.sort === col.sortKey) return 'arrow_upward';
  return 'unfold_more';
}

function skeletonWidth(col) {
  if (col.key === 'title') return '70%';
  return '48%';
}

function healthMeta(health) {
  return HEALTH_META[health] || { label: health || '—', variant: 'slate', icon: '' };
}

function healthTitle(row) {
  const info = row.health_info || {};
  const parts = [];
  if (info.units_per_week != null) parts.push(`${info.units_per_week} un./semana`);
  if (info.parado_sob_promocao) parts.push('parado sob promoção');
  return parts.join(' · ') || undefined;
}

// Só o número que realmente furou o piso fica vermelho: pintar margem E lucro
// de vermelho confunde qual critério barrou a escrita.
function marginBreached(row) {
  return row.below_floor && row.margin_pct != null && row.margin_pct < 30;
}

function profitBreached(row) {
  return row.below_floor && row.profit_unit != null && row.profit_unit < 12;
}

function marginTitle(row) {
  if (row.below_floor) return situationOf(row).reason;
  if (row.margin_pct != null) return undefined;
  return situationOf(row).reason;
}

function origemTitle(row) {
  return row.origem === 'assistente'
    ? 'Há registro de ação do assistente neste tipo de promoção (indício de associação, não prova de autoria).'
    : 'Promoção sem registro de ação do assistente neste tipo — foi ativada pelo Mercado Livre ou manualmente.';
}

const ACAO_FULL = {
  aprofundar: 'aprofunda o desconto',
  reduzir: 'reduz o desconto',
  manter: 'mantém o preço',
  rebase: 'rebasa o preço (precificador)',
  remover: 'remove a promoção',
  sem_oferta: 'deixa sem oferta no ML',
};

function agentTitle(row) {
  const acao = row.agent_last?.acao;
  if (!acao) return undefined;
  return `Última ação registrada do assistente: ${ACAO_FULL[acao] || acao}. É histórico, não a recomendação de hoje.`;
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

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

function acaoMeta(acao) {
  return ACAO_META[acao] || { label: acao || '—', variant: 'slate' };
}
</script>

<style lang="scss" scoped>
@import 'src/css/tokens';

/* Modo enxuto: a tabela cabe na tela — largura fixa, colunas espremidas e texto
   com reticencias (valor completo no title/aria-label). */
.av-wrap.av-fit :deep(.sb-table) {
  table-layout: fixed;
  width: 100%;

  th, td { overflow: hidden; text-overflow: ellipsis; }
  thead th { padding: 10px 8px; }
  tbody td { padding: 10px 8px; }
}

/* Preset largo: rola na horizontal com barra sempre visivel (macOS esconde). */
:deep(.sb-table-wrap) {
  scrollbar-width: thin;
  scrollbar-color: #94a3b8 #f1f5f9;

  &::-webkit-scrollbar { height: 10px; }
  &::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 8px; }
  &::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 8px; }
  &::-webkit-scrollbar-thumb:hover { background: #64748b; }
}

:deep(.sb-table) {
  th, td { white-space: nowrap; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
}

.av-expand { width: 40px; text-align: center; padding-right: 0 !important; }
.av-expand__btn { color: $text-primary; }

.av-th-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-transform: inherit;
  letter-spacing: inherit;

  &:focus-visible { outline: 2px solid $primary; outline-offset: 2px; border-radius: 4px; }
  &__icon--on { color: $primary; }
}

.av-title {
  display: block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: $text-small-size;
  font-weight: $font-medium;
  color: $primary;
  text-decoration: none;

  &:hover { text-decoration: underline; }
}

.av-sub {
  display: block;
  font-size: $text-xs-size;
  color: $text-muted;
}

.av-badge { margin-right: 4px; }
.av-promo { font-size: $text-small-size; color: $text-primary; margin-right: 4px; }
.av-muted { color: $text-muted; font-size: $text-xs-size; }
.av-agent { display: inline-flex; align-items: center; gap: 6px; font-size: $text-xs-size; color: $text-muted; }

.av-num {
  display: inline-flex;
  align-items: center;
  gap: 4px;

  &--alert { color: $negative; font-weight: $font-semibold; }
}

.av-row--alert { background: rgba(220, 38, 38, 0.04); }

.av-skeleton {
  display: inline-block;
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, #eef2f7 25%, #e2e8f0 37%, #eef2f7 63%);
  background-size: 400% 100%;
  animation: av-shimmer 1.4s ease infinite;
}

@keyframes av-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}

/* Colunas de contexto fixas ao rolar horizontalmente (desktop) */
@media (min-width: 769px) {
  .av-sticky {
    position: sticky;
    left: 0;
    z-index: 2;
    background: $surface;
    box-shadow: 1px 0 0 $border;
  }
  .av-sticky--2 { left: 40px; }
  :deep(thead) .av-sticky { background: #f8fafc; z-index: 3; }
  :deep(tbody) tr:hover .av-sticky { background: #f8fafc; }
}

/* Mobile: cada anúncio vira um cartão com rótulo + valor */
@media (max-width: 768px) {
  :deep(.sb-table) {
    display: block;
    min-width: 0;

    thead { display: none; }
    tbody, tr, td { display: block; width: 100%; }
  }

  :deep(.sb-table tbody tr) {
    border-bottom: 8px solid $background;
    padding: $space-2 0;
  }

  /* Cartão empilhado: rótulo em cima, valor embaixo. Evita estouro horizontal
     (flex não encolhe abaixo do conteúdo) e mantém a leitura rótulo → valor. */
  :deep(.sb-table tbody td) {
    display: block;
    padding: 4px $space-3;
    border-bottom: none;
    white-space: normal;
    text-align: left;

    &::before {
      content: attr(data-label);
      display: block;
      font-size: 10px;
      font-weight: $font-semibold;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: $text-muted;
    }

    &.num { text-align: left; }
    &.av-hide-mobile { display: none; }
    &.av-expand { display: none; }
  }

  .av-title { max-width: none; }
}

@media (min-width: 769px) {
  .av-wrap.av-fit :deep(.av-title) { max-width: none; }
}
</style>
